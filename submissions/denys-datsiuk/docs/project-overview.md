# Project Overview

## Context

The source system is a private .NET-based integration platform deployed on premises inside a closed infrastructure. It imports data from multiple upstream systems, synchronizes it into local storage, normalizes identifiers and structures, builds application-specific projections, and performs additional calibration and consistency checks. Its operational dashboard helps maintainers inspect runs, failures, record changes, and audit information.

The operations dashboard is an internal support interface, not a BI report. It answers whether synchronization completed, where it failed or stalled, which records changed, and whether an operator must intervene. It combines run status and duration, processed-change counts, active alerts, errors, and field-level audit history.

The codebase was unfamiliar enough that implementation began with read-only investigation. Existing behavior showed that date filtering was applied by the backend, but the browser did not automatically request fresh data after a custom date was edited. A separate workflow displayed entity changes but lacked enough human-readable context for efficient diagnosis.

## Why It Is More Than ETL or ADF

Transport and scheduling are only part of the problem. The platform also owns domain mapping, identity matching, conflict resolution, idempotency, concurrency control, partial-result handling, projection rules, calibration, and entity-level auditability. Azure Data Factory could orchestrate movement between systems, but it would not replace these application semantics, operational invariants, or diagnostic model.

## Selected Vertical Slice

The capstone covers a bounded UI and observability improvement:

- reload after a valid custom date-range change;
- reset stale pagination and selection state before reload;
- deactivate conflicting quick-range controls;
- preserve intentionally exceptional operational alerts;
- improve the readability of entity-change keys and metadata;
- protect the behavior with focused tests and a full regression run.

## Why This Is Agentic Engineering

The agent did more than generate code. It inspected the repository instructions, traced UI parameters into backend queries, distinguished a defect from an intentional operational invariant, proposed a bounded change, implemented it, added tests, ran narrow and broad verification, and committed only the intended files.

Human judgment remained responsible for:

- choosing the behavior to change;
- accepting the exception for stale operational alerts;
- deciding what could be published;
- reviewing the diff and test evidence;
- authorizing commits.

## Outcome

The private repository contains two focused commits: one for dashboard metadata/readability and one for automatic custom-range reload. No private source code is included in this package.
