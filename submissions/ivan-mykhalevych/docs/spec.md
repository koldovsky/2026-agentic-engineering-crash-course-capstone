# Spec: Java Interview Prep (v1.1)

> **This spec is the single source of truth.** Every change starts here: update the requirement
> and add a line to "Spec changes" with the reason, then write a failing test, then change the
> code. If the code and this spec disagree, the code is wrong unless the spec is changed on
> purpose first. Version 1.0 was rewritten from the code on 2 October 2026 so that spec and code
> agree; the change log below keeps the history of how the requirements evolved.

## Goal
Let a candidate practise Java interview questions by level (junior, middle, senior) in short
multiple-choice quizzes, learn from the explanations and the mistakes review, and follow their
progress. It is a trainer, not an interview simulator: no timers.

## Scope
- Levels `junior`, `middle`, `senior`; a pool of 40 questions per level; a quiz draws 12 at random
  (R2, R3). Two languages: English and Ukrainian (R17-R19).
- Two modes. **Guest**: local profiles without passwords, data in the browser (R10-R16).
  **Signed in**: an account with email and password, data on the server (R20-R28). Guest mode
  works without an account.
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4, Vitest. No runtime dependency
  besides Next and React; the server uses Node's built-in `node:sqlite` and `node:crypto` only.
  Developed and tested on Node 24.
- Visual rules (colours, type scale, the first screen fitting a laptop viewport) are in
  `docs/design.md`, which is part of this spec.

## Requirements

### R1 Question model
A question has: `id`, `level`, `topic`, `text`, `options` (exactly 4 strings), `correctIndex`
(0..3), `explanation`, and an optional `code` (a Java snippet).

### R2 Question bank rules (enforced by tests)
- The bank (`src/lib/bank/{level}.ts`) holds at least 40 questions per level (currently exactly 40,
  120 in total). UI code
  never hard-codes questions; it reads them through `getQuestions` (R3).
- Ids are unique. Every question satisfies R1 with a non-empty text and explanation.
- Options of one question are similar in length: the longest is at most twice the shortest.
- Within a level, `correctIndex` is not the same for every question.
- No answer tell. Per level, the correct option is the strictly longest option in 10% to 30% of
  the questions and the strictly shortest in 10% to 30%, and each answer position (0 to 3) holds
  the correct answer in 15% to 35% of the questions. The upper bounds stop "pick the longest" from
  working; the lower bounds stop "never pick the longest" from working either.

### R3 Selection and a running quiz
- `getQuestions(level)` returns only the questions of that level, in bank order (the pool).
- `QUIZ_LENGTH` is 12. `pickQuiz(pool, rng, length = QUIZ_LENGTH)` returns `length` distinct
  questions chosen at random from the pool, or the whole pool when it is smaller, with the option
  order shuffled as in R7. Inputs are never mutated and `rng` is injected, so tests are
  deterministic.
- A running quiz is kept in `sessionStorage` (per browser tab) under `java-trainer-quiz:{level}`
  as JSON after every state change, restored when the page loads if it is valid for that level,
  and removed when the quiz finishes or a new one starts. A restored quiz keeps the language it
  started in.
- `serializeQuiz(state)` and `parseQuiz(raw, level)` are pure. `parseQuiz` never throws and returns
  `null` for invalid JSON, a finished quiz, questions of another level or not R1-shaped, an empty
  question list, answers whose length differs from the questions, an index outside the questions,
  or a selected option that is outside 0..3 or differs from the stored answer at that index. A
  stored value that `parseQuiz` rejects is deleted. Blocked storage is ignored.
- Nothing is logged until the quiz finishes (R12).

### R4 Scoring
`scoreQuiz(questions, answers)` returns `{ correct, total, percent }`. `answers[i]` is the chosen
option index for `questions[i]`, or `null` if skipped. Skipped counts as wrong. `percent` is
`round(correct / total * 100)`; an empty quiz gives 0.

### R5 Pages and quiz screens
- `/` shows the title, a short introduction and one card per level (glyph and level name on one
  row, a short description, the best score (R8), the pool size and a start link). The first
  screen fits the viewport without vertical scrolling from 1280 x 600 px up, in both languages
  (`docs/design.md`).
