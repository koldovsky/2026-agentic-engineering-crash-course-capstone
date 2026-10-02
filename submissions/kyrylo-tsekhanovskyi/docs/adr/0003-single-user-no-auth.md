# 0003. Single user, no authentication in MVP-1

- Status: accepted · Date: 2026-09-27 · Decided by: human

## Context
MVP-1 is a personal tool that runs locally through the Aspire AppHost.

## Decision
There are no users, logins or ownership columns. The API is open on the local machine.

## Consequences
- This removes a large amount of scope (identity, tokens, per-user data filtering).
- The app must not be exposed to a network as-is. Adding auth later is a change that needs a data
  migration (an owner column).
