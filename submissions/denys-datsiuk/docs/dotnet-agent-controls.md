# Practical Agent Controls for the Private .NET Repository

This is a portable control set, not evidence that the public package can execute the private solution. Copy `factory/templates/dotnet-project/` into the private repository, replace the explicit placeholders, and review the first run manually.

## Control Layers

| Layer | Control | Enforcement |
|---|---|---|
| Tool access | Deny reads of secrets and production exports | Agent sandbox or tool permission policy |
| Repository rules | Require read-only discovery, bounded scope, spec updates, and truthful verification | `AGENTS.md` |
| Scope | Reject changed files outside an approved allowlist | `scripts/verify-agent-change.sh` |
| Secrets | Reject sensitive filenames and secret-like added lines | Verification script and pre-commit/CI |
| Correctness | Restore, build, focused tests, then non-live regression tests | Verification script |
| Documentation | Require spec/ADR updates when behavior or architecture changes | Verification script plus review |
| Independence | Maker cannot approve its own change | Fresh checker context and protected PR review |
| Execution isolation | No network, no capabilities, read-only container root, bounded resources | Docker sandbox wrapper |

## Important Limitation

An instruction such as “do not open `.env`” is not a security boundary. Enforce it in the agent runtime by denying file reads for `.env*`, key stores, exports, backups, and production logs. The repository script prevents these files from being changed or committed, but it cannot prove that another process never read them.

The portable verifier includes untracked, staged and unstaged paths, applies the deny file before reading any candidate content, and accepts only exact files or explicit trailing-slash directory prefixes. Source changes require both specification and traceability updates. Ignored files remain outside candidate-diff checks; the sandbox excludes them by deny patterns. TRX validation rejects empty test phases even when `dotnet test` exits successfully.

## Adoption

1. Replace the example solution and test paths in the template `AGENTS.md`.
2. Replace `scope.allowlist` entries for each task; never use a repository-wide wildcard.
3. Set focused test filters appropriate to the changed component.
4. Run the verifier locally and in CI.
5. Require a fresh checker review for high-risk synchronization, identity, calibration, or migration changes.

## Offline Execution

The Docker profile runs only build and test commands. It receives a temporary sanitized workspace and a read-only, pre-populated NuGet cache. Runtime networking is disabled. A cloud model cannot run inside this profile; the controller remains outside and delegates execution to it. See `factory/templates/dotnet-project/docker/README.md`.