- `/quiz/[level]` exists for the three levels (static pages); any other level is a 404 page.
- A quiz starts from a "Start quiz" screen. A question screen shows "Question n of 12", the topic,
  the question, the code block when there is one, and four options labelled A to D. After a choice
  the options are disabled and "Correct!" or "Not quite." plus the explanation appear in a live
  region, then "Next" (or "See score" on the last question).
- Keyboard focus is never lost: after an answer it moves to "Next" (or "See score"), and after
  Start, Next or the last answer it moves to the new screen's heading.
- The score screen shows the percent, "x of y correct", "Try again" (a new random quiz) and
  "Choose another level", and the mistakes review (R6).

### R6 Mistakes review
`getMistakes(questions, answers)` returns, in quiz order, one entry `{ question, chosen }` for every
question answered wrongly or skipped (`chosen` is `null` when skipped). The score screen lists them:
question text, the code snippet when the question has one, the user's answer (or "Skipped"), the
correct answer and the explanation. With no mistakes it shows "No mistakes - well done!".

### R7 Shuffle
`shuffleQuestions(questions, rng)` returns a new array with the questions in random order and,
inside each question, the options in random order (Fisher-Yates). `correctIndex` is updated so it
still points at the same option text. Inputs are never mutated; `rng` is injected
(`() => number` in [0, 1)). Shuffling happens in the click handlers of Start and Try again, so
server and client HTML always match.

### R8 Best score per level
- `parseBestScores(raw)` turns stored text into `{ [level]: percent }`. `null`, invalid JSON, a
  non-object, unknown level names and values that are not integers 0..100 are ignored; it never
  throws.
- `withBestScore(scores, level, percent)` returns a new object in which that level holds the
  higher of the old and new percent. The input is never mutated.
- When a guest finishes a quiz, the best score is stored under the active profile's key (R16);
  signed in, the server keeps it (R25). Storage failures are ignored.
- Each level card on `/` shows "Best: N%" when a score exists, and nothing otherwise.

### R9 Code-snippet questions
- A question may carry `code`. When present it is non-empty and is shown in a code block between
  the question text and the options.
- Every level has at least one question with `code` (currently two each).
- The option-length and answer-position rules of R2 apply to code questions too.

### R10 Profiles (storage logic)
A profile is `{ id, name }`. The state is `{ profiles, activeId }`. There are no passwords.
- `parseProfiles(raw)` turns stored JSON into a valid state and never throws. Invalid JSON or shape
  gives the empty state. Profiles with a missing id or an invalid name are dropped; duplicate ids
  or names (case-insensitive) keep the first; at most 10 profiles are kept. `activeId` is kept
  only if that profile exists, otherwise it is the first profile id (`null` when there are none).
- `validateProfileName(name, existing)` trims the name. It is valid with 1 to 24 characters and
  not used by another profile (case-insensitive). The result is `{ ok: true, name }` or
  `{ ok: false, error }` with the code `empty`, `too-long` or `duplicate`.
- `addProfile(state, name, makeId)` returns `{ ok: true, state }` with the new profile added and
  active, or `{ ok: false, error }` for an invalid name or `too-many` when 10 profiles exist.
- `switchProfile(state, id)` activates an existing profile; an unknown id changes nothing.
- `removeProfile(state, id)` removes it; if it was active, the first remaining profile becomes
  active (`null` when none remain).
- `ensureProfile(state, makeId)` adds a profile named "Default" as active when there are none.
- No function mutates its input.

### R11 Guest storage and the profile switcher
- The profile state is stored as JSON in `localStorage` under `java-trainer-profiles`. On first use
  a "Default" profile is created. If the stored text exists but cannot be parsed, it is first
  copied to `java-trainer-profiles-backup`.
- Per-profile data lives under `profileKey(base, id)` = `base:id`, with the bases
  `java-trainer-attempts` and `java-trainer-best`. Removing a profile asks for a confirmation that
  names the active profile, saves the removal, and deletes the profile's data keys only if the
  removal was really saved.
- Reads and writes never throw; blocked storage reads as empty. Every write notifies all
  components of the tab, and other tabs see the change through the `storage` event.
