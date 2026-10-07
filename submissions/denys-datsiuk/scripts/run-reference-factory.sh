#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fixture="$root/factory/fixtures/dotnet-sample"
run_dir="$root/factory/runs/REF-001"
evidence="$run_dir/evidence"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

mkdir -p "$evidence"
tar --exclude=bin --exclude=obj --exclude=TestResults -C "$fixture" -cf - . | tar -C "$work" -xf -

(
  cd "$work"
  git init -q
  git config user.name 'Synthetic Maker'
  git config user.email 'maker@invalid.local'
  git add .
  git commit -qm baseline

  # The Maker subprocess creates a bounded, reviewable diff. The comments are
  # deliberately behavior-neutral: this run validates factory controls, while
  # the fixture tests validate the dashboard behavior.
  printf '\n// REF-001: verified by the executable factory reference run.\n' >> src/OperationsDashboard/DashboardQuery.cs
  printf '\n// REF-001: focused and invariant coverage executed by the factory.\n' >> tests/OperationsDashboard.Tests/DashboardPolicyTests.cs
  printf '\nREF-001 revalidated these requirements using the synthetic fixture.\n' >> docs/specification.md
  printf '\nREF-001 evidence is stored under `factory/runs/REF-001/evidence`.\n' >> docs/traceability.md

  AGENT_SCOPE_FILE=scope.allowlist AGENT_DENY_FILE=.agent-deny-paths \
    bash "$root/factory/templates/dotnet-project/scripts/check-agent-policy.sh" \
    > "$evidence/01-policy.txt" 2>&1

  export DOTNET_CLI_HOME="${DOTNET_CLI_HOME:-$root/.dotnet-home}"
  export DOTNET_CLI_TELEMETRY_OPTOUT=1
  dotnet restore FactoryFixture.sln --locked-mode --ignore-failed-sources -p:NuGetAudit=false \
    > "$evidence/02-restore.txt" 2>&1
  dotnet build FactoryFixture.sln -c Release --no-restore --warnaserror \
    > "$evidence/03-build.txt" 2>&1
  dotnet test FactoryFixture.sln -c Release --no-build --filter 'Category=Focused' --logger 'console;verbosity=minimal' \
    > "$evidence/04-focused-tests.txt" 2>&1
  dotnet test FactoryFixture.sln -c Release --no-build --filter 'Category!=LiveIntegration' --logger 'console;verbosity=minimal' \
    > "$evidence/05-non-live-tests.txt" 2>&1
  git diff --check > "$evidence/06-diff-check.txt" 2>&1
  git diff --name-only > "$evidence/07-changed-files.txt"
)

# Evidence must be portable and must not disclose host-specific temporary paths.
python3 - "$evidence" "$work" <<'SANITIZE'
import pathlib, sys
folder, workspace = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
for log in folder.glob('0*.txt'):
    text = log.read_text()
    for prefix in {str(workspace), str(workspace.resolve())}:
        text = text.replace(prefix, '<isolated-workspace>')
    log.write_text(text)
SANITIZE

grep -q 'Agent policy checks passed' "$evidence/01-policy.txt"
grep -q 'Build succeeded' "$evidence/03-build.txt"
grep -Eq 'Passed:[[:space:]]+2' "$evidence/04-focused-tests.txt"
grep -Eq 'Passed:[[:space:]]+4' "$evidence/05-non-live-tests.txt"
expected=$'docs/specification.md\ndocs/traceability.md\nsrc/OperationsDashboard/DashboardQuery.cs\ntests/OperationsDashboard.Tests/DashboardPolicyTests.cs'
[[ "$(cat "$evidence/07-changed-files.txt")" == "$expected" ]]

(
  cd "$evidence"
  shasum -a 256 0*.txt > manifest.sha256
  shasum -a 256 -c manifest.sha256 >/dev/null
)

cat > "$run_dir/check-report.md" <<'REPORT'
# Independent Checker Report — REF-001

**Verdict:** PASS

- scope allowlist and deny policy: PASS;
- locked restore: PASS;
- Release build with warnings as errors: PASS;
- focused tests: 2 passed, 0 failed;
- non-live tests: 4 passed, 0 failed;
- diff check and evidence hashes: PASS.

The Checker is deterministic and runs after the Maker subprocess. This proves the public control kit is executable. It does not claim that an LLM independently understood private domain semantics.
REPORT

echo 'REF-001 completed: PASS'
