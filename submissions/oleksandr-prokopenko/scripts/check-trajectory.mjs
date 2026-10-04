// REFERENCE IMPLEMENTATION — deterministic trajectory validator.
//
// Sibling to check-traceability.mjs. Where check-traceability proves the
// REQUIREMENT chain, this proves the PROCESS each archived slice took — the
// part of "trajectory evaluation" that git/artifacts can prove, with exit
// codes (no LLM judgment):
//   - review evidence exists and is clean (review ran before archive);
//   - the slice's commits carry the `Slice:` trailer;
//   - module scope: which lib/<domain>/ each slice touched (cross-slice
//     overlaps flagged for drift review);
//   - the archived change folder has design.md + tasks.md.
//
// HONESTY BOUNDARY: it does NOT verify test-first ordering or "no test was
// weakened". Those are not derivable from one-commit-per-slice history — they
// are graded by the `trajectory-eval` workflow (a fresh LLM judge reading the
// diff). This script never claims what it cannot prove.
//
// Usage:
//   node scripts/check-trajectory.mjs                 # report + exit code
//   node scripts/check-trajectory.mjs --release       # missing evidence/trailer = FAIL
//   node scripts/check-trajectory.mjs --strict-scope  # cross-slice module overlap = FAIL
//   node scripts/check-trajectory.mjs --check-fresh   # committed report must match
//   node scripts/check-trajectory.mjs --warn-only     # NOT-EARNED still printed, exit 0 (pre-commit, CI)
//
// Outputs (deterministic, ASCII, no timestamps — safe to diff in CI):
//   docs/qa/trajectory-report.md   (generated — do not hand-edit)
//   trace/trajectory.json          (machine-readable)
//
// Wire as: "check:trajectory": "node scripts/check-trajectory.mjs"
import { readdirSync, readFileSync, statSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const flags = new Set(process.argv.slice(2));
const PATHS = {
  archiveDir: "openspec/changes/archive",
  reportOut: "docs/qa/trajectory-report.md",
  jsonOut: "trace/trajectory.json",
};
// lib/<domain>/ dirs that are conventionally shared — never flagged as a
// cross-slice overlap.
const SHARED_DOMAINS = new Set(["auth", "db", "shared", "ui", "utils", "common", "email"]);
// Module roots in this repo: lib/<domain>/ (upstream), backend and frontend domains (ADR-0001).
const MODULE_ROOTS = [
  /^lib\/([^/]+)\//,
  /^backend\/src\/main\/java\/dev\/prokopenko\/portfolio\/([^/]+)\//,
  /^frontend\/src\/(?:app|lib)\/([^/]+)\//,
];
const moduleOf = (file) => MODULE_ROOTS.map((re) => file.match(re)).find(Boolean)?.[1];

const failures = [];
const warnings = [];
const fail = (check, msg) => failures.push({ check, msg });
const warn = (check, msg) => warnings.push({ check, msg });
// A finding that is a hard FAIL only under a strictness flag, else a warning.
const gated = (on, check, msg) => (on ? fail(check, msg) : warn(check, msg));

const read = (rel) => (existsSync(join(root, rel)) ? readFileSync(join(root, rel), "utf8") : null);
function git(args) {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return { ok: r.status === 0, out: (r.stdout || "").trim() };
}
const isRepo = git(["rev-parse", "--is-inside-work-tree"]).ok;
if (!isRepo) warn("git", "not a git work tree — trailer/scope checks skipped");

// ---------- discover archived slices ----------
const archiveAbs = join(root, PATHS.archiveDir);
const slices = existsSync(archiveAbs)
  ? readdirSync(archiveAbs).filter((e) => statSync(join(archiveAbs, e)).isDirectory())
  : [];

// An owner decision that process proposals filed as slices need no review evidence is a JSON waiver that names
// each archive folder; its findings stay in the report as warnings, in every mode, so --check-fresh holds.
const CLOSED_WAIVER = new Set(["closed", "resolved", "expired", "revoked", "withdrawn", "done"]);
const waivedSlices = new Map(); // archive folder -> open waiver file
const waiversAbs = join(root, "docs", "qa", "waivers");
for (const f of existsSync(waiversAbs) ? readdirSync(waiversAbs).sort() : []) {
  if (!f.endsWith(".json")) continue;
  let w = null;
  try {
    w = JSON.parse(readFileSync(join(waiversAbs, f), "utf8"));
  } catch {
    continue;
  }
  const open = !CLOSED_WAIVER.has(String(w?.status ?? "open").toLowerCase());
  if (w?.check !== "trajectory-slices" || typeof w.reason !== "string" || !w.reason.trim() || !open) continue;
  for (const name of [].concat(w.slices ?? [])) if (!waivedSlices.has(name)) waivedSlices.set(name, `docs/qa/waivers/${f}`);
}
const finding = (slice, check, msg) =>
  waivedSlices.has(slice) ? warn(check, `${msg} — waived by ${waivedSlices.get(slice)}`) : gated(flags.has("--release"), check, msg);

// slice -> { reviewEvidence, trailerCommits, libDomains[], processComplete }
const rows = [];
const domainToSlices = new Map(); // lib domain -> [slices]

for (const slice of slices) {
  const dir = join(PATHS.archiveDir, slice);
  // OpenSpec archives as `YYYY-MM-DD-add-<cap>`, but the commit trailer is the
  // bare `Slice: add-<cap>` — strip the date prefix so trailer matching works.
  const trailerName = slice.replace(/^\d{4}-\d{2}-\d{2}-/, "");

  // 1. review evidence
  let reviewEvidence = "missing";
  const rf = read(join(dir, "review-findings.json"));
  if (rf) {
    try {
      reviewEvidence = JSON.parse(rf).clean === true ? "clean" : "unclean";
    } catch {
      reviewEvidence = "unparseable";
    }
  }
  if (reviewEvidence !== "clean") {
    finding(slice, "review-evidence", `${slice}: review-findings.json is ${reviewEvidence} (review must have run clean before archive)`);
  }

  // 2. process completeness
  const processComplete = existsSync(join(root, dir, "design.md")) && existsSync(join(root, dir, "tasks.md"));
  if (!processComplete) finding(slice, "process", `${slice}: archived change is missing design.md and/or tasks.md`);

  // 3 + 4. trailer presence + module scope (git)
  let trailerCommits = 0;
  let libDomains = [];
  if (isRepo) {
    const { ok, out } = git(["log", "--all", `--grep=Slice: ${trailerName}`, "--name-only", "--pretty=format:commit %H"]);
    if (ok) {
      const files = new Set();
      for (const line of out.split("\n")) {
        if (line.startsWith("commit ")) trailerCommits += 1;
        else if (line.trim()) files.add(line.trim());
      }
      for (const f of files) {
        const domain = moduleOf(f);
        if (domain) {
          libDomains.push(domain);
        }
      }
      libDomains = [...new Set(libDomains)];
      for (const d of libDomains) {
        if (!domainToSlices.has(d)) domainToSlices.set(d, []);
        domainToSlices.get(d).push(slice);
      }
    }
    if (trailerCommits === 0) finding(slice, "trailer", `${slice}: no commit carries a "Slice: ${trailerName}" trailer`);
  }

  rows.push({ slice, reviewEvidence, trailerCommits, libDomains, processComplete });
}

// cross-slice module overlap (after all slices seen)
const overlaps = [];
for (const [domain, owners] of domainToSlices) {
  const uniq = [...new Set(owners)];
  if (uniq.length > 1 && !SHARED_DOMAINS.has(domain)) {
    overlaps.push({ domain, slices: uniq });
    gated(flags.has("--strict-scope"), "in-scope", `module "${domain}" modified by ${uniq.length} slices (${uniq.join(", ")}) — review for scope drift`);
  }
}

if (slices.length === 0) warn("slices", "no archived slices found under openspec/changes/archive/ (nothing to audit yet)");

// Same product-code roots and extensions as gate-status, so both scripts agree on NOT-EARNED.
const IMPL_DIRS = ["frontend/src", "backend/src/main", "app", "src", "lib", "pages", "components", "server", "api"];
const IMPL_EXT = /\.(mjs|cjs|js|jsx|ts|tsx|vue|svelte|py|go|rb|rs|java|cs|php)$/i;
function hasProductCode() {
  const stack = IMPL_DIRS.map((d) => join(root, d)).filter((p) => existsSync(p));
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const p = join(dir, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else if (IMPL_EXT.test(entry.name) && !/\.(test|spec)\./.test(entry.name)) return true;
    }
  }
  return false;
}
const resultWord =
  failures.length ? `FAIL (${failures.length} failure${failures.length === 1 ? "" : "s"})`
  : slices.length > 0 ? "PASS"
  : hasProductCode() ? "NOT-EARNED"
  : "SKIP-pending";