- `storageAvailable()` is true only when a test value can be written to and removed from
  `localStorage`. When storage is blocked the quiz still works, and the dashboard and logs say,
  in the selected language, that the browser is blocking local storage.
- In guest mode the header shows the profile switcher: a select of profiles, "Add profile" (a name
  field and a create button showing the translated message for each R10 error code) and "Remove".
- Nothing in the header or on the dashboard and logs pages makes the page scroll horizontally,
  even on a 375 px screen with a 24-character name; long names are cut off or wrap.

### R12 Attempt log
An attempt is `{ at, level, total, correct, percent, results }`: `at` is the finish time in epoch
milliseconds and `results` lists, per question in quiz order, `{ id, topic, correct }` (a skipped
question counts as incorrect).
- `buildAttempt(level, questions, answers, now)` builds the attempt of a finished quiz; `total`,
  `correct` and `percent` follow R4.
- `parseAttempts(raw)` never throws; invalid JSON or a non-array gives `[]`. Entries are dropped
  when a field is missing or wrongly typed, the level is unknown, `correct` exceeds `total`,
  `percent` is outside 0..100, there are more than 100 results, or the numbers disagree with the
  results (`total` = number of results, `correct` = number of correct results, `percent` =
  `round(correct / total * 100)`, 0 when `total` is 0). Only the newest 200 entries are kept.
- `appendAttempt(log, attempt, cap = 200)` returns a new list with the attempt last and only the
  newest `cap` entries. The input is never mutated.
- When a quiz finishes, exactly one attempt is recorded (R27 decides where); switching profile
  afterwards on the score screen does not record it again.

### R13 Progress
All functions are pure and work on one attempt log.
- `masteryByTopic(attempts)` adds up every result per topic and returns `{ topic, correct, total,
  percent }` entries (percent rounded), sorted by topic name. No attempts gives `[]`.
- `weakestTopics(mastery, count = 3, minAnswered = 3)` keeps topics with at least `minAnswered`
  answers, orders them by percent ascending and then by topic name, and returns the first `count`.
- `currentStreak(attempts, now)` is the number of consecutive local calendar days with at least
  one attempt, counted back from today; if there is none today but there is one yesterday, it
  counts from yesterday; otherwise it is 0. Several attempts on one day count once.

### R14 Dashboard
- `summarizeProgress(attempts, now)` returns `{ attemptCount, streak, mastery, weakest }` from the
  R13 functions with their defaults.
- `/dashboard` shows, for the active profile or the signed-in account: the name, the number of
  attempts, the streak in days, the best score per level, a bar per topic with
  "N of M correct (P%)", and the weakest topics.
- With no attempts it shows "No attempts yet" and a link to start a quiz. Without enough answers
  for the weakest list it shows "Not enough answers yet".
- The header has "Dashboard" and "Logs" links next to the site title link "Java Trainer".

### R15 Logs and JSON export
- `newestFirst(attempts)` returns a copy ordered by `at`, newest first.
- `exportAttemptsJson(profileName, attempts, exportedAt)` returns JSON indented by two spaces for
  `{ profile, exportedAt, attempts }`, where `exportedAt` is an ISO 8601 UTC string.
- `exportFileName(profileName, exportedAt)` is `java-trainer-<slug>-<yyyy-mm-dd>.json`: the slug is
  the lower-case name with every run of characters other than a-z and digits replaced by one dash
  and leading and trailing dashes removed; an empty slug becomes `profile`; the date is the UTC
  date.
- `/logs` lists the attempts newest first (local date and time in the language's locale, level,
  "N of M correct (P%)"). With no attempts it shows "No attempts yet" and no export button;
  otherwise "Export JSON" downloads the file named by `exportFileName`.

### R16 Best score per profile and migration
- Guest best scores are stored per profile under `profileKey("java-trainer-best", profileId)`.
- `mergeBestScores(a, b)` returns a new object with the higher score per level; a level present in
  only one of them is kept.
- `mergeStoredBestScores(profileText, legacyText)` parses both with `parseBestScores` and returns
  the JSON text of their merge.
