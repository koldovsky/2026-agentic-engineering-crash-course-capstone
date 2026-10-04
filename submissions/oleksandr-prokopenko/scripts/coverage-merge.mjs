// Merges Vitest and JaCoCo coverage into coverage/coverage-summary.json, the file check-coverage-ratchet reads.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

const FRONTEND_SUMMARY = "frontend/coverage/coverage-summary.json";
const BACKEND_JACOCO = "backend/target/site/jacoco/jacoco.xml";
const MERGED_SUMMARY = "coverage/coverage-summary.json";
const JACOCO_TO_METRIC = { LINE: "lines", INSTRUCTION: "statements", METHOD: "functions", BRANCH: "branches" };
const METRICS = Object.values(JACOCO_TO_METRIC);

export function parseJacocoTotals(xml) {
  const lastPackageEnd = xml.lastIndexOf("</package>");
  const reportLevel = lastPackageEnd === -1 ? xml : xml.slice(lastPackageEnd);
  const totals = Object.fromEntries(METRICS.map((metric) => [metric, { total: 0, covered: 0 }]));
  for (const [, type, missed, covered] of reportLevel.matchAll(/<counter type="([A-Z]+)" missed="(\d+)" covered="(\d+)"\/>/g)) {
    const metric = JACOCO_TO_METRIC[type];
    if (metric) totals[metric] = { total: Number(missed) + Number(covered), covered: Number(covered) };
  }
  return totals;
}

export function mergeSummaries(vitestTotal, jacocoTotals) {
  const total = {};
  for (const metric of METRICS) {
    const sum = vitestTotal[metric].total + jacocoTotals[metric].total;
    const covered = vitestTotal[metric].covered + jacocoTotals[metric].covered;
    const pct = sum === 0 ? 100 : Math.round((covered / sum) * 10000) / 100;
    total[metric] = { total: sum, covered, skipped: 0, pct };
  }
  return { total };
}

function main() {
  const missing = [FRONTEND_SUMMARY, BACKEND_JACOCO].filter((path) => !existsSync(path));
  if (missing.length) {
    console.error(`coverage-merge: missing ${missing.join(", ")} — run the frontend and backend coverage first`);
    process.exit(1);
  }
  const vitestTotal = JSON.parse(readFileSync(FRONTEND_SUMMARY, "utf8")).total;
  const merged = mergeSummaries(vitestTotal, parseJacocoTotals(readFileSync(BACKEND_JACOCO, "utf8")));
  mkdirSync(dirname(MERGED_SUMMARY), { recursive: true });
  writeFileSync(MERGED_SUMMARY, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`coverage-merge: wrote ${MERGED_SUMMARY}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
