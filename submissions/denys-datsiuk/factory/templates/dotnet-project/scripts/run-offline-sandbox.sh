#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
image="${AGENT_SANDBOX_IMAGE:-private-dotnet-agent-sandbox:local}"
deny_file="${AGENT_DENY_FILE:-$repo_root/.agent-deny-paths}"

[[ -s "$deny_file" ]] || { echo "Missing deny-path file: $deny_file" >&2; exit 1; }
"$script_dir/check-agent-policy.sh"

sandbox_root="$(mktemp -d)"
trap 'rm -rf "$sandbox_root"' EXIT
workspace="$sandbox_root/workspace"
mkdir -p "$workspace"

python3 "$script_dir/path-policy.py" --stage-root "$repo_root" --stage-destination "$workspace" --deny-file "$deny_file"

if find "$workspace" -type l -print -quit | grep -q .; then
  echo "STOP: symlink entered sandbox staging." >&2
  exit 1
fi

if find "$workspace" -type f | grep -Ei '/(\.env([^/]*)?|appsettings\.[^/]+\.json|secrets?\.json|[^/]+\.(pfx|p12|pem|key|bak|dump|sql|log))$' | grep -q .; then
  echo "STOP: sensitive file entered sandbox staging." >&2
  exit 1
fi

docker run --rm \
  --network none \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=256m \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --pids-limit 256 \
  --memory "${AGENT_MEMORY_LIMIT:-4g}" \
  --cpus "${AGENT_CPU_LIMIT:-2}" \
  --user "$(id -u):$(id -g)" \
  -e DOTNET_CONFIGURATION="${DOTNET_CONFIGURATION:-Release}" \
  -e FOCUSED_TEST_FILTER="${FOCUSED_TEST_FILTER:?FOCUSED_TEST_FILTER is required}" \
  -e NON_LIVE_TEST_FILTER="${NON_LIVE_TEST_FILTER:-Category!=LiveIntegration}" \
  -v "$workspace:/workspace:rw" \
  -v "${NUGET_CACHE:?Set NUGET_CACHE to an approved pre-populated package cache}:/nuget:ro" \
  "$image"