- Migration: scores under the old global key `java-trainer-best-scores` are merged into the active
  profile's scores when the app loads in guest mode (with the profile switcher), and the old key is
  removed once the write is verified.

### R17 Language selection
- Languages are `en` (English, default) and `uk` (Ukrainian); the choice is browser-wide, not per
  profile or account.
- `detectLanguage(preferred)` returns the language of the first browser language whose primary
  subtag is `uk` or `en` (case-insensitive); otherwise `en`.
- `parseLanguage(raw)` returns `en` or `uk` for exactly that text and `null` otherwise.
- The choice is stored under `java-trainer-language`; on load the stored value wins, otherwise
  `detectLanguage(navigator.languages)` decides. With blocked storage the switcher still works
  until reload.
- The header has a language select ("English", "Українська") left of the account area. Changing it
  updates all text at once and sets the page's `lang` attribute.
- The server renders English; the page switches to the chosen language right after loading (a
  brief flash is accepted).

### R18 Interface text
- All interface text lives in one dictionary per language (`messages.en.ts`, `messages.uk.ts`) and
  is read through `translate(language, key, params)`; `{name}` placeholders are filled from
  `params`. A missing key falls back to English and then to the key; it never throws.
- `translatePlural` picks `key.one|few|many|other` with `Intl.PluralRules` (Ukrainian: 1 and 21 are
  `one`, 2-4 and 22-24 `few`, 5-20 and 25 `many`), falling back to `other`.
- The Ukrainian dictionary is typed by the English keys, so a missing key is a compile error;
  tests check that no value is empty and that both languages use the same placeholders.
- Everything the user sees is translated, including the account pages and every error code
  (`errorMessageKey(code)` maps a code to its message, an unknown code to a generic message).
  Level names stay `Junior`, `Middle`, `Senior`. Not translated: the page title, the stock 404
  page, the export file name and JSON keys, and stored data.

### R19 Question content in Ukrainian
- Every question has a Ukrainian translation `{ text, options (4), explanation }` in
  `questions.uk.ts`, keyed by id. `code` is never translated; Java identifiers stay in English.
- Topics are shown through a topic dictionary per language; a topic without an entry is shown as
  stored.
- `localizeQuestion(question, language)` returns the question unchanged for `en` and with the
  translated text, options and explanation for `uk`; option order and `correctIndex` stay the
  same; a missing translation falls back to English.
- A quiz localizes its questions before shuffling when it starts; changing the language during a
  quiz changes the interface text but not the running questions.
- Tests check that translations exist for exactly the bank's ids, are complete, follow the R2
  length rule, and keep the R2 no-tell bounds for the longest and shortest options.
- The Ukrainian text was written by the agent and reviewed by another agent; it counts as final
  after the author's review.

### R20 Accounts and storage
- An account has `id`, `email` (unique, trimmed and lower-case), `displayName` (1 to 24 characters),
  a password hash and `createdAt`. Per account the server keeps the best score per level and an
  attempt log in the R12 format, capped at 200.
- The database is a SQLite file, `data/app.sqlite` by default, overridable with `DATABASE_FILE`;
  tests use `:memory:`. The folder and schema are created on first use, foreign keys are on, and
  `data/` is git-ignored. Every statement is parameterized; multi-step writes run in a transaction.
- Tables: `users`, `sessions` (token hash, user, expiry), `best_scores` (user, level, percent),
  `attempts` (user, `at`, JSON data) and `login_failures` (email, count, window start); deleting a
  user cascades to its sessions, scores and attempts.

### R21 Input validation
Pure functions return a code, never a message:
- `validateEmail(raw)` trims and lower-cases; valid with 3 to 254 characters, no whitespace,
  exactly one `@`, a non-empty local part and a domain that contains a dot not at its start or end.
  Otherwise `email-invalid`.
- `validatePassword(raw)`: 10 to 128 characters (`password-short`, `password-long`) and not in a
  built-in list of very common passwords, compared in lower case (`password-common`).
- `validateDisplayName(raw)` trims; 1 to 24 characters (`name-empty`, `name-too-long`).

