---
file: sybase-cdc-connector/src/main/java/com/phoenix/cdc/sybase/connect/ChangeEventMapper.java
---
purpose
  What a consumer finally reads in Kafka is built here. ChangeEventMapper turns one row change of a committed transaction into three things: the name of the topic, the message key, and the message value with the operation, the row before and after the change, and a source block that says where the change came from. The format is schemaless JSON, written by Connect's JSON converter with schemas switched off.

class: ChangeEventMapper
  A package-private class that holds the three values that depend on the environment: the server name, the database name and the topic prefix. It has no other state, so it can be used from any thread.

method: ChangeEventMapper.<init>(String,String,String)
  Stores the server name, the database name and the topic prefix. They come from the connector configuration.

method: ChangeEventMapper.topic(LtlCommand)
  The topic of a change: the prefix, the database and the table joined by dots. With the lab's settings the payment table goes to sybase.phoenix_test.payment, the topic you read in stage 9.

method: ChangeEventMapper.key(LtlCommand)
  The message key: a map of the primary key columns, taken from the after image, or from the before image for a delete. The key columns are the ones RepAgent flagged. A table without a primary key gets no key (null). All events of one row share a key, so they go to the same partition and stay in order.

method: ChangeEventMapper.value(LtlCommand,CommittedTransaction,int)
  The message value. The operation is c for an insert, u for an update and d for a delete (anything else is an error). Then come the before and after images, a source block and the time of creation. The source block has the server, the database, the table owner, the table, the transaction id, the position of this change (oqid), the position of the commit (commit_oqid), the commit time, the user, the sequence number of the change inside its transaction (seq) and the number of rows of the transaction (txn_rows). The last field, ts_ms, is the time the event was built, not the time of the commit.

lines: 11-21
  The format of an event as a picture, and the rule consumers can use against repeats: the position of each change (source.oqid) is unique and increases in log order, so a repeated event can be recognised.

lines: 34-36
  The topic name rule: prefix, database, table.

lines: 38-44
  The key. The after image is used unless the change is a delete, because a delete has no after image.

lines: 61-66
  The mapping of the change kind to the operation letter. A kind that is not a row change cannot reach this method, and the exception says so if it ever does.

design
  The mapper only builds maps and strings, and it does not know Kafka Connect's record or schema types. The task puts the maps into records, and the JSON converter turns them into JSON. This keeps the format in one small, testable class.

env: topic.prefix
  The first part of the topic name (line 35). It is set in the registration (sybase in the lab).

env: database.name
  The database name is the middle part of the topic name and the db field of the source block (lines 35 and 49).

env: database.server.name
  The server name is the server field of the source block (line 48).

fits
  SybaseCdcSourceTask creates one ChangeEventMapper at start and calls topic, key and value for every row of a transaction it publishes. The mapper reads LtlCommand objects and the CommittedTransaction they belong to, and writes OQIDs as text with Oqid.