// ---------- outputs ----------
const ok = (b) => (b ? "yes" : "**no**");
const report = `# Trajectory Report (generated - do not hand-edit)

Generated by \`node scripts/check-trajectory.mjs\`. Audits the PROCESS each
archived slice took: review evidence, \`Slice:\` trailers, and module scope.
It does NOT verify test-first ordering or test integrity (not derivable from
one-commit-per-slice history) — those are graded by the trajectory-eval workflow.

Scope: ${slices.length} archived slice(s).
Result: ${resultWord}${warnings.length ? `, ${warnings.length} warning(s)` : ""}

| Slice | Review evidence | Trailer commits | design+tasks | lib domains touched |
|---|---|---|---|---|
${rows
  .map((r) => `| ${r.slice} | ${r.reviewEvidence === "clean" ? "clean" : `**${r.reviewEvidence}**`} | ${r.trailerCommits || "**0**"} | ${ok(r.processComplete)} | ${r.libDomains.join(", ") || "-"} |`)
  .join("\n")}

## Cross-slice module overlap

${overlaps.length ? overlaps.map((o) => `- \`lib/${o.domain}/\` touched by: ${o.slices.join(", ")}`).join("\n") : "None."}

## Failures

${failures.length ? failures.map((f) => `- **${f.check}**: ${f.msg}`).join("\n") : "None."}

