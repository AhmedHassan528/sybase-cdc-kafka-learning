---
file: sybase-cdc-connector/src/main/java/com/phoenix/cdc/sybase/connect/SybaseCdcSourceConnector.java
---
purpose
  This is the class Kafka Connect loads first. The name of the class is the connector.class in the registration JSON. Its job is small: validate the configuration, say which settings exist, say which task class does the work, and hand each task its configuration. It always creates exactly one task, because RepAgent connects to one host and port per database.

class: SybaseCdcSourceConnector
  A subclass of Kafka Connect's SourceConnector. Connect creates one instance per registered connector and calls start, then taskConfigs, and finally stop.

method: SybaseCdcSourceConnector.<init>()
  The implicit constructor. Connect creates the connector by class name with it.

method: SybaseCdcSourceConnector.start(Map)
  Called with the registered configuration. It builds a SybaseCdcConfig from it only to see it fail fast: an invalid configuration throws here, at registration, and the properties are kept for the task.

method: SybaseCdcSourceConnector.taskClass()
  Tells Connect which class runs the work: SybaseCdcSourceTask.

method: SybaseCdcSourceConnector.taskConfigs(int)
  Returns the configuration of the tasks. It ignores the maximum Connect offers and always returns a list with one entry, the connector's own properties, so there is exactly one task. This is why the status you saw in lesson 6.2 has one task.

method: SybaseCdcSourceConnector.stop()
  Nothing to release: the connector itself holds no resources, the task does.

method: SybaseCdcSourceConnector.config()
  Returns the definition of the settings, which Connect uses for validation and for the REST API.

method: SybaseCdcSourceConnector.version()
  Returns the version string 0.1.0, which Connect shows in its logs.

lines: 35
  The one-task rule in one line. The class comment gives the reason: RepAgent connects to one host and port per database, so one task, which owns the listening port, is all there can be.

design
  A connector class does not process data. It only validates and delegates, and all the work, with all its state, lives in the task. That keeps a restart of the work (Connect restarts tasks) separate from the one-time validation.

env: connector.class
  The registration JSON names this class in connector.class; Connect finds it on the plugin path by that name.

env: tasks.max
  The registration JSON sets tasks.max to 1. The value is not used: taskConfigs ignores it and always returns one task.

fits
  Kafka Connect creates SybaseCdcSourceConnector from the JAR on its plugin path. It uses SybaseCdcConfig to validate the settings and names SybaseCdcSourceTask as the class that does the work.
