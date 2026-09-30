<!--
Keep the headings and the field names in English.
Write the title, the field values and the section bodies in Russian. The team reads Jira in Russian.
On the "Draft status" line, write the two Russian values without the «» marks.
-->

# <Short title in Russian: what is broken and where>

**Draft status:** «не заведён в Jira» · **Draft author:** «агент», reviewed by: <name>

| Field | Value |
|---|---|
| Environment | stage · <date and time of the run> |
| Module | LMS / Admin Panel → <section> |
| Severity | Blocker / Critical / Major / Minor — <one sentence: why> |
| Test case | PRJ-TC-<n> |
| Autotest | `<spec>:<line>` — «<test title>» |
| Reproducibility | <n>/3 runs, `--repeat-each=3` |
| Possible duplicates | <keys from the Jira search, or «не найдено», or «поиск не выполнен: <reason>»> |

## Steps to reproduce

1. <user step in the product>
2. …

## Expected result

<from the test case>

## Actual result

<what the application showed>

```
<first lines of the autotest error>
```

## Evidence

- video: `<path>`
- page context at the moment of failure: `<path>`
- step where the test failed: <step path>

## Notes for the developer

<optional: what is already excluded — environment, test data, flakes>
