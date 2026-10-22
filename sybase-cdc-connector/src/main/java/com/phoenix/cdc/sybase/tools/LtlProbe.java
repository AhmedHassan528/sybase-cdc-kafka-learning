package com.phoenix.cdc.sybase.tools;

import com.phoenix.cdc.sybase.cdc.Oqid;
import com.phoenix.cdc.sybase.cdc.TransactionBuffer;
import com.phoenix.cdc.sybase.ltl.LtlCommand;
import com.phoenix.cdc.sybase.ltl.LtlListener;
import com.phoenix.cdc.sybase.ltl.LtlServer;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Discovery tool: a stand-alone fake Replication Server, no Kafka involved.
 * Logs every LTL command RepAgent sends and prints committed transactions.
 * It acknowledges each commit immediately, so the ASE log keeps truncating.
 *
 * Run inside the Connect container (it has Java and the Kafka logging jars):
 *   java -cp "/opt/kafka/libs/*:/opt/connectors/sybase-cdc/*" \
 *        com.phoenix.cdc.sybase.tools.LtlProbe 11752 rs_user rs_password
 */
public final class LtlProbe {

    /** LTL 760 command tag 4 = origin_qid, e.g. ",4 0x0000...". */
    private static final Pattern OQID_TAG = Pattern.compile("(?:^|[ ,])4 0x([0-9a-fA-F]{64})");

    public static void main(String[] args) throws Exception {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 11752;
        String user = args.length > 1 ? args[1] : "rs_user";
        String password = args.length > 2 ? args[2] : "rs_password";
        TransactionBuffer buffer = new TransactionBuffer(100_000);
        byte[][] lastSeen = new byte[1][];

        LtlListener listener = new LtlListener() {
            @Override
            public boolean authenticate(String u, String p) {
                System.out.printf("[probe] login user=%s password-ok=%s%n", u, password.equals(p));
                return user.equals(u) && password.equals(p);
            }

            @Override
            public int onConnectSource(String server, String database, int proposedVersion) {
                System.out.printf("[probe] connect source %s.%s LTL %d%n", server, database, proposedVersion);
                return proposedVersion;
            }

            @Override
            public String maintenanceUser(String server, String database) {
                return "cdc_maint";
            }

            @Override
            public byte[] truncationPoint(String server, String database) {
                // Discovery only: acknowledge the highest OQID seen, whether or not we understood it.
                return Oqid.locator(lastSeen[0]);
            }

            @Override
            public void onCommands(List<LtlCommand> commands) {
                for (LtlCommand c : commands) {
                    Matcher m = OQID_TAG.matcher(c.raw());
                    while (m.find()) {
                        byte[] q = Oqid.fromHex(m.group(1));
                        if (lastSeen[0] == null || Oqid.compare(q, lastSeen[0]) > 0) lastSeen[0] = q;
                    }
                    System.out.printf("[probe] %-8s xid=%s oqid=%s %s%n", c.kind(), Oqid.hex(c.tranId()), Oqid.hex(c.oqid()),
                        c.isRowChange() ? c.table() + " before=" + c.before() + " after=" + c.after() : "");
                    buffer.accept(c).ifPresent(tx -> System.out.printf(
                        "[probe] ==> COMMITTED xid=%s rows=%d user=%s commitOqid=%s%n",
                        tx.tranId(), tx.changes().size(), tx.user(), Oqid.hex(tx.commitOqid())));
                }
            }

            @Override
            public void onDisconnect(String server, String database, Exception cause) {
                System.out.printf("[probe] disconnected %s.%s cause=%s%n", server, database, cause);
                buffer.clear();
            }
        };

        LtlServer server = new LtlServer("0.0.0.0", port, listener, true, null);
        server.start();
        Runtime.getRuntime().addShutdownHook(new Thread(server::close));
        Thread.currentThread().join();
    }
}
