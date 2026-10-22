<!--
Sync Impact Report
Version change: (template, unratified) → 1.0.0
Rationale: Initial ratification (MAJOR) — first concrete adoption of all principles and
governance for this project; no prior ratified version existed.
Modified principles: none (initial set)
Added sections:
  - Core Principles (I–XII, twelve principles, by explicit user request)
  - Reference & Verification Standards
  - Learning Module Structure & Workflow
  - Governance
Removed sections: none
Templates requiring follow-up: none — dependent command/template files are not modified by
this command per the Scope Guard; they read this constitution at runtime.
Deferred items / TODOs: none — all placeholders resolved from user-supplied input.
-->

# Sybase-to-Kafka CDC Learning Path Constitution
<!-- A hands-on learning project that teaches how to build a Change Data Capture (CDC)
     pipeline from SAP/Sybase ASE to Apache Kafka. -->

## Core Principles

### I. Progressive, Verified Learning Path
Content MUST be sequenced from CDC fundamentals through to a verified end-to-end
implementation. Each module MUST build on verified outcomes of the previous one — no module
may assume an untested capability from an earlier module actually works.

**Rationale**: Learners need a path where each step is trustworthy before the next step
depends on it; skipping verification compounds confusion later in the path.

### II. Honest CDC Taxonomy
Materials MUST clearly distinguish three distinct techniques and never blur them: (a) JDBC
polling, (b) incremental ingestion (e.g., timestamp/sequence-column based), and (c) genuine
transaction-log-based CDC. Every exercise and example MUST state which of the three it
demonstrates.

**Rationale**: These techniques have materially different guarantees (latency, completeness,
ordering, DELETE visibility); conflating them teaches incorrect mental models.

### III. Architecture Selection Through Investigation
Before an architecture is selected for an implementation phase, the project MUST investigate
and document the relevant options for Sybase ASE transaction logs, RepAgent, SAP Replication
Server, and compatible CDC connectors. The choice MUST be justified against what was found,
not assumed in advance.

**Rationale**: Sybase ASE CDC architecture has several real, non-interchangeable paths; picking
one without investigating the others risks teaching an approach that doesn't fit the
constraints at hand.

### IV. Verified Compatibility & Prerequisites
Database versions, connector compatibility, prerequisites, licensing terms, and infrastructure
requirements MUST be verified against reliable documentation (official vendor docs, official
connector docs/release notes) before being presented as fact. Unverifiable claims MUST be
labeled as unverified.

**Rationale**: Licensing and version-compatibility mistakes in CDC tooling are expensive to
discover late and are a common source of failed learning exercises.

### V. Practical, Reproducible Labs
Every module MUST include practical, reproducible artifacts as applicable: architecture
diagrams, sample SQL, configuration examples, PowerShell commands, expected output, and
troubleshooting instructions. A lab that cannot be reproduced from its own instructions is
incomplete.

**Rationale**: This is a hands-on learning project — concepts without runnable, checkable
steps don't achieve the project's purpose.

