# Independent QA plan (maker != checker, second check)

> Commit hashes in this file refer to the unsquashed history, kept in the git tag `full-history`
> (every red and green step). The branch holds the same content as a few phase commits.

A separate agent that did not write the app tests it as a black box in a real Chrome
browser through the Claude-in-Chrome extension. It may read only `docs/spec.md` for the
expected behaviour, never the source, and it edits nothing.

## How to run
1. Build and start the app: `npm run build` then `npx next start -p <port>`.
2. Browser: the built-in browser pane needs no setup. The Claude-in-Chrome extension also works
   but must be installed and connected first (an agent that finds no connected Chrome stops).
3. Ask Claude Code to start a general-purpose subagent with the brief below.
4. Fix what it finds with a red test first, then record the outcome in the run log below.

## Brief given to the agent (summary)
Load the Chrome tools, open its own tab, use at most 4 screenshots (prefer page text and
JavaScript), then check:

| # | Check |
|---|---|
| 1 | Home: title, three level cards with 12 questions each, no console errors |
| 2 | Quiz flow at each level: start screen, feedback and explanation after an answer, options disabled, Next / See score, score screen |
| 3 | Mistakes review: count equals 12 minus correct; shows your answer, the correct one, the explanation; "No mistakes" case if reachable |
| 4 | Shuffle: question and option order differ across 3 attempts; option texts unchanged |
| 5 | Best score: card shows Best N%; a lower score does not lower it; stored max in `localStorage`; invalid stored JSON does not break the page |
| 6 | Code questions: a code block at each level, complete and readable, scrolls inside the block on 375x812 |
| 7 | `/quiz/nope` shows a not-found page |
| 8 | Keyboard: Tab order, visible focus, Enter/Space selects |
| 9 | Mobile 375x812: no horizontal page overflow |
| 10 | Anything else wrong: layout, contrast, wrong facts |

Report: PASS / FAIL / NOT TESTED per item with evidence, then real bugs with repro steps.

## Run log
| Date | Result |
|---|---|
| 2026-09-30 | Run 1 in Chrome extension: **blocked, nothing tested** (about 61k tokens). No Chrome was connected (`list_connected_browsers` returned `[]`), so the agent stopped as instructed. |
| 2026-09-30 | Run 2 in the built-in browser pane, commit `06509f2`, separate sonnet agent, about 84k tokens, 46 tool calls, 1 screenshot. **10/10 checks PASS**: home, quiz flow at all 3 levels, mistakes review (including the 100% case), shuffle, best score (33% -> 100% -> 25% kept 100; invalid stored JSON did not break the page), code questions (2 per level), 404, keyboard (Tab/Enter/Space), mobile 375x812 (no page overflow, code block scrolls inside itself). Java facts in explanations checked out. |

### Findings from run 2 and what was done
| Finding | Severity | Decision |
|---|---|---|
| Mistakes review omits the code snippet, so two code questions look identical | low | Fixed (spec R6 updated first) |
| Keyboard focus is lost after answering, after Next and after Start | low (accessibility) | Fixed (spec R5 updated first) |
| The 404 page is the stock Next page without a link home | info | Not changed (KISS) |
| Decorative background text overlaps the heading on mobile, still readable | info | Not changed |
| Try again goes straight to a reshuffled question 1 | info | Consistent with R7, not changed |

Fix verification (by the author agent in the built-in browser, not independent): focus lands on
the question heading after Start and after Next, on the Next button after an answer, and on the
score heading at the end; across 6 attempts all 9 wrongly answered code questions showed their
code in the review. `npm run check` 41/41. A second independent run was not repeated (KISS).

Not tested by the agent: a contrast audit, screen-reader behaviour, a browser refresh in the
middle of a quiz, and blocked-storage mode.

The in-app browser checks recorded in the commit messages (`a612d48`, `790e9d3`) were done by
the author agent, not an independent checker. Run 2 is the independent one.

## Run 3 and review 2 (branch `feature/profiles-dashboard`, requirements R10-R16)

The brief was extended with profile, attempt-log, dashboard, logs/export, migration,
robustness and mobile-header checks (13 items in total).

