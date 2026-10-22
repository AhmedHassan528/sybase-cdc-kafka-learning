package com.phoenix.cdc.sybase.connect;

import com.phoenix.cdc.sybase.cdc.CommittedTransaction;
import com.phoenix.cdc.sybase.cdc.Oqid;
import com.phoenix.cdc.sybase.cdc.TransactionBuffer;
import com.phoenix.cdc.sybase.ltl.LtlCommand;
import com.phoenix.cdc.sybase.ltl.LtlListener;
import com.phoenix.cdc.sybase.ltl.LtlServer;

import java.util.List;

/**
 * Given with increment 4 (you do not write it). For every committed row change it prints what your
 * {@link ChangeEventMapper} would send to Kafka: the topic, the key and the value.
 *
 * <pre>
 * [inc4] topic=sybase.phoenix_test.payment key={payment_id=7} value={op=c, before=null, after={...}, source={...}, ts_ms=...}
 * </pre>
 *
 * It is in the same package as the mapper because the mapper is package-private, as in the finished connector.
 */
public final class Increment4Main {

    public static void main(String[] args) throws Exception {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 11752;
        String user = args.length > 1 ? args[1] : "rs_user";
        String password = args.length > 2 ? args[2] : "rs_password";
        TransactionBuffer buffer = new TransactionBuffer(100_000);
        ChangeEventMapper mapper = new ChangeEventMapper("MYSYBASE", "phoenix_test", "sybase");

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
                return Oqid.locator(buffer.lastCommitOqid());
            }

            @Override
            public void onCommands(List<LtlCommand> commands) {
                for (LtlCommand c : commands) {
                    buffer.accept(c).ifPresent(tx -> print(mapper, tx));
                }
            }

            @Override
            public void onDisconnect(String server, String database, Exception cause) {
                buffer.clear();
            }
        };

        try (LtlServer server = new LtlServer("0.0.0.0", port, listener, false, null)) {
            server.start();
            System.out.printf("[inc4] listening on port %d%n", server.localPort());
            Thread.sleep(Long.MAX_VALUE);
        }
    }

    private static void print(ChangeEventMapper mapper, CommittedTransaction tx) {
        int seq = 0;
        for (LtlCommand c : tx.changes()) {
            System.out.printf("[inc4] topic=%s key=%s value=%s%n", mapper.topic(c), mapper.key(c), mapper.value(c, tx, seq++));
        }
    }
}
