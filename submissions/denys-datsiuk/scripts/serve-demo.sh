#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
port="${DEMO_PORT:-8080}"

echo "Synthetic demo: http://127.0.0.1:$port/evidence/mockup/demo.html"
echo "Press Ctrl+C to stop. No application backend or production data is used."
python3 -m http.server "$port" --bind 127.0.0.1 --directory "$root"
