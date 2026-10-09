# Java Interview Prep

A small web app for **practising Java interview questions**. Pick a level, answer short
multiple-choice questions, read the explanation after each one, and watch your progress grow.
It is a *trainer*, not an interview simulator: no timers, no pressure, just practice.

The interface and all questions are available in **English and Ukrainian**.

## What it does

- **Three levels:** junior, middle and senior, with 40 questions each (120 in total) on topics such as
  language basics, collections, concurrency, streams, the JVM, Spring and JPA. Some questions come
  with a code snippet.
- **Short quizzes:** every quiz draws 12 random questions from the level and shuffles the answer
  options, so you cannot memorise a fixed set. The correct answer is not predictable by its length
  or position (this is checked by automated tests).
- **Instant feedback:** after each answer you see whether it was right and why.
- **Mistakes review:** at the end you get your score and a list of what you missed, with the
  correct answers, the explanations and the code.
- **Progress dashboard:** best score per level, mastery by topic, your weakest topics, the number of
  attempts and your practice streak (consecutive days).
- **Attempt log:** every finished quiz is recorded; you can export the log as a JSON file.
- **Two languages:** English or Ukrainian, chosen from your browser language and switchable at any time.
- **Works without sign-up:** use it as a guest with local profiles, or create an optional account
  to keep your progress on the server.
- **Light and dark theme** (follows your system) and a layout that works on a phone.

## Quick start

You need **Node.js 24** (the version the project is developed and tested on) and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Other commands:

| Command | What it does |
|---|---|
| `npm run check` | Lint, type check and all tests (about 300). Run this before committing. |
| `npm run build` then `npm start` | Production build and server. |
| `npm run lint`, `npm run typecheck`, `npm test` | The three parts of `check` on their own. |

## How to use it

### As a guest (no sign-up)
1. On the home page choose **Junior**, **Middle** or **Senior** and press **Start quiz**.
2. Pick an answer for each of the 12 questions. After you answer, the explanation appears;
   press **Next** to continue.
3. At the end you see your score and the **mistakes review**. Press **Try again** for a new random
   set, or **Choose another level**.
4. Open **Dashboard** to see your best scores, mastery by topic, weakest topics and streak, and
   **Logs** to see every attempt. **Export JSON** in the logs downloads them as a file.
5. Use the profile menu in the header to keep several people (or goals) apart: add a profile,
   switch between them or remove one. Each profile has its own scores and log. You can have up to
   10 profiles with names of up to 24 characters.
6. Use the language menu in the header to switch between English and Ukrainian.

If you reload the page in the middle of a quiz, the quiz continues where you left off.

Guest data is stored **in your browser** (local storage). Clearing the site data removes it.

### With an account (optional)
An account keeps your progress on the server, so you can continue on another device.

1. Choose **Create account** in the header and enter an email, a display name (up to 24
   characters) and a password (at least 10 characters, not a very common one).
2. Take quizzes as usual. Results are saved to your account, and the dashboard and logs show
   the account data.
3. Open **Account** in the header to change your display name or password, to
   **import the progress of your guest profile** from this browser (your local data stays), or to
   delete the account and all its data.
4. **Sign out** ends the session. After five wrong passwords for one email the sign-in is blocked
   for 15 minutes.

If your account cannot be reached when a quiz ends, the result is saved on this device instead and
the score screen tells you so.

## Where the data lives

| Data | Where |
|---|---|
| Guest profiles, scores, logs, language choice | your browser (local storage) |
| A quiz in progress | your browser tab (session storage) |
| Accounts, sessions, scores and logs of signed-in users | a SQLite file, `data/app.sqlite` by default |

Set the environment variable `DATABASE_FILE` to use another file. The `data/` folder is
git-ignored. To start with an empty database, stop the server and delete the file.

## Good to know

- Accounts use Node's built-in `node:sqlite`, which prints an "experimental" warning. It is harmless.
- In production mode the session cookie is `Secure`; use `npm run dev` or HTTPS to try accounts.
- The database is a single file, so the app runs as one server process (it is not meant for
  serverless hosting as is).
- Not included on purpose: password reset by email, email verification, social login, rate limiting
  by IP address. See the known limits in `docs/qa-plan.md`.
- If the page says local storage is blocked, allow site data for the page; guest progress cannot
  be saved without it.

## How it was built

The project is a capstone of the Agentic Engineering course and was built with Claude Code:

- **One source of truth:** the specification, `docs/spec.md` (R1 to R28). It was rewritten from the
  code so both agree; every change now starts in the spec, then a failing test, then the code.
- **Tests first:** each slice has a failing-test commit followed by a passing one. A pre-commit hook
  runs `npm run check`. Enable it once per clone:
  `git config core.hooksPath submissions/ivan-mykhalevych/.githooks`
- **Checker is not the maker:** separate agents reviewed the code and the question bank and
  tested the running app in a browser, including a security review of the accounts. Their findings and
  the fixes are in `docs/qa-plan.md`.
- **One simple rule:** KISS. Agent rules are in `AGENTS.md`.

## Documentation map

| File | What is in it |
|---|---|
| `docs/spec.md` | The specification: every requirement, known limits and the change log (single source of truth) |
| `docs/design.md` | Design rules and rationale (colour values are in `src/app/globals.css`) |
| `docs/qa-plan.md` | Reviews, QA runs, findings and decisions |
| `docs/capstone-dod.md` | The course assignment and the Definition of Done with proof |
| `docs/plan-gap-fixes.md` | The plan for closing the last gaps found in the code |
| `docs/pr-description.md` | The text for the pull request |

## Project layout

```
src/app          pages (home, quiz, dashboard, logs, login, register, account) and the API route
src/components   interface components
src/lib          quiz logic, question bank, translations, local storage, client code for accounts
src/server       accounts: passwords, sessions, database, data and the HTTP handler
docs             specification, design rules, plans and reports
```