### R22 Password hashing
`hashPassword(password)` returns `scrypt$16384$8$1$<salt>$<hash>` (base64url) with a random 16-byte
salt and a 64-byte key. `verifyPassword(password, stored)` compares in constant time, accepts only
bounded scrypt parameters, and returns `false` for a wrong password or a malformed stored value; it
never throws. Passwords are never stored, returned or logged in clear text.

### R23 Sessions
- `createSession(db, userId, now)` returns a random 32-byte token (base64url); only its SHA-256 hash
  is stored, with the user id and an expiry 30 days after `now`. Creating a session deletes every
  expired session and the user's oldest sessions beyond 10.
- `getSessionUser(db, token, now)` returns the user for a known, unexpired token and `null`
  otherwise; an expired session is deleted when found.
- `deleteSession(db, token)` and `deleteUserSessions(db, userId, exceptToken?)` remove sessions.
- The cookie is `session` with `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` 30 days, and `Secure`
  in production; logging out or deleting the account clears it with `Max-Age=0`.

### R24 Authentication service
- `register({ email, password, displayName })` validates (R21), refuses with
  `too-many-registrations` when 30 or more existing accounts were created in the last hour (checked
  before any hashing), hashes the password, and in one transaction creates the user (or answers
  `email-taken`) and a session.
- `login({ email, password })`: a malformed email gets `invalid-credentials` after a dummy hash and
  is not counted. Otherwise, when the normalized email has 5 failures within 15 minutes, the answer
  is `too-many-attempts`, even for the right password. A wrong password and an unknown email are
  both counted and give the same `invalid-credentials` (a dummy hash keeps the timing similar). A
  success clears the counter and creates a session. Every new failure also deletes expired failure
  rows of all emails.
- `changePassword(userId, current, next, currentToken)` and `deleteAccount(userId, password)` need
  the current password and use the same counter. A password change validates the new password and,
  in one transaction, stores the new hash and deletes every other session of the user. Deleting
  the account removes the user with its sessions, scores and attempts.
- `changeDisplayName(userId, name)` validates like R21 and returns the updated user.
- Only `email-taken` at registration reveals whether an email exists.

### R25 Account data
- `getData(userId)` returns `{ best, attempts }`, attempts oldest first (by `at`, then insertion).
- `recordAttempt(userId, attempt)` validates with the R12 rules (`attempt-invalid` otherwise) and,
  in one transaction, inserts it, raises the level's best score and keeps the newest 200.
- `importData(userId, { best, attempts })` reads at most 200 incoming attempts, drops invalid ones,
  merges them with the stored ones (de-duplicated by `at`, the stored one wins), sorts by `at`, keeps
  the newest 200 and raises the best scores to the per-level maximum, in one transaction.
- Every call uses the user id from the session, never from the request body.

### R26 HTTP API
JSON under `/api`, handled by one route file (`src/app/api/[...path]/route.ts`) that delegates to
`handleApi` in `src/server/api.ts`.

| Method and path | Needs session | Body | Success | Errors |
|---|---|---|---|---|
| POST `/api/auth/register` | no | `{email, password, displayName}` | 201 `{user}` + cookie | 400 code, 409 `email-taken`, 429 `too-many-registrations` |
| POST `/api/auth/login` | no | `{email, password}` | 200 `{user}` + cookie | 401 `invalid-credentials`, 429 `too-many-attempts` |
| POST `/api/auth/logout` | no | none | 200 `{ok: true}` + cleared cookie | none |
| GET `/api/auth/me` | no | none | 200 `{user}`, or `{user: null}` for a guest | none |
| PATCH `/api/auth/me` | yes | `{displayName}` | 200 `{user}` | 400 code, 401 |
| DELETE `/api/auth/me` | yes | `{password}` | 200 `{ok: true}` + cleared cookie | 401, 429 |
| POST `/api/auth/password` | yes | `{current, next}` | 200 `{ok: true}` | 400 code, 401, 429 |
| GET `/api/data` | yes | none | 200 `{best, attempts}` | 401 `not-signed-in` |
| POST `/api/data/attempts` | yes | an attempt | 200 `{ok: true}` | 400 `attempt-invalid`, 401 |
| POST `/api/data/import` | yes | `{best, attempts}` | 200 `{best, attempts}` | 401 |

