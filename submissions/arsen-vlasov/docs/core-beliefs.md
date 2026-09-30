# Core beliefs

These are the principles that every rule, skill and check in this repository comes from. Each line
gives the rule and the reason. When a new rule does not follow from one of these, add the principle
here first.

## About the tests

1. **A spec is a scenario.** It holds steps and `should*` calls. Assertions live in page objects and
   helpers. The reason: a reader sees what the test does without the details of how it checks.
2. **A test that cannot fail proves nothing.** Every new test gets one mutation run:
   1. Change one expected value.
   2. See the test fail on that check.
   3. Revert the change.
3. **An absence needs a hold, not a retry.** `toPass` passes as soon as the value is right. It cannot
   show that a counter does not change later. Read the value again for a fixed time window.
4. **Zero is not a pass.** A run with 0 executed tests, or a comparison of zeros with zeros, is
   NOT-EARNED. It is not green.
5. **One user per spec file.** Each Admin Panel spec gets its own manager. Parallel specs must not change
   each other's counters.
6. **The test case decides what the test checks.** When the test case and the story disagree:
   1. Stop.
   2. Show both texts.
   3. Let the human decide.

   Probe the real system first if that helps the decision.

## About the agent's work

7. **Run the check before you claim it passes.** `npm run check` is the source of truth. A claim without
   the output is worse than no claim.
8. **Measure. Do not guess a third time.** After two wrong hypotheses, add a diagnostic and read the data.
9. **An id in a URL is not a key.** AIO `caseId` is an internal record id. Read the key from the page or
   ask for it.
10. **Stop at a refusal.** When a guard, a permission rule or a classifier blocks an action, do not search
    for a second path to the same result. Report it and let the human decide.
11. **The checker is not the maker.** A different agent, with a different model and read-only access,
    reviews a new spec against its test case.
12. **Record the mistakes.** A log where the agent never failed shows nothing. Record where the agent was
    wrong and what changed because of it.

## About the documents

13. **AGENTS.md is a map.** It holds pointers and stays at 100 lines or fewer. Details live in `docs/`,
    in rules and in skills.
14. **English, in plain structure.** Every harness and doc text is English. It passes the ASD-STE100
    skill after each change. Product UI strings, role names and test titles stay as they are, because
    they are data.
