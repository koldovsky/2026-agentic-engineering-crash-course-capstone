#!/usr/bin/env bash
set -euo pipefail

package_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
root="$(git -C "$package_root" rev-parse --show-toplevel)"
hooks="$package_root/.githooks"
current="$(git -C "$root" config --get core.hooksPath || true)"
[[ -z "$current" || "$current" == "$hooks" ]] || { echo "STOP: existing hooksPath differs; review before replacing it." >&2; exit 1; }
git -C "$root" config core.hooksPath "$hooks"
echo "Configured submission-specific repository hooks."
