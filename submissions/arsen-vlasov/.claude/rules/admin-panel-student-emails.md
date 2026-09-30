---
description: Unique email local-part for an LMS user searched in the Admin Panel
globs: test-data/users/static/**,test-data/admin/**,tests/specs/regression/admin-panel/**
alwaysApply: false
paths:
  - "test-data/users/static/**"
  - "test-data/admin/**"
  - "tests/specs/regression/admin-panel/**"
---

# LMS user email for Admin Panel search

Student search is a substring/prefix match on the local-part (all text before `@`). A shorter email also matches a longer email that starts with the same text.

Always add a unique suffix before the `@` (4-6 latin characters or digits). The local-part must **not** be a prefix of any other email in `stage.json`.

```
❌ static-admin-pro-deactivate@example.com
   static-admin-pro-deactivate-comment@example.com
   searching for deactivate@ matches both

✅ static-admin-pro-deactivate-wk2n8@example.com
   static-admin-pro-deactivate-comment-p9q3@example.com
```

The same rule applies to `static-pro-home-active-advanced` and `…-advanced-course`.
A semantic suffix (`-comment`, `-course`) does not work. It does not make the shorter address unique.
The JSON key may stay semantic. Only the email must be unique.
