package com.phoenix.cdc.lab;

import com.phoenix.cdc.sybase.cdc.AckTracker;
import com.phoenix.cdc.sybase.cdc.CommittedTransaction;
import com.phoenix.cdc.sybase.cdc.Oqid;
import com.phoenix.cdc.sybase.cdc.TransactionBuffer;
import com.phoenix.cdc.sybase.ltl.LtlCommand;
import com.phoenix.cdc.sybase.ltl.LtlListener;
import com.phoenix.cdc.sybase.ltl.LtlServer;

import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Given with increment 5 (you do not write it). It is a stand-in for Kafka that makes the acknowledgement order
 * visible: every committed transaction is registered with your {@link AckTracker}, and a fake "Kafka" confirms its
 * records after a delay. Transactions that contain a row whose account number ends in "-1" are confirmed LATE (4 s);
 * all others after 0.3 s. So a later transaction is confirmed before an earlier one, and your watermark must wait:
 *
 * <pre>
 * [inc5] committed commit_oqid=&lt;hex&gt; rows=[LIVE123-1]
 * [inc5] committed commit_oqid=&lt;hex&gt; rows=[LIVE123-2]
 * [inc5] confirmed commit_oqid=&lt;hex of the -2 transaction&gt; watermark=&lt;older position, NOT the -2 one&gt;
 * [inc5] confirmed commit_oqid=&lt;hex of the -1 transaction&gt; watermark=&lt;hex of the -2 transaction&gt;
 * </pre>
 *
 * The position it returns to RepAgent's "get truncation" is your watermark.
 */
public final class Increment5Main {

    public static void main(String[] args) throws Exception {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 11752;
        String user = args.length > 1 ? args[1] : "rs_user";
        String password = args.length > 2 ? args[2] : "rs_password";
        TransactionBuffer buffer = new TransactionBuffer(100_000);
        AckTracker acks = new AckTracker(null);
        ScheduledExecutorService kafka = Executors.newScheduledThreadPool(2, r -> {
            Thread t = new Thread(r, "fake-kafka");
            t.setDaemon(true);
            return t;
        });

        LtlListener listener = new LtlListener() {
            @Override
            public boolean authenticate(String u, String p) {
                return user.equals(u) && password.equals(p);
            }

            @Override
            public int onConnectSource(String server, String database, int proposedVersion) {
                return proposedVersion;
            }

            @Override
            public String maintenanceUser(String server, String database) {
                return "cdc_maint";
            }

            @Override
            public byte[] truncationPoint(String server, String database) {
                byte[] locator = Oqid.locator(acks.acked());
                System.out.printf("[inc5] get truncation -> %s%n", Oqid.hex(acks.acked()));
                return locator;
            }

            @Override
            public void onCommands(List<LtlCommand> commands) {
                for (LtlCommand c : commands) {
                    buffer.accept(c).ifPresent(tx -> publish(tx, acks, kafka));
                }
            }

            @Override
            public void onDisconnect(String server, String database, Exception cause) {
                buffer.clear();
                acks.reset();
            }
        };

        try (LtlServer server = new LtlServer("0.0.0.0", port, listener, false, null)) {
            server.start();
            System.out.printf("[inc5] listening on port %d%n", server.localPort());
            Thread.sleep(Long.MAX_VALUE);
        }
    }

    private static void publish(CommittedTransaction tx, AckTracker acks, ScheduledExecutorService kafka) {
        StringBuilder rows = new StringBuilder();
        boolean late = false;
        for (LtlCommand c : tx.changes()) {
            String account = String.valueOf(c.after() != null ? c.after().get("account_no") : null);
            if (rows.length() > 0) rows.append(", ");
            rows.append(account);
            late |= account.endsWith("-1");
        }
        String commit = Oqid.hex(tx.commitOqid());
        System.out.printf("[inc5] committed commit_oqid=%s rows=[%s]%n", commit, rows);

        AckTracker.Pending pending = acks.register(tx.commitOqid(), tx.changes().size());
        long delayMs = late ? 4000 : 300;
        for (int i = 0; i < tx.changes().size(); i++) {
            kafka.schedule(() -> {
                acks.ack(pending);
                System.out.printf("[inc5] confirmed commit_oqid=%s watermark=%s%n", commit, Oqid.hex(acks.acked()));
            }, delayMs, TimeUnit.MILLISECONDS);
        }
    }
}
