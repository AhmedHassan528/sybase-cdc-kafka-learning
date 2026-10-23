---
file: sybase-cdc-connector/src/main/java/com/phoenix/cdc/sybase/connect/SybaseCdcConfig.java
---
purpose
  Every setting of the connector is defined here: its key, its type, its default, how important it is and what it means. Kafka Connect reads the definition to validate a registered configuration and to show the settings in its REST API; the rest of the connector reads the settings through typed methods. This file is the complete list of the environment-dependent values of the connector.

class: SybaseCdcConfig
  Extends Kafka's AbstractConfig. It holds the validated settings and offers one method per setting. The constants at the top are the keys as they are written in the registration JSON, and CONFIG_DEF is the definition.

method: SybaseCdcConfig.<init>(Map)
  Validates the given properties against the definition and keeps them. A missing required setting, a wrong type or a value outside its range throws a ConfigException, so a bad configuration fails at registration or at start, not later.

method: SybaseCdcConfig.charset()
  The configured Java character set for text values; an empty string means use the one in the RepAgent login.

method: SybaseCdcConfig.databaseName()
  The replicated database.

method: SybaseCdcConfig.largeTransactionRows()
  The number of rows at which a large-transaction warning is logged.

method: SybaseCdcConfig.listenHost()
  The address the LTL server binds to.

method: SybaseCdcConfig.listenPort()
  The port the LTL server binds to.

method: SybaseCdcConfig.ltlPassword()
  The password RepAgent logs in with, as Kafka's Password type, which hides the value when the configuration is printed.

method: SybaseCdcConfig.ltlUser()
  The user RepAgent logs in with.

method: SybaseCdcConfig.maintenanceUser()
  The login whose transactions RepAgent does not forward.

method: SybaseCdcConfig.pollMaxRecords()
  The upper bound of the records returned by one poll.

method: SybaseCdcConfig.queueMaxTransactions()
  The size of the queue between RepAgent and Kafka, in transactions.

method: SybaseCdcConfig.serverName()
  The ASE server name as RepAgent reports it.

method: SybaseCdcConfig.sourcePartition()
  The key under which Kafka Connect stores the connector's offset: the server and the database. The comment explains a subtle rule: Connect finds stored offsets by the serialized bytes of this map, so its key order must be the same after every restart. That is why a sorted map is used and never an immutable map whose order is randomised. This is why the stored key you saw in lesson 7.22 lists database before server.

method: SybaseCdcConfig.tableIncludes()
  The table list as a set of lower-case names, so the filter ignores case. An empty list means no filter.

method: SybaseCdcConfig.topicPrefix()
  The first part of every topic name.

method: SybaseCdcConfig.trace()
  Whether to log every LTL message.

lines: 31-59
  The definition: fourteen settings. Four have no default and must be given (the user, the password, the server name and the database name), and the others have a default. Several have a range check, for example a port between 1 and 65535 and queue sizes of at least 1.

lines: 84-94
  The offset partition and the reason it is built from a sorted map (see the method note).

design
  A typed definition fails early and explains itself. The same definition serves Connect's validation, the REST API and the code, so the defaults and descriptions can never differ between them.

env: ltl.listen.host
  Default 0.0.0.0, the interface the LTL listener binds to (line 32).

env: ltl.listen.port
  Default 11752, the port RepAgent connects to, which must equal the CDC_RS entry of the ASE interfaces file (line 34).

env: ltl.username
  Required. The login RepAgent uses, as given to sp_config_rep_agent (line 36).

env: ltl.password
  Required. The password RepAgent uses; the database's net password encryption setting must be off (line 38).

env: ltl.charset
  Default empty: take the character set from the RepAgent login (line 40).

env: ltl.trace
  Default false: log every LTL message, for troubleshooting only (line 42).

env: database.server.name
  Required. The ASE server name as select @@servername returns it; it is used in the offset partition and in the events (line 44).

env: database.name
  Required. The replicated database; a RepAgent for any other database is refused (line 46).

env: database.maintenance.user
  Default cdc_maint: returned to "get maintenance user" (line 48).

env: topic.prefix
  Default sybase: the topic name is the prefix, the database and the table joined by dots (line 50).

env: table.include.list
  Default empty, meaning every table marked with sp_setreptable; otherwise a comma-separated list, case-insensitive (line 52).

env: queue.max.transactions
  Default 1000: how many committed transactions may wait between RepAgent and Kafka; when full, RepAgent waits (line 54).

env: poll.max.records
  Default 10000: the most records one poll returns (line 56).

env: large.transaction.warn.rows
  Default 100000: log a warning when one open transaction holds this many rows in memory (line 58).

fits
  SybaseCdcConfig is created by SybaseCdcSourceConnector, which validates the registration with it, and by SybaseCdcSourceTask, which reads every setting from it when it starts. It is the only class that knows the names of the settings.