**Reviewer run 2** (read-only, about 92k tokens, focused on R10-R16): no high findings and no
code comments. Medium: the storage layer had no tests, and unreadable profile text was
overwritten without a backup. Low-medium: profile data was deleted before the removal was
saved. Low: weak assertions in a summary test, no month or year streak boundary tests, stale
profile id in the remove handler, download link handling, key collisions in the logs list.
Fixed in red `3b59998` and green `e37da59`, with 9 new storage-layer tests (6 cover existing
behaviour and passed at once). Not fixed, on purpose: a near-trivial key test, a silent failed
write in the add form, a rare two-tab race on the first Default profile, and a dashboard `now`
that stays frozen when a tab is left open past midnight.

**QA run 3** (separate sonnet agent, built-in browser pane, commit `e37da59`, about 101k
tokens, 78 tool calls, about 5.5 minutes): **12 of 13 checks PASS, 1 conditional FAIL.**
Passed: home and header, quiz flow and mistakes review, shuffle, profiles (validation, limit
of 10, remove with confirmation), best score per profile, migration (both scenarios), attempt
log (one per quiz, cap 200), dashboard, logs and export, robustness with corrupt stored data,
keyboard focus and 404.

| Finding | Severity | Decision |
|---|---|---|
| Header overflows horizontally at 375 px when a profile has a 24-character name | medium | Fixed (spec v0.12) in `abc7fc3`; verified at 375x812, the dashboard and logs pages do not scroll sideways (`scrollX` stays 0) |
| Best labels appear about a second after the page loads | info | Not changed |
| Old profile's score stays on screen after switching profile on the score screen | info | Intended by R12, not changed |
| Background code snippets appear in extracted page text | info | The container is `aria-hidden`; not changed |

Not tested by the agent: a contrast audit, screen readers, refresh in the middle of a quiz,
blocked storage, focus after "See score", and a profile literally named "Ann Lee" (the file
name rule was tested with other names). A second QA run after the header fix was not repeated
(KISS); the fix was verified by the author agent.

## Test-and-fix pass (2026-10-01, author agent, built-in browser)

Covered the gaps the independent runs had listed as "not tested":

| Area | Result | Action |
|---|---|---|
| Contrast audit, dark theme (computed WCAG ratios) | PASS, lowest 5.2:1 | none |
| Contrast audit, light theme | FAIL: button label 3.58:1 (needs 4.5:1) | Fixed: `on-accent` token and darker light `accent-2`, now 5.18:1 and 5.02:1 (`3e45cfe`, design.md first) |
| Light theme, visual check of home and an answered code question | PASS | none |
| Blocked `localStorage` (getter that throws) | Quiz and navigation worked with no errors; dashboard and logs showed "Loading your profile..." forever | Fixed: `storageAvailable()` and a clear message (spec R11 v0.13; red `89a0199`, green in the next commit) |
| Refresh in the middle of a quiz | PASS: back to the start screen, no partial attempt logged | none (by design) |

Still not tested: screen readers, other browsers (only the built-in Chromium pane), and multiple
tabs open at once. These checks were done by the author agent, not by an independent checker.

## Question pool and Ukrainian (2026-10-01, commits `ad68e10` to `e264fca`)

| Check | Who | Result | Action |
|---|---|---|---|
| Java fact check of 120 questions | independent reviewer, about 83k tokens | no wrong answers; ambiguous j4, s23, m35; about 12 senior questions at middle level; s24 duplicated m3/s11 | stems fixed, 12 senior questions replaced (`b72e0b8`) |
| Tell statistics | author, generator and Vitest | first draft: correct answer strictly longest in 58% (middle); first rewrite overshot to 0% (inverse tell) | bounds 10%-30% both ways in tests; 20-25% longest, 12-15% shortest per level |
| Ukrainian fidelity and language | independent reviewer, about 113k tokens | all 120 translations faithful; Thread vs Stream ambiguity (s34, m4 high), grammar (j27), "перевірювані", calques, register | all fixed in `e264fca` |
| Black-box QA, built-in browser | independent agent, about 120k tokens, 36 quizzes | detection, switching, pool and draw, content, mid-quiz switch, profiles, dashboard and logs plurals, tells (10-26% longest, 10-19% shortest), regression: all PASS | one medium bug: a 24-character name overflowed the empty dashboard and logs at 375 px; fixed and verified (spec v0.17) |

