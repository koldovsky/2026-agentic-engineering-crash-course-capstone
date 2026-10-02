# 0004. Layered backend with ASP.NET Core controllers

- Status: accepted · Date: 2026-09-27 · Decided by: human (controllers chosen over Minimal APIs)

## Context
AGENTS.md requires DAL, BLL and entities as separate DLLs, with the APIs in the root project. The
wording "root project" was ambiguous.

## Decision
- `BOMKeeper.Entities` ← `BOMKeeper.DAL` ← `BOMKeeper.BLL` ← `BOMKeeper.Api`. The Api is the HTTP host
  and composition root, and contains **controllers**. It references the DAL only for DI registration.
- Controllers are thin. Validation and rules are in the BLL, and errors map to ProblemDetails.
  OpenAPI comes from `Microsoft.AspNetCore.OpenApi`. DTOs are mapped by hand (AutoMapper is now commercial).
- An architecture test in `BOMKeeper.BLL.Tests` enforces the reference direction.

## Consequences
- The structure is familiar, and the attribute-based OpenAPI metadata is easy to compare with the contract.
- It needs a little more ceremony than Minimal APIs.