## Warnings

${warnings.length ? warnings.map((w) => `- **${w.check}**: ${w.msg}`).join("\n") : "None."}
`;

const trajectory = {
  generatedBy: "scripts/check-trajectory.mjs",
  slices: rows,
  overlaps,
  failures,
  warnings,
};

if (flags.has("--check-fresh")) {
  const committed = read(PATHS.reportOut);
  if (committed === null) fail("freshness", `${PATHS.reportOut} does not exist — run the validator and commit it`);
  else if (committed.replace(/\r\n/g, "\n") !== report.replace(/\r\n/g, "\n")) fail("freshness", `${PATHS.reportOut} is stale — regenerate and commit`);
} else {
  mkdirSync(join(root, "trace"), { recursive: true });
  mkdirSync(join(root, "docs", "qa"), { recursive: true });
  writeFileSync(join(root, PATHS.reportOut), report);
  writeFileSync(join(root, PATHS.jsonOut), `${JSON.stringify(trajectory, null, 2)}\n`);
}

for (const w of warnings) console.warn(`WARN  [${w.check}] ${w.msg}`);
for (const f of failures) console.error(`FAIL  [${f.check}] ${f.msg}`);
console.log(`\nScope: ${slices.length} archived slice(s)`);
if (!flags.has("--check-fresh")) console.log(`wrote ${PATHS.reportOut} and ${PATHS.jsonOut}`);
console.log(`Result: ${failures.length ? "FAIL" : resultWord}${warnings.length ? `, ${warnings.length} warning(s)` : ""}`);
process.exit(failures.length || (resultWord === "NOT-EARNED" && !flags.has("--warn-only")) ? 1 : 0);
