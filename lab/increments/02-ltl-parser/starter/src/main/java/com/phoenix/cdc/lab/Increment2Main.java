package com.phoenix.cdc.lab;

import com.phoenix.cdc.sybase.ltl.LtlCommand;
import com.phoenix.cdc.sybase.ltl.LtlListener;
import com.phoenix.cdc.sybase.ltl.LtlServer;

import java.util.List;

/**
 * Given with increment 2 (you do not write it). Like Increment1Main, but your parser now turns the LTL text into
 * commands, and this class prints one line per command:
 *
 * <pre>
 * [inc2] BEGIN
 * [inc2] INSERT payment after={payment_id=7, account_no=ACC-1, amount=125.5, ...}
 * [inc2] COMMIT
 * </pre>
 *
 * The live check (verify-live.sh) writes a row with a known account number and looks for it in an INSERT line.
 */
public final class Increment2Main {

    public static void main(String[] args) throws Exception {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 11752;
        String user = args.length > 1 ? args[1] : "rs_user";
        String password = args.length > 2 ? args[2] : "rs_password";

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
                return new byte[36];   // nothing stored yet
            }

            @Override
            public void onCommands(List<LtlCommand> commands) {
                for (LtlCommand c : commands) {
                    if (c.isRowChange()) {
                        System.out.printf("[inc2] %s %s before=%s after=%s%n", c.kind(), c.table(), c.before(), c.after());
                    } else {
                        System.out.printf("[inc2] %s%n", c.kind());
                    }
                }
            }
        };

        try (LtlServer server = new LtlServer("0.0.0.0", port, listener, false, null)) {
            server.start();
            System.out.printf("[inc2] listening on port %d%n", server.localPort());
            Thread.sleep(Long.MAX_VALUE);
        }
    }
}