### VI. Grounded in Authoritative References
Kafka Connect and JDBC ingestion content MUST be grounded in authoritative references,
including the Confluent JDBC Source Connector deep dive
(https://www.confluent.io/blog/kafka-connect-deep-dive-jdbc-source-connector/) and official
Kafka Connect, Debezium, and Sybase/SAP documentation. New claims MUST be traceable to a
reference, not invented.

**Rationale**: A named, checkable reference set keeps the learning path anchored in reality
and gives learners a way to verify claims themselves.

### VII. Rigorous CDC Correctness Testing
Every CDC implementation phase MUST be tested for: INSERT, UPDATE, and DELETE propagation;
transaction ordering; duplicate handling; checkpoint behavior; and restart/recovery. A phase
is not "done" until these are exercised and the results recorded.

**Rationale**: These are exactly the failure modes that distinguish working CDC from CDC that
looks correct in a demo and silently loses or duplicates data in practice.

### VIII. Windows and Docker-First Exercises
Exercises MUST prefer Windows and Docker-based environments where practical, since that is the
target environment for this project's learners.

**Rationale**: Matching the exercise environment to the actual environment learners will use
removes an entire class of "works on my machine" friction from the learning path.

### IX. No Fabrication — Evidence-Based Claims Only (NON-NEGOTIABLE)
Connector properties, configuration keys, and capabilities MUST NEVER be invented. Any claim
that a capability "works" MUST be backed by verification (a reference, a reproduced test, or
documented vendor behavior). Assumptions and limitations MUST be explicitly labeled as such,
not presented as confirmed fact.

**Rationale**: This project's credibility as a learning resource depends entirely on not
teaching things that are false; fabricated connector behavior is the single most damaging
failure mode available to this project.

### X. Production-Readiness Considerations
Security, monitoring, performance, and production-readiness considerations MUST be addressed
for each implementation phase where they are relevant, even though this is a learning project
and not a production deployment.

**Rationale**: Learners carry the habits taught here into real systems; omitting these
considerations teaches an incomplete and potentially unsafe picture of what "done" means.

### XI. Measurable Acceptance Criteria
Every learning module and every implementation phase MUST define measurable acceptance
criteria before it is considered complete. Criteria MUST be checkable (pass/fail or
quantifiable), not subjective impressions of success.

**Rationale**: Measurable criteria are what make "verified" in Principle I actually
verifiable, rather than aspirational.

### XII. Transparent Fallback When Log-Based CDC Is Unavailable
If true transaction-log-based CDC is unavailable for a given environment or licensing
situation, the project MUST explain why, and MUST present JDBC incremental ingestion as a
clearly labeled alternative with its trade-offs stated — never silently substituted as if
equivalent.

**Rationale**: Silent substitution of a weaker technique would violate Principle II (Honest
CDC Taxonomy) and could mislead a learner into believing they have log-based guarantees they
do not have.

## Reference & Verification Standards

All technical claims in this project trace to one of: (1) official SAP/Sybase ASE
documentation, (2) official SAP Replication Server / RepAgent documentation, (3) official
Kafka Connect and Debezium/connector documentation and release notes, or (4) the named
Confluent JDBC Source Connector deep dive referenced in Principle VI. When a reliable source
cannot be found for a claim, the claim MUST be labeled "unverified" or "assumption" inline
rather than omitted or stated as fact. Version numbers, compatibility matrices, and licensing
terms cited in materials MUST include the source and, where feasible, the date checked, since
these details change over time.

## Learning Module Structure & Workflow

Each learning module or implementation phase MUST follow this structure: Concept
(what is being taught and which CDC taxonomy category it falls into, per Principle II) →
Investigation (what options were considered, per Principle III) → Lab (reproducible artifacts,
per Principle V) → Verification (tests run against Principle VII's correctness list) →
Troubleshooting (known failure modes and fixes) → Acceptance Criteria (per Principle XI). A
module MUST NOT be marked complete while any of these sections is missing or contains
unverified claims presented as fact.

## Governance

This constitution supersedes all other project practices, lab instructions, and ad hoc
guidance for this project. Any content that conflicts with a principle here MUST be corrected
or the constitution MUST be amended first.

**Amendment procedure**: Amendments are proposed by editing this file, stating the rationale
for the change, and recording the change in a Sync Impact Report comment at the top of the
file at the time of amendment. Amendments take effect immediately upon being written to this
file.

**Versioning policy**: This constitution follows semantic versioning. MAJOR increments cover
backward-incompatible principle removals or redefinitions. MINOR increments cover new
principles or materially expanded guidance. PATCH increments cover clarifications and
non-semantic wording fixes.

**Compliance review**: Every learning module, lab, and implementation phase MUST be checked
against these principles — particularly Principles II, VII, IX, and XI — before being
considered complete. Reviewers MUST reject content that presents unverified claims as fact or
that omits measurable acceptance criteria.

**Version**: 1.0.0 | **Ratified**: 2026-10-22 | **Last Amended**: 2026-10-22