- Order of checks: an unknown path answers 404 `not-found`; a known path with another method 405
  `method-not-allowed` (only the handler's own properties count). For anything but GET the
  `Origin` header must be present and its host must equal `Host` (else 403 `forbidden-origin`).
  The body may have at most 100 000 bytes (413 `body-too-large`, enforced while reading and from
  `Content-Length`); a non-empty body must be `application/json` (415 `json-required`) and a JSON
  object (400 `body-invalid`); an empty body counts as `{}`. Any exception inside the handler
  answers 500 `internal`.
- Responses carry `Cache-Control: no-store`. Bodies never contain a password hash or a token (the
  token only travels in `Set-Cookie`); error bodies are `{ "error": code }` only. Nothing is logged.

### R27 Account interface and data source
- `AccountProvider` loads `/api/auth/me` and then `/api/data` on start; the session is `loading`,
  `guest` or `signedIn`. Any action answered with `not-signed-in` reloads the session, so a session
  ended elsewhere turns the page into guest mode.
- `callApi` sends JSON with same-origin credentials and returns `{ok, data}` or `{ok: false, error}`;
  a response that is not JSON, has no error code, or a network failure gives `network-error`.
- Header: nothing while loading; a guest sees the profile switcher, "Sign in" and "Create account";
  a signed-in user sees the display name, "Account" and "Sign out".
- Pages `/login`, `/register` and `/account`. `/account` sends a guest to `/login`; `/login` and
  `/register` send a signed-in user to `/account`. Forms disable the submit button while sending,
  clear password fields after sending, use the `email`, `current-password` and `new-password`
  autocomplete values, and show the translated message of each error code; on the account page a
  wrong current password reads "Wrong password." instead of the login message.
- The account page lets the user change the display name, change the password, import the active
  guest profile's best scores and attempts ("Import progress from this browser"; the local data
  stays) and delete the account (a browser confirmation, then the password).
- `useProgress()` returns `{ name, attempts, best }` from the account when signed in, otherwise from
  the active guest profile, and `null` while loading or without a profile. The dashboard, logs,
  best-score labels and the export use it.
- `record(attempt)` saves a finished quiz to the server when signed in and returns `account`. When
  the user is a guest, the session is still loading, or the server save fails, it saves to the
  active guest profile and returns `device`; for a signed-in user the score screen then shows
  "Your account could not be reached, so this result was saved on this device only."

### R28 Security properties
- No SQL is assembled from user input.
- Tokens are random, stored only as hashes, and the cookie is not readable from JavaScript.
- Login throttling, the registration limit and uniform error results follow R24.
- No account can read or change another account's data (R25).
- Instead of CSRF tokens the API relies on `SameSite=Lax`, the `Origin` check and JSON-only bodies
  (R26).

## Known limits
- A failed login is counted per email, so anyone can lock a known email out for 15 minutes.
- There is no per-IP rate limit; the registration limit is global and counts accounts that still
  exist; scrypt runs synchronously.
- Users are not capped; SQLite is one file for one server process (not serverless as is).
- A client can invent the answers of its own attempts (only the numbers must agree).
- A running quiz in a tab survives signing in or out in that tab.
- The first render is English before the stored or detected language is applied.

## Development rules
- Commands: `npm run dev`, `npm run build`, `npm start`, and `npm run check` (lint, `tsc --noEmit`,
  `vitest run`), which must pass before every commit. The pre-commit hook
  (`.githooks/pre-commit`, enabled with `git config core.hooksPath submissions/ivan-mykhalevych/.githooks`)
  runs it for commits that touch the app; `RED_COMMIT=1` skips it only for a test-first commit whose
  tests fail; `--no-verify` is never used.
- Review loop: `npm run loop -- <paths>` (`scripts/review-loop.sh`) repeats gate (`npm run check`),
  read-only review by `.claude/agents/reviewer.md`, then a fix pass by a separate agent, at most
  `MAX_ITER` times (default 3). It stops when the gate is green and the reviewer reports no high or
  medium findings, or when the limit is reached. Every iteration is appended to `docs/loop-log.md`.
  The fixer never edits `docs/spec.md` and never commits; the author reviews the diff and commits.
