---
file: sybase-cdc-connector/pom.xml
---
purpose
  pom.xml is the Maven build file: it says what the project is called, which Java version to compile for, which libraries the code needs and how to package the result. The packaging step produces the single JAR that you drop on Kafka Connect's plugin path. Building it is the subject of lesson 8.1.

lines: 7-10
  The identity of the artifact: group com.phoenix.cdc, name sybase-cdc-connector and version 0.1.0. The version is the one that appears in the JAR's file name and in the connector's log.

lines: 12-16
  The properties: the code is compiled for Java 17, the source files are read as UTF-8, and the Kafka version is defined once (3.8.0, the version of Kafka Connect in the lab) so that two dependencies cannot drift apart.

lines: 20-25
  The Kafka Connect API (connect-api), compiled against but marked provided: the Kafka Connect worker already has these classes, so the JAR must not carry its own copy. The recorded build check showed that no classes of this API are in the JAR.

lines: 26-31
  The logging API (slf4j-api), also provided: the worker supplies it, which is why the log lines of the connector appear in the worker's own log.

lines: 32-37
  JUnit 5, scope test: needed to run the unit tests while building, and never packaged.

lines: 42-45
  The surefire plugin at a fixed version: it runs the unit tests in the package step. The build fails if one of them fails.

lines: 47-60
  The shade plugin, which runs at the package step and writes the single self-contained JAR. Because the Kafka Connect API and slf4j are provided and JUnit is a test dependency, nothing from them is copied in: the JAR holds only the connector's own classes.

lines: 56
  The option that stops the shade plugin from writing a second, reduced pom next to the JAR; one JAR is what the plugin path needs.

design
  Every plugin and dependency has an exact version, never a range, so the same source builds the same way every time. The scopes decide what ends up in the JAR: provided means the worker brings it, test means it never leaves the build.

env: kafka.version
  The Kafka version the connector is compiled against (3.8.0). It must match the Kafka Connect version of the worker that loads the JAR; the lab's worker is 3.8.0.

env: maven.compiler.release
  The Java version of the compiled classes (17). The Java runtime of the Kafka Connect worker must be at least this version.

fits
  pom.xml builds the whole connector: it compiles every Java file of the module, runs the unit tests and packages the JAR that Kafka Connect loads from its plugin path (lab/path steps in lesson 8.1 and lesson 8.2 show the build and where the JAR lands).
