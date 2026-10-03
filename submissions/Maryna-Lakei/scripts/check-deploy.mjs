// Existence mechanism for the deploy-gated acceptance tag.
// Artifact mode still requires a fresh docs/qa/deploy-verification.json.
import { existsSync, readFileSync } from "node:fs";

const report = "docs/qa/deploy-verification.json";
if (!existsSync(report)) {
  console.error(`deploy-gated: missing ${report}. Record the live URL after the Vercel deploy.`);
  process.exit(1);
}
const data = JSON.parse(readFileSync(report, "utf8"));
const status = String(data.status ?? "").toLowerCase();
if (!["passed", "pass", "ok", "green"].includes(status) || typeof data.url !== "string" || data.url.length === 0) {
  console.error("deploy-gated: report must include status passed and a url");
  process.exit(1);
}
console.log(`deploy-gated: ${data.url}`);