- Tests: `src/lib/**.test.ts`, `src/server/**.test.ts` and the route test `src/app/api/[...path]/route.test.ts`; server tests use an in-memory database.
  Interface behaviour without unit tests is checked in the browser and by independent QA runs
  (`docs/qa-plan.md`).

## Acceptance scenarios
- Given 3 questions with correct indexes 0,1,2 and answers [0, 2, null], the score is correct 1,
  total 3, percent 33, and the mistakes are question 2 (chosen 2) and question 3 (chosen null).
- Given an empty list, percent is 0.
- Given a bank question whose options are 5 and 50 characters long, the bank test fails.
- Given level `senior`, only senior questions are returned.
- Given a pool of 40 questions, `pickQuiz` returns 12 distinct questions from it, the same 12 for
  the same seed; given a pool of 5, it returns all 5.
- Given any seeded rng, a shuffled question keeps the same option texts and its `correctIndex`
  still points at the original correct text.
- Given a quiz answered up to question 4 and a reload, the quiz continues at question 4; given a
  stored value `{broken`, the start screen appears and the value is deleted.
- Given stored text `{"junior":80,"bogus":50,"middle":"x"}`, the parsed scores are `{ junior: 80 }`;
  given `not json`, they are `{}`.
- Given `{ junior: 80 }`, recording 60 for junior keeps 80, recording 90 gives 90, and the original
  object is unchanged.
- Given stored profiles `Ann` and `ann`, only `Ann` is kept; given an unknown `activeId`, the first
  profile becomes active. Given a 25-character name, `validateProfileName` returns an error; given
  " Bob ", it returns "Bob". Given profile id `p1`, the attempt-log key is `java-trainer-attempts:p1`.
- Given 200 logged attempts, appending one keeps 200 and drops the oldest. Given an attempt whose
  `percent` disagrees with its results, it is dropped.
- Given results Strings 1 of 3 correct and OOP 2 of 2 correct, the mastery is OOP 100 and Strings
  33, and the weakest topic with at least 3 answers is Strings.
- Given attempts today, yesterday and the day before, the streak is 3; today and two days ago only,
  1; only two days ago, 0.
- Given the name "Ann Lee" exported on 2026-09-30, the file name is
  `java-trainer-ann-lee-2026-09-30.json`; given "!!!" it is `java-trainer-profile-2026-09-30.json`.
- Given the old key `{"junior":80}` and a profile holding `{"junior":90,"middle":10}`, after migration
  the profile holds `{"junior":90,"middle":10}` and the old key is gone.
- Given preferred languages `["ru", "uk-UA"]`, `detectLanguage` returns `uk`; `["en-US", "uk"]`
  gives `en`; `[]` or `["fr"]` gives `en`. Given stored text `xx`, `parseLanguage` returns `null`.
- Given Ukrainian, plural forms give "спроба" for 1 and 21, "спроби" for 2 and 23, and "спроб" for
  5, 11 and 25.
- Given Ukrainian and a started quiz, the question text and options are Ukrainian, the code block is
  unchanged, and the originally correct option is still marked correct.
- Given the email "  Ann@Example.COM ", the normalized email is `ann@example.com`; given `no-at`,
  `email-invalid`; given a 9-character password, `password-short`.
- Given a hash of "correct horse battery", `verifyPassword` is true for it, false for another
  password and false for a tampered or malformed stored value.
- Given a session created at time t, the user is found at t + 29 days and not at t + 31 days, and
  the expired session is gone. Given 11 sessions of one user, only the newest 10 remain.
- Given 5 wrong passwords and then the correct one within 15 minutes, the result is
  `too-many-attempts`; after 15 minutes the correct password works.
- Given 30 accounts created within the last hour, the next registration answers 429
  `too-many-registrations`; an hour later it works, and login is never affected.
- Given accounts A and B, B cannot read or change A's data, and deleting A removes all of it.
- Given a POST without a matching `Origin` header, the API answers 403 `forbidden-origin`; given a
  guest, `GET /api/auth/me` answers 200 `{ "user": null }`.

