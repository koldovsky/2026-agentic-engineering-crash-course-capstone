#!/usr/bin/env bash
set -euo pipefail

source_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
temp_root="$(mktemp -d)"
trap 'rm -rf "$temp_root"' EXIT

run_mutation() {
  local name="$1"
  local mutation="$2"
  local copy="$temp_root/$name"
  cp -R "$source_root" "$copy"
  case "$mutation" in
    missing)
      rm "$copy/docs/specification.md"
      ;;
    domain)
      printf '\n%s\n' "$(printf '%s' 'cHJpdmF0ZS1kb21haW4tbWFya2VyOiBudWJpcA==' | base64 --decode)" >> "$copy/README.md"
      ;;
    evidence)
      printf 'changed' >> "$copy/evidence/dashboard-after.png"
      ;;
    factory)
      rm "$copy/factory/roles/checker.md"
      ;;
    env)
      cp "$copy/.editorconfig" "$copy/.env.synthetic-fixture"
      ;;
    media)
      cp "$copy/.editorconfig" "$copy/obsolete-video.mp4"
      ;;
    traceability)
      sed '/FR-08/d' "$copy/docs/traceability.md" > "$copy/docs/traceability.md.tmp"
      mv "$copy/docs/traceability.md.tmp" "$copy/docs/traceability.md"
      ;;
  esac
  if (cd "$copy" && ALLOW_VIDEO_TODO=1 ALLOW_PENDING_REVIEW=1 bash scripts/verify-package.sh >/dev/null 2>&1); then
    echo "Gate self-test failed: mutation '$name' was not detected." >&2
    exit 1
  fi
  echo "Detected expected mutation: $name"
}

run_mutation missing-required-artifact missing
run_mutation forbidden-domain-marker domain
run_mutation changed-evidence evidence
run_mutation missing-independent-checker factory
run_mutation environment-file env
run_mutation forbidden-media media
run_mutation diagnostic-traceability traceability

echo "All gate self-tests passed."
