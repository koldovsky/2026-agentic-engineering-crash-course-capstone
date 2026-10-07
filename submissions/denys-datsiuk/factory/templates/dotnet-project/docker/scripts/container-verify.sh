#!/usr/bin/env bash
set -euo pipefail

configuration="${DOTNET_CONFIGURATION:-Release}"
focused_filter="${FOCUSED_TEST_FILTER:?FOCUSED_TEST_FILTER is required}"
non_live_filter="${NON_LIVE_TEST_FILTER:-Category!=LiveIntegration}"

solutions="$(find /workspace -maxdepth 3 \( -name '*.sln' -o -name '*.slnx' \) -print)"
count="$(printf '%s\n' "$solutions" | grep -c . || true)"
[[ "$count" == 1 ]] || { echo "Expected exactly one solution in sandbox." >&2; exit 1; }
solution="$(printf '%s\n' "$solutions" | sed -n '1p')"
results="$(mktemp -d)"
trap 'rm -rf "$results"' EXIT

dotnet restore "$solution" --locked-mode --ignore-failed-sources -p:NuGetAudit=false
dotnet build "$solution" --configuration "$configuration" --no-restore --warnaserror
dotnet test "$solution" --configuration "$configuration" --no-build \
  --filter "$focused_filter" --logger 'console;verbosity=minimal' --logger trx --results-directory "$results/focused"
python3 /usr/local/lib/agent-policy/test-results.py "$results/focused"
dotnet test "$solution" --configuration "$configuration" --no-build \
  --filter "$non_live_filter" --logger 'console;verbosity=minimal' --logger trx --results-directory "$results/non-live"
python3 /usr/local/lib/agent-policy/test-results.py "$results/non-live"

echo "Offline .NET verification passed. Environment-dependent tests remain excluded."
