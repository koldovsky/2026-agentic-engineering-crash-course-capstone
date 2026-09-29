#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd -- "${script_dir}/.." && pwd)"

cd "${project_dir}"

printf '%s\n' 'Varto current verification'
printf '%s\n' '--- TypeScript: npm run typecheck'
npm run typecheck

printf '%s\n' '--- Unit and component tests: npm run test:unit'
npm run test:unit

printf '%s\n' '--- Production build: npm run build'
npm run build

shopt -s nullglob
e2e_specs=("${project_dir}"/e2e/*.spec.ts)
shopt -u nullglob

if ((${#e2e_specs[@]} > 0)); then
  printf '%s\n' '--- Playwright acceptance flows: npm run test:e2e'
  npm run test:e2e
else
  printf '%s\n' '--- Playwright acceptance flows: not yet applicable'
fi

printf '%s\n' 'PASS: all currently applicable checks passed.'
