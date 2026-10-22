package com.phoenix.cdc.sybase.connect;

import org.apache.kafka.common.config.AbstractConfig;
import org.apache.kafka.common.config.ConfigDef;
import org.apache.kafka.common.config.ConfigDef.Importance;
import org.apache.kafka.common.config.ConfigDef.Type;
import org.apache.kafka.common.config.types.Password;

import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

public final class SybaseCdcConfig extends AbstractConfig {

    public static final String LISTEN_HOST = "ltl.listen.host";
    public static final String LISTEN_PORT = "ltl.listen.port";
    public static final String LTL_USER = "ltl.username";
    public static final String LTL_PASSWORD = "ltl.password";
    public static final String LTL_CHARSET = "ltl.charset";
    public static final String LTL_TRACE = "ltl.trace";
    public static final String DB_SERVER = "database.server.name";
    public static final String DB_NAME = "database.name";
    public static final String MAINT_USER = "database.maintenance.user";
    public static final String TOPIC_PREFIX = "topic.prefix";
    public static final String TABLE_INCLUDE = "table.include.list";
    public static final String QUEUE_MAX_TXNS = "queue.max.transactions";
    public static final String POLL_MAX_RECORDS = "poll.max.records";
    public static final String LARGE_TXN_ROWS = "large.transaction.warn.rows";

    public static final ConfigDef CONFIG_DEF = new ConfigDef()
        .define(LISTEN_HOST, Type.STRING, "0.0.0.0", Importance.LOW,
            "Interface the LTL listener binds to.")
        .define(LISTEN_PORT, Type.INT, 11752, ConfigDef.Range.between(1, 65535), Importance.HIGH,
            "Port RepAgent connects to (the CDC_RS entry in the ASE interfaces file).")
        .define(LTL_USER, Type.STRING, Importance.HIGH,
            "Login RepAgent uses (sp_config_rep_agent db, 'enable', 'CDC_RS', <user>, <password>).")
        .define(LTL_PASSWORD, Type.PASSWORD, Importance.HIGH,
            "Password RepAgent uses. Requires sp_config_rep_agent db, 'net password encryption', 'false'.")
        .define(LTL_CHARSET, Type.STRING, "", Importance.LOW,
            "Java charset for char/varchar values. Empty = take it from the RepAgent login (iso_1, utf8, cp1256...).")
        .define(LTL_TRACE, Type.BOOLEAN, false, Importance.LOW,
            "Log every LTL message (very verbose, for troubleshooting only).")
        .define(DB_SERVER, Type.STRING, Importance.HIGH,
            "ASE server name as RepAgent reports it (select @@servername). Used in the offset partition and events.")
        .define(DB_NAME, Type.STRING, Importance.HIGH,
            "Replicated database. A RepAgent for any other database is refused.")
        .define(MAINT_USER, Type.STRING, "cdc_maint", Importance.LOW,
            "Returned to 'get maintenance user'. RepAgent does not forward transactions of this login.")
        .define(TOPIC_PREFIX, Type.STRING, "sybase", Importance.HIGH,
            "Topic name = <prefix>.<database>.<table>.")
        .define(TABLE_INCLUDE, Type.LIST, "", Importance.MEDIUM,
            "Tables to publish (comma separated, case-insensitive). Empty = every table marked with sp_setreptable.")
        .define(QUEUE_MAX_TXNS, Type.INT, 1000, ConfigDef.Range.atLeast(1), Importance.LOW,
            "Committed transactions buffered between RepAgent and Kafka. When full, RepAgent waits (back-pressure).")
        .define(POLL_MAX_RECORDS, Type.INT, 10000, ConfigDef.Range.atLeast(1), Importance.LOW,
            "Upper bound of records returned by one poll().")
        .define(LARGE_TXN_ROWS, Type.INT, 100000, ConfigDef.Range.atLeast(1), Importance.LOW,
            "Log a warning when one open transaction holds this many rows in memory.");

    public SybaseCdcConfig(Map<?, ?> props) {
        super(CONFIG_DEF, props);
    }

    public String listenHost() { return getString(LISTEN_HOST); }
    public int listenPort() { return getInt(LISTEN_PORT); }
    public String ltlUser() { return getString(LTL_USER); }
    public Password ltlPassword() { return getPassword(LTL_PASSWORD); }
    public String charset() { return getString(LTL_CHARSET); }
    public boolean trace() { return getBoolean(LTL_TRACE); }
    public String serverName() { return getString(DB_SERVER); }
    public String databaseName() { return getString(DB_NAME); }
    public String maintenanceUser() { return getString(MAINT_USER); }
    public String topicPrefix() { return getString(TOPIC_PREFIX); }
    public int queueMaxTransactions() { return getInt(QUEUE_MAX_TXNS); }
    public int pollMaxRecords() { return getInt(POLL_MAX_RECORDS); }
    public int largeTransactionRows() { return getInt(LARGE_TXN_ROWS); }

    public Set<String> tableIncludes() {
        return getList(TABLE_INCLUDE).stream().map(String::trim).filter(s -> !s.isEmpty())
            .map(String::toLowerCase).collect(Collectors.toSet());
    }

    /**
     * Source partition for Kafka Connect offsets: one per ASE database.
     * Connect finds stored offsets by the serialized bytes of this map, so its key order must be
     * stable across JVM restarts: a TreeMap, never Map.of() (whose iteration order is randomized).
     */
    public Map<String, String> sourcePartition() {
        Map<String, String> p = new TreeMap<>();
        p.put("server", serverName());
        p.put("database", databaseName());
        return p;
    }
}
