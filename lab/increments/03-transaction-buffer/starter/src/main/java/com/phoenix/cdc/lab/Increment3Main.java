package com.phoenix.cdc.lab;

import com.phoenix.cdc.sybase.cdc.CommittedTransaction;
import com.phoenix.cdc.sybase.cdc.Oqid;
import com.phoenix.cdc.sybase.cdc.TransactionBuffer;
import com.phoenix.cdc.sybase.ltl.LtlCommand;
import com.phoenix.cdc.sybase.ltl.LtlListener;
import com.phoenix.cdc.sybase.ltl.LtlServer;

import java.util.List;

/**
 * Given with increment 3 (you do not write it). Feeds every parsed command into your {@link TransactionBuffer} and prints
 * one line for each transaction that COMMITs; rolled-back transactions print nothing:
 *
 * <pre>
 * [inc3] COMMITTED xid=... rows=2 [payment:account_no=ACC-1, payment:account_no=ACC-2]
 * </pre>
 *
 * The live check (verify-live.sh) writes one row inside a transaction that it rolls back and one in a committed
 * transaction, and expects a COMMITTED line for the second row only.
 */
public final class Increment3Main {

    public static void main(String[] args) throws Exception {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 11752;
        String user = args.length > 1 ? args[1] : "rs_user";
        String password = args.length > 2 ? args[2] : "rs_password";
        TransactionBuffer buffer = new TransactionBuffer(100_000);

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
                return Oqid.locator(buffer.lastCommitOqid());   // acknowledge what we have seen, like the probe tool
            }

            @Override
            public void onCommands(List<LtlCommand> commands) {
                for (LtlCommand c : commands) {
                    buffer.accept(c).ifPresent(tx -> print(tx));
                }
            }

            @Override
            public void onDisconnect(String server, String database, Exception cause) {
                buffer.clear();
            }
        };

        try (LtlServer server = new LtlServer("0.0.0.0", port, listener, false, null)) {
            server.start();
            System.out.printf("[inc3] listening on port %d%n", server.localPort());
            Thread.sleep(Long.MAX_VALUE);
        }
    }

    private static void print(CommittedTransaction tx) {
        StringBuilder rows = new StringBuilder();
        for (LtlCommand c : tx.changes()) {
            if (rows.length() > 0) rows.append(", ");
            Object row = c.after() != null ? c.after().get("account_no") : c.before() == null ? null : c.before().get("account_no");
            rows.append(c.table()).append(":account_no=").append(row);
        }
        System.out.printf("[inc3] COMMITTED xid=%s rows=%d [%s]%n", tx.tranId(), tx.changes().size(), rows);
    }
}
