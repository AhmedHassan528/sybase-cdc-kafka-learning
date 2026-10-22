package com.phoenix.cdc.lab;

import com.phoenix.cdc.sybase.ltl.LtlListener;
import com.phoenix.cdc.sybase.ltl.LtlServer;

import java.nio.charset.StandardCharsets;

/**
 * Given with increment 1 (you do not write it). Starts your {@link LtlServer} with a listener that prints what
 * RepAgent does, so you can watch the real ASE talk to your code:
 *
 * <pre>
 *   java -cp "..." com.phoenix.cdc.lab.Increment1Main 11752 rs_user rs_password
 * </pre>
 *
 * Every line it prints starts with "[inc1]". The live check (verify-live.sh) looks for these lines.
 */
public final class Increment1Main {

    public static void main(String[] args) throws Exception {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 11752;
        String user = args.length > 1 ? args[1] : "rs_user";
        String password = args.length > 2 ? args[2] : "rs_password";

        LtlListener listener = new LtlListener() {
            @Override
            public boolean authenticate(String u, String p) {
                boolean ok = user.equals(u) && password.equals(p);
                System.out.printf("[inc1] login user=%s accepted=%s%n", u, ok);
                return ok;
            }

            @Override
            public int onConnectSource(String server, String database, int proposedVersion) {
                System.out.printf("[inc1] connect source %s.%s LTL %d%n", server, database, proposedVersion);
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
            public void onLtl(byte[] ltl) {
                String text = new String(ltl, StandardCharsets.ISO_8859_1);
                System.out.printf("[inc1] LTL %d bytes: %s%n", ltl.length,
                    text.substring(0, Math.min(90, text.length())).replaceAll("[^\\x20-\\x7e]", "."));
            }
        };

        try (LtlServer server = new LtlServer("0.0.0.0", port, listener, false, null)) {
            server.start();
            System.out.printf("[inc1] listening on port %d%n", server.localPort());
            Thread.sleep(Long.MAX_VALUE);
        }
    }
}
