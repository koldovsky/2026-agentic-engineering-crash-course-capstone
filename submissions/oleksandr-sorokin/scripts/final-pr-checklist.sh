#!/usr/bin/env bash
# Read-only checklist before opening the final PR. Changes nothing; exits 1 on the first failed check.
# Run from submissions/oleksandr-sorokin: bash scripts/final-pr-checklist.sh
set -uo pipefail
cd "$(dirname "$0")/.."               # -> submissions/oleksandr-sorokin
SUB_DIR="submissions/oleksandr-sorokin"
fail=0
say()  { printf '%-42s %s\n' "$1" "$2"; }
ok()   { say "$1" "OK"; }
bad()  { say "$1" "FAIL — $2"; fail=1; }

cd ../..                              # -> repo root
branch="$(git branch --show-current)"
[ "$branch" = "oleksandr-sorokin" ] && ok "on oleksandr-sorokin" || bad "on oleksandr-sorokin" "current branch is '$branch'"

[ -z "$(git status --short)" ] && ok "working tree clean" || bad "working tree clean" "commit or stash first"

git fetch origin >/dev/null 2>&1 && ok "fetched origin" || bad "fetched origin" "check network / remote URL"

outside="$(git diff --stat origin/main...HEAD -- . ":!$SUB_DIR" 2>/dev/null)"
[ -z "$outside" ] && ok "no changes outside $SUB_DIR" || bad "no changes outside $SUB_DIR" "found: $outside"

[ -f "$SUB_DIR/docs/evidence.md" ] && ok "docs/evidence.md exists" || bad "docs/evidence.md exists" "run Step 11 first"
[ -f "$SUB_DIR/docs/evidence/pr-log.md" ] && ok "docs/evidence/pr-log.md exists" || bad "docs/evidence/pr-log.md exists" "missing"
[ -f "$SUB_DIR/README.md" ] && ok "submission README.md exists" || bad "submission README.md exists" "missing"

cd "$SUB_DIR"
pnpm check  >/tmp/final-check.log 2>&1  && ok "pnpm check"  || bad "pnpm check"  "see /tmp/final-check.log"
pnpm build  >/tmp/final-build.log 2>&1  && ok "pnpm build"  || bad "pnpm build"  "see /tmp/final-build.log"
pnpm test:e2e >/tmp/final-e2e.log 2>&1  && ok "pnpm test:e2e" || bad "pnpm test:e2e" "see /tmp/final-e2e.log"

echo
if [ "$fail" -eq 0 ]; then
  echo "All checks passed. Open the PR with:"
  echo
  echo "  gh pr create --repo koldovsky/2026-agentic-engineering-crash-course-capstone \\"
  echo "    --base main --head ps1on1ck:oleksandr-sorokin \\"
  echo "    --title \"Capstone: Oleksandr Sorokin — ETF Dashboard\" --web"
  echo
  echo "--web opens the browser with the course's PR template pre-filled — fill it from docs/evidence.md"
  echo "and docs/evidence/pr-log.md, add the video link, then submit by hand. Do not merge."
else
  echo "Fix the FAIL lines above before opening the final PR."
fi
exit "$fail"
