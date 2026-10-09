# Plan: close the remaining as-built gaps (spec-driven)

Status: done, kept as history. The finished behaviour is specified in `docs/spec.md`.

Source: the differences table in the reverse-engineered description of the code (since merged into `docs/spec.md`) and the limits left open in spec v0.22.
Method for every slice: spec text first (all four slices are written into `docs/spec.md` v0.23
before any code), then a failing-test commit (`RED_COMMIT=1`), then the implementation commit
that passes `npm run check`, then a browser check for the slices with UI. KISS: no new
dependencies, no new tables, no new pages.

Out of scope on purpose: per-IP rate limiting (needs a trusted proxy header), email-based flows,
a retry queue for failed saves (new feature), counting malformed login emails in the throttle
(nothing to protect).

## Slices, cheapest first

| # | Gap | Requirement | Tests (red first) | Code |
|---|---|---|---|---|
| P1 | Guests get a console 401 on every page load | R26: `GET /api/auth/me` answers 200 `{ user: null }` without a session; the other signed-in endpoints stay 401 | `api.test.ts`: me without or with a bogus cookie is 200 `{user:null}`; PATCH and DELETE on `/me` still 401 | `src/server/api.ts`, `AccountProvider` treats `user: null` as guest |
| P2 | Registration is unlimited | R24 and R26: at most 30 accounts per rolling hour for the whole server, then 429 `too-many-registrations`, checked before hashing; login is unaffected | `auth.test.ts`: the 31st registration within an hour fails, one later in the next hour works, no user is created, an existing user can still log in; `api.test.ts` maps it to 429 | `src/server/auth.ts` (count of `users.created_at`), message keys in both languages |
| P3 | A failed server save silently becomes a local save | R27: `record` reports where the result went; if a signed-in user's result was saved on this device instead of the account, the score screen says so | pure helper for the outcome tested in `account` unit tests (`record` outcome is `account` or `device`); keys exist in both dictionaries (compile-time parity) | `AccountProvider.record` returns the outcome, `QuizRunner` shows `quiz.savedOnDevice` |
| P4 | A reload ends a running quiz | R3: the running quiz is kept in `sessionStorage` under `java-trainer-quiz:{level}` after every state change, restored on load when valid, removed when the quiz finishes or a new one starts | `quizState.test.ts`: `serializeQuiz` and `parseQuiz` round-trip; garbage, wrong level, answers of the wrong length, an index out of range, a selected option out of range and a finished quiz give `null` | `src/lib/quizState.ts` (pure), `QuizRunner` (storage in an effect, guarded for blocked storage) |

## Status
P1, P2, P4 logic: red `test(red): guest me answer, registration limit, quiz persistence`, green `feat(green): guest me answer, registration limit, quiz serialization`. P3 and the P4 screen wiring: UI commit after them, verified in the built-in browser (reload mid-quiz resumed at question 2 and the key was removed when the quiz finished; with `/api/data/attempts` failing for a signed-in user the score screen showed the notice). The independent QA run (step 4) found no functional bugs; its observations are in `docs/qa-plan.md`.

## Order of work and checks
1. Spec v0.23 for all four slices, commit.
2. For each slice: red commit, green commit; run `npm run check`; update the reverse-engineered description of the code (since merged into `docs/spec.md`).
3. Browser check in the built-in pane: guest console without 401 (P1), registration limit message
   in both languages (P2), the saved-on-device notice with the server stopped (P3), reload
   mid-quiz in both themes (P4).
4. One independent QA run of the changed areas, fixes test-first, then update `docs/qa-plan.md`,
   `docs/capstone-dod.md` and `docs/pr-description.md`.

## Definition of done
All four requirements in the spec, each with a red and a green commit, `npm run check` green,
the browser checks recorded in `docs/qa-plan.md`, as-built table rows closed.