Not tested: screen readers, other browsers, "No mistakes" in Ukrainian (a perfect score is not
reachable with shuffled options), the blocked-storage notice in Ukrainian. The author agent also
verified 24 sampled Ukrainian questions by reading the marked correct answers.

## Accounts (2026-10-01, branch `feature/accounts`, requirements R20-R28)

| Check | Who | Result | Action |
|---|---|---|---|
| Security review, read-only, about 87k tokens | independent agent | no high findings; data isolation, token handling, scrypt, enumeration and CSRF came out clean; 3 medium (body read before the size check, blocking scrypt without a global limit, unbounded `login_failures` and `users`), 9 low | body now read with a byte limit, 500 JSON on database errors, own-property lookup, expired failures and sessions purged, `results` capped at 100, password change and registration in transactions (`fix(green)` commit after the red commit `test(red): security review fixes`) |
| Black-box QA, built-in browser, about 120k tokens, 162 tool calls | independent agent | register, login, lockout, import, delete, mobile 375 px, keyboard, both languages all PASS; no high bugs | login wording on wrong current password, stale signed-in header after a session revoked in another tab, silent loss when saving to the server fails, "Saved." after cancelling the delete dialog, home copy "no registration": all fixed in `66b5bd2` |

Left open on purpose, written down as known limits: the 5-failures lockout can be used to lock out
a known email (it is what R24 specifies); no per-IP or global rate limit and synchronous scrypt
(single-node course project); a client can forge its own scores; the Origin check compares hosts
only; a 401 on `/api/auth/me` shows in the console for guests; a brief English flash before the
Ukrainian text on a hard load; the cookie is `Secure` in production, so test with `npm run dev`.
Not tested: clearing cookies mid-session, the dashboard on mobile while signed in.

## Gap fixes v0.23 (author agent, built-in browser, plan in `docs/plan-gap-fixes.md`)

| Check | Result |
|---|---|
| Guest `GET /api/auth/me` | 200 `{"user":null}` (curl), no 401 in the console |
| Reload in the middle of a quiz | resumed at question 2 with the chosen answer; the `sessionStorage` key was removed after finishing |
| Failing server save while signed in | score screen shows "saved on this device only" (Ukrainian text verified); result is in the local profile |
| Registration limit | unit-tested only (30 per hour, 429); not exercised in the browser |

Independent QA run on a production build (agent, about 112k tokens, 122 tool calls): no functional
bugs. Everything in the table above, plus guest page loads without any failed request, corrupt and
tampered saved quizzes falling back to the start screen, unavailable `sessionStorage`, the
registration limit message in both languages, lockout, import, delete, language dropdown contrast,
mobile 375 px and keyboard focus, passed.

Observations and decisions:

| # | Observation | Decision |
|---|---|---|
| 1 | The 429 came after 30 accounts although one earlier account existed | the limit counts accounts that still exist, so a deleted account frees a slot; accepted, stated here |
| 2 | No `Retry-After` header on the 429 | accepted, the message says "an hour" |
| 3 | At the limit, an existing email gets 429 instead of `email-taken` | accepted (the limit is checked first, before any hashing) |
| 4 | A resumed quiz keeps the language it started in | intended, the quiz is a snapshot |
| 5 | A saved quiz in a tab survives signing in or out in that tab, so its result goes to the account that is active at the end | accepted, cosmetic |
| 6 | A corrupt saved quiz stayed in `sessionStorage` after the start screen was shown | fixed: `loadRunningQuiz` removes it (red `test(red): a corrupt saved quiz is removed`) |

## First screen fits the viewport (2026-10-02, author agent, built-in browser)

Requested by the author after seeing the home page need scrolling. Before: 840 px page height at
1366 x 650 (190 px of scrolling). After the compact layout: page height equals the viewport at
1366 x 650 (Ukrainian) and 1280 x 600 (English and Ukrainian), the cards end at 521 px and
501 px; header and content stay aligned (both start at x = 319 at 1366 px); the title wraps to two
lines; no horizontal overflow at 375 px. Rule recorded in `docs/design.md`.
