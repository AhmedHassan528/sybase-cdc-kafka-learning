package com.phoenix.cdc.sybase.ltl;

/**
 * What the LTL server needs from its owner (the Kafka Connect task in the finished connector, or a small
 * main class in the first increments).
 *
 * Increment 1 hands the LTL text over unparsed ({@link #onLtl}); increment 2 replaces that method with parsed
 * commands.
 */
public interface LtlListener {

    /** Check the credentials RepAgent was configured with (sp_config_rep_agent ... 'rs_user', 'rs_password'). */
    boolean authenticate(String user, String password);

    /**
     * "connect source lti server.db version": RepAgent proposes an LTL version,
     * we return the version to use (must be &lt;= the proposal). Throw to refuse.
     */
    int onConnectSource(String server, String database, int proposedVersion);

    /** Login of the maintenance user; RepAgent does not forward that user's transactions. */
    String maintenanceUser(String server, String database);

    /**
     * The 36-byte locator returned to "get truncation": the origin queue ID of the
     * last command we have stored safely. RepAgent moves the database's secondary
     * truncation point up to it. All zeros = nothing stored yet.
     */
    byte[] truncationPoint(String server, String database);

    /** One batch of LTL text exactly as RepAgent sent it (one or more "distribute" commands). */
    void onLtl(byte[] ltl) throws InterruptedException;

    /** RepAgent's connection closed (normally or with an error). */
    default void onDisconnect(String server, String database, Exception cause) {}
}
