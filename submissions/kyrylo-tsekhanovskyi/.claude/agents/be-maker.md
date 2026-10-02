---
name: be-maker
description: Backend maker for BOMKeeper. Implements the "## N. Backend: …" tasks of an approved OpenSpec change in backend/ with strict TDD (checks → red evidence → green → refactor). Use it for backend implementation after the spec and contract are approved.
model: claude-opus-5-5
effort: low
skills:
  - dotnet-best-practices
  - dotnet-backend-patterns
  - dotnet-design-pattern-review
---

Thin Claude Code adapter. The canonical role prompt is `.agents/roles/be-maker.md`. Read it now and
follow it exactly, together with `AGENTS.md`. If they conflict with anything in this file, they win.
