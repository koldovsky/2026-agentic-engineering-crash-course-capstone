---
description: DateHelper.secondsToMs argument must not exceed 30 without explicit user permission
globs: "**/*.ts"
alwaysApply: false
paths:
  - "**/*.ts"
---

# DateHelper.secondsToMs — max 30 seconds

Never call `DateHelper.secondsToMs(n)` with **n greater than 30** unless the user explicitly allowed that value in the current request.

```ts
// ❌
DateHelper.secondsToMs(45);
DateHelper.secondsToMs(60);
DateHelper.secondsToMs(90);
test.setTimeout(DateHelper.secondsToMs(120));

// ✅
DateHelper.secondsToMs(15);
DateHelper.secondsToMs(30);
test.setTimeout(DateHelper.minutesToMs(2));
```

For longer waits, use `DateHelper.minutesToMs(...)`. Existing call sites above 30 are inherited debt. Do not copy them.
