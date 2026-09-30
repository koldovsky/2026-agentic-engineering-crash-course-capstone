# Design

The CLI already knows the job: it is the first argument in live mode, and it is taken from the build
URL in offline mode. `verdict()` gets it as a fourth argument. `stale` becomes the listed tests that
satisfy both conditions:

- the entry has no `job`, or its `job` equals the verified job;
- the test does not appear in the report.

`fixed` stays unscoped. If a test passed, the entry is out of date whichever job it names.
