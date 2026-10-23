---
file: sybase-cdc-connector/src/main/java/com/phoenix/cdc/sybase/cdc/Oqid.java
---
purpose
  Every record in the database log gets an identifier from RepAgent, the origin queue ID (OQID): 32 bytes that strictly increase in log order. The connector uses OQIDs as positions. Oqid holds the few helpers for them: compare two positions, turn one into the 36-byte answer RepAgent expects for "get truncation", and convert to and from hexadecimal text so a position can be stored in Kafka.

class: Oqid
  A final utility class with only static methods and a private constructor. It holds no state.

method: Oqid.<init>()
  Private and empty: nobody creates an Oqid.

method: Oqid.compare(byte[],byte[])
  Compares two positions byte by byte as unsigned numbers. Because OQIDs increase in log order, this tells which of two changes came first. The task uses it to recognise a transaction that RepAgent sent again after a restart.

method: Oqid.fromHex(String)
  Parses a position from hexadecimal text; null or empty text gives null, which means "no position yet". This is how the position stored in Kafka is read back at start.

method: Oqid.hex(byte[])
  The position as hexadecimal text, or null for a null position. It is the form stored in Kafka (the commit_oqid in the connector's offset) and written into the source part of every event.

method: Oqid.locator(byte[])
  The answer to "get truncation": the position padded with zeros to 36 bytes, or 36 zeros when there is none. The class comment explains the extra four bytes: they are the Replication Server's own, and RepAgent ignores them.

lines: 13
  The locator length, 36 bytes. The OQID itself is 32 bytes; the connector pads it.

design
  Positions are kept as raw bytes and compared as bytes, never parsed into numbers. That makes the comparison exact, independent of what the individual fields of an OQID mean, which the connector does not need to know.

fits
  ChangeEventMapper writes OQIDs as hexadecimal text into the source of every event. SybaseCdcSourceTask converts the stored position to and from text, compares positions to skip transactions that were already published, and builds the answer to "get truncation" with locator. The probe tool LtlProbe uses the same helpers.