## Out of scope
Spaced repetition, flashcards, timers, languages other than English and Ukrainian, a translated
page title or 404 page, right-to-left layouts. For accounts: email verification, password reset by
email, two-factor authentication, social login, roles or an admin area, rate limiting by IP, and
multi-server deployment.

## Spec changes
- v1.1 (8 October 2026, mentor review): the development rules gain the scripted review loop, so a
  review-fix cycle runs to a stop condition and leaves a log instead of being a manual description.
- v1.0 (2 October 2026, by the author's decision): the spec was rewritten from the code so that both
  agree, and it becomes the single source of truth again: changes go spec first, then a failing
  test, then code. `docs/reference.md` (the code-derived description used on 1 October) was merged
  into this file and removed. Content that only the code had stated is now written here: the
  dropped invalid stored quiz, session housekeeping, transactions, the 500 answer, `Cache-Control`,
  the home page fitting a laptop viewport, the account page's wrong-password message and the
  session reload on `not-signed-in`. The stale R25 note "registration has no rate limit" and the
  R24 function name `updateDisplayName` (the service function is `changeDisplayName`) were
  corrected.
- v0.23 (plan `docs/plan-gap-fixes.md`): R3 keeps a running quiz in `sessionStorage`, R24 and R26 add a global registration limit (429 `too-many-registrations`), R26 makes `GET /api/auth/me` answer 200 `{user: null}` for guests, R27 tells the user when a result was saved on the device only.
- v0.22 (gap fixes): an attempt must agree with its results (R12, applies to guest and account data) and a user keeps at most 10 sessions (R23).
- v0.21 (as-built gaps from a reverse-engineered description of the code): R3, R24, R25 and R27 state five behaviours the code already had: a running quiz was not persisted, malformed login emails are not throttled, forged own scores and unbounded users and sessions were known limits, and a failed server save falls back to the guest profile.
- v0.20 (review and QA fixes): the body limit is enforced while reading, handler errors answer 500 `internal`, expired failure rows and sessions are purged, an attempt holds at most 100 results, and wrong current passwords show their own message.
- v0.19 (R26 detail): request and response shapes, `body-invalid`, 404 and 405 written down before the API was coded.
- v0.18 (accounts, by the author's request): real accounts with a server (R20-R28) next to the guest mode, built on Node's built-in SQLite and scrypt. Email-based flows, 2FA, social login and multi-server hosting stay out of scope.
- v0.17 (QA of the language release): the no-horizontal-overflow rule extends to every page that shows the profile name; Ukrainian wording corrected after a language review.
- v0.16 (Ukrainian questions): R19 applies the length no-tell bounds of R2 to the Ukrainian options.
- v0.15 (question pool): the bank grows from 12 to 40 questions per level and a quiz draws 12 at random, because a fixed set can be memorised; R2 gains statistical no-tell rules, with lower bounds added after the first rewrite showed the opposite tell.
- v0.14 (language support): English and Ukrainian with a language switcher (R17-R19), by the author's request; R10 returns error codes instead of English messages.
- v0.13 (test-and-fix pass): R11 gains the blocked-storage rule; the light theme got an `on-accent` token after a contrast audit (`docs/design.md`).
- v0.12 (final QA run): R11 gains the no-horizontal-overflow rule for the header.
- v0.11 (review fixes): R11 gains safe profile removal and a backup of unreadable profile text.
- v0.10 (slice 7): R16 moves best scores to per-profile keys and migrates the old global key.
- v0.9 (slice 6): R15 adds /logs and the JSON export; the Export button is absent, not disabled, without attempts.
- v0.8 (slice 5): R14 adds the /dashboard page and a Dashboard header link.
- v0.7 (slice 4): R13 adds progress logic (mastery per topic, weakest topics, streak).
- v0.6 (slice 3): R12 adds the per-profile attempt log, capped at 200 entries.
- v0.5 (slice 2): R11 adds the header profile switcher and the per-profile storage key format.
- v0.4 (slice 1): local named profiles without passwords (R10).
- v0.3: R5 gains a keyboard-focus rule and R6 shows the code snippet in the review, from the independent QA run.
- v0.2: best scores per level in localStorage (R8), by the author's decision.
- v0.1: first version, written before the application code.
