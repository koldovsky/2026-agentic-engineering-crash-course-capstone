// Existence mechanism for the vision-verify acceptance tag.
// Artifact mode still requires docs/qa/vision-report.json with met:true.
import { existsSync, readFileSync } from "node:fs";

const report = "docs/qa/vision-report.json";
if (!existsSync(report)) {
  console.error(`vision-verify: missing ${report}. A fresh agent must record { "met": true } after looking at the settled UI.`);
  process.exit(1);
}
const data = JSON.parse(readFileSync(report, "utf8"));
if (data.met !== true) {
  console.error("vision-verify: vision report met is not true");
  process.exit(1);
}
console.log("vision-verify: met");
