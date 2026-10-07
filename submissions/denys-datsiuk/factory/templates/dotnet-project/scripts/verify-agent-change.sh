#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$repo_root"

configuration="${DOTNET_CONFIGURATION:-Release}"
focused_filter="${FOCUSED_TEST_FILTER:-}"
non_live_filter="${NON_LIVE_TEST_FILTER:-Category!=LiveIntegration}"
[[ -n "$focused_filter" ]] || { echo "STOP: FOCUSED_TEST_FILTER is required." >&2; exit 1; }
results="$(mktemp -d)"
trap 'rm -rf "$results"' EXIT

"$script_dir/check-agent-policy.sh"

solutions="$(find . -maxdepth 3 \( -name '*.sln' -o -name '*.slnx' \) -print)"
solution_count="$(printf '%s\n' "$solutions" | grep -c . || true)"
[[ "$solution_count" == 1 ]] || { echo "Expected exactly one solution; set an explicit repository verifier for this layout." >&2; exit 1; }
solution="$(printf '%s\n' "$solutions" | sed -n '1p')"

dotnet restore "$solution" --locked-mode -p:NuGetAudit=false
dotnet build "$solution" --configuration "$configuration" --no-restore --warnaserror

if [[ -n "$focused_filter" ]]; then
  dotnet test "$solution" --configuration "$configuration" --no-build --filter "$focused_filter" --logger 'console;verbosity=minimal' --logger trx --results-directory "$results/focused"
  python3 "$script_dir/test-results.py" "$results/focused"
else
  echo "STOP: FOCUSED_TEST_FILTER is required for an agent change." >&2
  exit 1
fi

dotnet test "$solution" --configuration "$configuration" --no-build --filter "$non_live_filter" --logger 'console;verbosity=minimal' --logger trx --results-directory "$results/non-live"
python3 "$script_dir/test-results.py" "$results/non-live"

echo "Agent change checks passed. Live or environment-dependent tests may still require a separately approved run."
