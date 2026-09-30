---
name: bug-report
description: >-
  Triage a failed autotest. If it is a product bug, write a bug report draft with
  evidence to docs/bugs/. It re-runs the test to decide: product bug, test bug,
  environment, or flake. It collects the error, the failing step and the attachments
  with a script. It searches Jira for duplicates, read-only. Use it when a test failed
  locally or in Jenkins and someone asks whether it is a bug, to write a bug, to report
  a defect, or to investigate a red test.
---

# Bug report from a failed autotest

The output is a **draft file**. A human files it in Jira. Never create or edit a Jira issue.

## 1. Collect the evidence (script, not by eye)

`allure-results/` holds tens of thousands of files from every local run. Do not read it.

```bash
node .claude/skills/bug-report/scripts/collect-evidence.mjs --grep <spec or test name> [--hours 72]
```

For each failed test, it prints the newest real run:

- spec:line
- the linked TC
- the failing step path
- the first lines of the error
- the attachment files (video, error-context, stdout)

Exit 1 means that nothing matched. Make `--hours` larger, or run the spec first.

A failure from Jenkins comes from the `jenkins-verify` skill instead. For such a failure, continue from §2.

If there is an `error-context` attachment, read it. It holds the page snapshot at the moment of failure.

## 2. Re-run before judging

```bash
ENV=stage HEADLESS=true npx playwright test <spec>:<line> --repeat-each=3
```

Never run it on `prod`. After the re-run, run the collector again to get the fresh evidence.

## 3. Classify

| Verdict | What the evidence looks like | What to do |
|---|---|---|
| **Product bug** | 3/3 runs fail on the same step. The assertion compares a business value (count, text, status, amount), and the app shows the wrong value. The same thing happens by hand (Playwright MCP or the UI) | §4 |
| **Test bug** | The test does not find the locator after a UI change. The test data is wrong or used up. The test depends on another test or on the order. The expectation contradicts the TC | Not a bug report. Fix the test through `ui-autotest` / `api-test`. Say so |
| **Environment** | 5xx or timeouts on navigation or API across unrelated steps. Stage or a dependency is down. Auth service errors | No bug report. Report which service, when, and the error line |
| **Flake** | 1–2 of 3 runs fail, or the step that fails changes between runs | No bug report. Report the pass rate and the unstable step. It is a test-stability task |

Write the verdict and its evidence in two or three sentences **before** anything else.
If you are not sure whether it is a product bug or a test bug, say so. Then ask.
Do not guess towards "product bug".

## 4. Look for a duplicate (read-only)

Search Jira through the `atlassian` MCP with JQL. For example:
`project = PRJ AND issuetype = Bug AND statusCategory != Done AND text ~ "<two or three key words>"`.
List what you found, with keys and titles. If Atlassian is not authorised, say that you did not do
the duplicate check. Never skip it silently.

## 5. Write the draft

File: `docs/bugs/<YYYY-MM-DD>-<short-slug>.md`, from [template.md](template.md).

- Keep the template headings and field names in English.
- Write the bug text in Russian: the title, the field values and the section bodies. The team reads
  Jira in Russian.
- Copy UI strings exactly as they are on screen.
- Steps to reproduce are the **user's** steps in the product, not the test code.
- The expected result comes from the TC. Link the TC. The actual result comes from the evidence.
- Attach the paths to the video and the error-context from §1. Do not paste them inline.
- Remove tokens, passwords and personal data from anything you quote (`Bearer …` → `Bearer <redacted>`).
- Name test users by their key (`user_TC_84_admin`), never by email.

## Before showing the result

- [ ] Verdict and its evidence stated first
- [ ] Re-run done: pass rate `n/3` reported
- [ ] Duplicate search done, or its absence stated
- [ ] Draft in `docs/bugs/`, from the template, bug text in Russian, no secrets or personal data
- [ ] Nothing created or changed in Jira or AIO Tests
