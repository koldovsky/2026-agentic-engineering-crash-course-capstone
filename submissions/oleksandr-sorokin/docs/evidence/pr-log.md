# PR log

One row per merged PR. This is the short audit trail: RUBRIC wants proof you can click on,
and a list of "step → what proves it" is faster to read than searching every PR body.

The long form (full command output, exit codes, test counts) lives in `docs/evidence/verify/`,
one file per PR, named `<date>-<short-sha>.md` (made by `pnpm verify`).

| PR | Step | One line: what it proves | Verify report |
|----|------|---------------------------|----------------|
| [#1](https://github.com/ps1on1ck/2026-agentic-engineering-crash-course-capstone/pull/1) | 01 — scaffold | Next.js app bootstrapped with pnpm, hooks wired, `pnpm check` green from day one | — |
| [#2](https://github.com/ps1on1ck/2026-agentic-engineering-crash-course-capstone/pull/2) | 02 — context & scope guard | Write blocked outside submission folder; `.env` read denied; `pnpm hooks:selftest` green; block captured in [`scope-guard-blocked.md`](scope-guard-blocked.md) | [`verify/2026-09-26-2bf5575.md`](verify/2026-09-26-2bf5575.md) |
| [#3](https://github.com/ps1on1ck/2026-agentic-engineering-crash-course-capstone/pull/3) | 03 — PRD & docs | `docs/PRD.md`, `docs/architecture.md`, `docs/design.md`, `docs/data-model.md` committed; project intent documented before any feature code | — |
| [#4](https://github.com/ps1on1ck/2026-agentic-engineering-crash-course-capstone/pull/4) | 04 — OpenSpec | `openspec/` directory live; first spec-driven change proposed, approved and archived; `spec:` commit precedes `feat:` commit in log | — |
| [#5](https://github.com/ps1on1ck/2026-agentic-engineering-crash-course-capstone/pull/5) | 05 — loop & reviewer subagents | Reviewer subagents in `.agents/agents/`; loop evidence in `docs/evidence/loop/`; maker ≠ checker separation enforced | — |
| [#6](https://github.com/ps1on1ck/2026-agentic-engineering-crash-course-capstone/pull/6), [#7](https://github.com/ps1on1ck/2026-agentic-engineering-crash-course-capstone/pull/7) | 06 — ETF data | Zod schema + seed JSON + `lib/etfs.ts` with unit tests; `pnpm check` green; spec-first commit order preserved | [`verify/2026-09-27-1d85409.md`](verify/2026-09-27-1d85409.md) |
| [#8](https://github.com/ps1on1ck/2026-agentic-engineering-crash-course-capstone/pull/8) | 07 — ETF list | `/etfs` page live; filter/sort/pagination state in URL (shareable link); Playwright e2e J1 round-trip green | [`verify/2026-09-27-3f91e5f.md`](verify/2026-09-27-3f91e5f.md) |
| [#9](https://github.com/ps1on1ck/2026-agentic-engineering-crash-course-capstone/pull/9) | 08 — ETF filters | Asset-class + region filters wired to URL state; J2 URL-sharing e2e green; reviewer subagent ran | [`verify/2026-09-27-d6f39d4.md`](verify/2026-09-27-d6f39d4.md) |
| [#10](https://github.com/ps1on1ck/2026-agentic-engineering-crash-course-capstone/pull/10) | 09 — ETF details | `/etfs/[slug]` page with KPIs, price chart, holdings and sector allocation; J3 404 e2e green; reviewer subagent ran | [`verify/2026-09-27-5ccab63.md`](verify/2026-09-27-5ccab63.md) |
