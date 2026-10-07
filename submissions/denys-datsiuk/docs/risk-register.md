# Risk Register

| ID | Risk | Likelihood | Impact | Control | Residual risk |
|---|---|---:|---:|---|---|
| R-01 | Confidential text enters a public artifact | Medium | Critical | Literal domain scan, secret scan, human review | Low |
| R-02 | Screenshot or video exposes a real record | Medium | Critical | Synthetic-only mockups; full-frame media review | Low |
| R-03 | UI fix creates stale pagination or conflicting state | Medium | Medium | Explicit acceptance scenarios and focused test | Low |
| R-04 | Date filtering hides an actionable alert | Low | High | Preserve alert invariant outside ordinary range list | Low |
| R-05 | Human-readable metadata exposes sensitive values | Low | High | Publish descriptions only; no record values | Low |
| R-06 | Broad regression claim omits excluded integration scope | Medium | Medium | State skipped category and limitations beside counts | Low |
| R-07 | Video is unavailable to reviewers | Medium | High | Incognito playback check before PR | Medium until recorded |
| R-08 | Evidence changes after review | Low | Medium | SHA-256 manifest checked locally and in CI | Low |
| R-09 | Agent weakens a requirement to make checks pass | Low | High | Skill requires exact-path reporting and prohibits silent weakening | Low |
| R-10 | Agent or command reads a sensitive local file | Medium | Critical | Runtime deny policy; sanitized temporary workspace; no secret mounts | Low when sandboxed |
| R-11 | Base image or dependency cache is compromised | Low | Critical | Pinned image digest, read-only reviewed cache, rebuild and provenance review | Low |
| R-12 | Factory is presented as more autonomous than demonstrated | Medium | Medium | Declare lights-on mode; distinguish contracts, deterministic runs, and pending independent review | Low |
| R-13 | New tab retains a stale filter or hidden selection | Medium | Medium | Shared applied range; reset both tab states; inclusive-boundary and incomplete-range tests | Low for model; browser review required |
| R-14 | Static diagnostic output is mistaken for actual analysis | Medium | High | Shared UI/eval engine, schema validation, policy drift check and negative cases | Synthetic reference, not production accuracy evidence |
| R-15 | Empty test selection produces false success | Medium | High | TRX counters required for both verification phases | Filters still require human scope review |
| R-16 | Denied or out-of-scope files evade checks | Medium | Critical | Filename-first shared policy, exact paths, untracked/staged checks and mutation tests | Host read isolation still depends on runtime permissions |

## Review Triggers

Reassess the register when adding media, changing claims, updating test counts, or copying the package into another repository.
