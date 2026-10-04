// Deploy gate: probes the live site for every requirement tagged `deploy-gated` and
// writes docs/qa/deploy-verification.json, the artifact check-acceptance-methods validates.
//
// A requirement with no probe is "uncovered", and a probe that proves only part of a
// requirement is "partial"; either keeps the report short of "passed" (NOT-EARNED).
// Without a URL the check is SKIP-pending until slice add-deploy-pipeline is archived.
//
// Usage:
//   DEPLOY_URL=https://example.example.com node scripts/check-deploy.mjs
//   node scripts/check-deploy.mjs --url <https-url> [--http-url <url>] [--samples 5]
//     [--paths /,/sessions,/en,/en/sessions] [--closed-ports 3000,5432,8080] [--acme-issuers "Let's Encrypt,ZeroSSL"]
//     [--lighthouse-runs 5]   (NFR-18 and NFR-20 run the Lighthouse CLI; LIGHTHOUSE_BIN overrides its path)
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { connect, isIP } from "node:net";
import { connect as connectTls } from "node:tls";
import { join } from "node:path";

const root = process.cwd();
const PATHS = {
  requirements: "docs/requirements.md",
  specsDir: "openspec/specs",
  archive: "openspec/changes/archive",
  report: "docs/qa/deploy-verification.json",
};
const METHOD = "deploy-gated";
const TTFB_P95_MS = 600;
const MIN_CERT_DAYS = 10;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;
const LCP_P75_MS = 2500;
const PERFORMANCE_MIN = 90;
const LIGHTHOUSE_TIMEOUT_MS = 180_000;

// ---------- input ----------
const FLAGS = ["--url", "--http-url", "--samples", "--paths", "--closed-ports", "--acme-issuers", "--lighthouse-runs"];
const argv = process.argv.slice(2);
const inputErrors = [];
const given = {};
for (let i = 0; i < argv.length; i += 1) {
  const [flag, inline] = argv[i].split(/=(.*)/s);
  if (!FLAGS.includes(flag)) {
    inputErrors.push(`unknown argument "${argv[i]}"`);
    continue;
  }
  const value = inline ?? argv[(i += 1)];
  if (value === undefined || value === "") inputErrors.push(`${flag} needs a value`);
  else given[flag] = value;
}
const url = given["--url"] ?? process.env.DEPLOY_URL ?? "";
const samples = Number(given["--samples"] ?? "5");
const pagePaths = (given["--paths"] ?? "/,/sessions,/en,/en/sessions").split(",").filter(Boolean);
const closedPorts = (given["--closed-ports"] ?? "3000,5432,8080").split(",").map(Number);
const acmeIssuers = (given["--acme-issuers"] ?? "Let's Encrypt,ZeroSSL").split(",").map((s) => s.trim()).filter(Boolean);
const lighthouseRuns = Number(given["--lighthouse-runs"] ?? "5");

const parseUrl = (value) => {
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol) ? u : null;
  } catch {
    return null;
  }
};
if (url && !parseUrl(url)) inputErrors.push(`URL "${url}" is not an absolute http or https URL`);
if (given["--http-url"] && parseUrl(given["--http-url"])?.protocol !== "http:") inputErrors.push(`--http-url "${given["--http-url"]}" is not an absolute plain-HTTP URL`);
if (!Number.isInteger(samples) || samples < 1) inputErrors.push(`--samples must be a positive integer`);
if (!Number.isInteger(lighthouseRuns) || lighthouseRuns < 1) inputErrors.push(`--lighthouse-runs must be a positive integer`);
for (const port of closedPorts) if (!Number.isInteger(port) || port < 1 || port > 65535) inputErrors.push(`port "${port}" is not an integer from 1 to 65535`);

// ---------- declared requirements ----------
function* walk(rel) {
  let entries = [];
  try {
    entries = readdirSync(join(root, rel));
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const child = `${rel}/${entry}`;
    let isDir = false;
    try {
      isDir = statSync(join(root, child)).isDirectory();
    } catch {
      continue;
    }
    if (isDir) yield* walk(child);
    else yield child;
  }
}
const read = (rel) => {
  try {
    return readFileSync(join(root, rel), "utf8");
  } catch {
    return null;
  }
};

// Same product-code roots and extensions as gate-status, so both agree on NOT-EARNED.
const IMPL_DIRS = ["frontend/src", "backend/src/main", "app", "src", "lib", "pages", "components", "server", "api"];
const IMPL_EXT = /\.(mjs|cjs|js|jsx|ts|tsx|vue|svelte|py|go|rb|rs|java|cs|php)$/i;
const productCode = IMPL_DIRS.some((d) => existsSync(join(root, d)) && [...walk(d)].some((f) => IMPL_EXT.test(f) && !/\.(test|spec)\./.test(f)));

// Tagged rows are found the way check-acceptance-methods finds them (any phase, categorized ids,
// case-insensitive token, spec lines too), because its artifact check reads one file for all of them.
const ID_RE = /\b(?:FR|NFR|TC|BC)-(?:[A-Z0-9]+-)?\d+\b/g;
const tagged = (line) => new RegExp(`\\b${METHOD}\\b`, "i").test(line);
const requirementsText = read(PATHS.requirements);
const declared = new Set();
for (const line of (requirementsText ?? "").split("\n")) {
  const m = line.match(/^\|\s*((?:FR|NFR|TC|BC)-(?:[A-Z0-9]+-)?\d+)\s*\|/);
  if (m && tagged(line)) declared.add(m[1]);
}
for (const file of walk(PATHS.specsDir)) {
  if (!file.endsWith("/spec.md")) continue;
  for (const line of (read(file) ?? "").split("\n")) if (tagged(line)) for (const id of line.match(ID_RE) ?? []) declared.add(id);
}

// ---------- probes ----------
const why = (err) => err?.cause?.code ?? err?.code ?? err?.message ?? String(err);
const timed = () => AbortSignal.timeout(TIMEOUT_MS);

// Follows redirects by hand so every hop must stay on HTTPS.
async function fetchHttpsChain(start) {
  let current = new URL(start);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (current.protocol !== "https:") return { error: `${current.href} is not HTTPS` };
    const res = await fetch(current, { redirect: "manual", signal: timed() });
    await res.arrayBuffer();
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return { error: `${current.href} answered ${res.status} with no Location` };
      current = new URL(location, current);
      continue;
    }
    return { res, final: current.href };
  }
  return { error: `more than ${MAX_REDIRECTS} redirects from ${start}` };
}

const peerCertificate = (u) =>
  new Promise((done, fail) => {
    const port = Number(u.port || 443);
    // rejectUnauthorized: false lets the probe name the trust error instead of throwing it.
    const socket = connectTls({ host: u.hostname, port, servername: isIP(u.hostname) ? undefined : u.hostname, rejectUnauthorized: false, timeout: TIMEOUT_MS });
    socket.once("secureConnect", () => {
      const cert = socket.getPeerCertificate();
      const authorized = socket.authorized;
      socket.destroy();
      done({ cert, authorized, authorizationError: socket.authorizationError });
    });
    socket.once("timeout", () => {
      socket.destroy();
      fail(new Error("TLS handshake timed out"));
    });
    socket.once("error", fail);
  });

async function checkCertificate(u) {
  const { cert, authorized, authorizationError } = await peerCertificate(u);
  if (!authorized) return { error: `certificate of ${u.host} not trusted: ${authorizationError}` };
  const issuer = cert.issuer?.O ?? cert.issuer?.CN ?? "(unknown issuer)";
  const daysLeft = Math.floor((Date.parse(cert.valid_to) - Date.now()) / 86_400_000);
  if (!acmeIssuers.some((name) => issuer.includes(name))) return { error: `certificate issuer "${issuer}" of ${u.host} is outside the ACME list (${acmeIssuers.join(", ")})` };
  if (daysLeft < MIN_CERT_DAYS) return { error: `certificate of ${u.host} from ${issuer} expires in ${daysLeft} day(s); automatic renewal should keep at least ${MIN_CERT_DAYS}` };
  return { note: `${u.host}: ${issuer}, ${daysLeft} day(s) left` };
}

async function probeHttps(base) {
  const u = new URL(base);
  if (u.protocol !== "https:") return { status: "failed", detail: `${base} is not served over HTTPS` };
  const first = await checkCertificate(u);
  if (first.error) return { status: "failed", detail: first.error };
  const chain = await fetchHttpsChain(base);
  if (chain.error) return { status: "failed", detail: chain.error };
  if (!chain.res.ok) return { status: "failed", detail: `${chain.final} answered ${chain.res.status}` };
  const finalUrl = new URL(chain.final);
  const last = finalUrl.host === u.host ? first : await checkCertificate(finalUrl);
  if (last.error) return { status: "failed", detail: last.error };
  const notes = [...new Set([first.note, last.note])].join("; ");
  return { status: "passed", detail: `HTTPS answered ${chain.res.status}; certificate ${notes} (renewal is inferred from the days left)` };
}

async function probeRedirect(base) {
  const target = new URL(base);
  const plain = given["--http-url"] ?? `http://${target.host}/`;
  const res = await fetch(plain, { redirect: "manual", signal: timed() });
  await res.arrayBuffer();
  const location = res.headers.get("location");
  let to = null;
  try {
    to = location ? new URL(location, plain) : null;
  } catch {
    to = null;
  }
  const ok = [301, 308].includes(res.status) && to?.protocol === "https:" && to.hostname === target.hostname;
  return ok
    ? { status: "passed", detail: `${plain} answered ${res.status} to ${to.href}` }
    : { status: "failed", detail: `${plain} answered ${res.status} with Location "${location ?? ""}"; expected 301 or 308 to https://${target.hostname}` };
}

async function probeTtfb(base) {
  const times = [];
  const measured = [];
  const missing = [];
  for (const path of pagePaths) {
    const page = new URL(path, base);
    let absent = false;
    for (let i = 0; i < samples; i += 1) {
      const start = performance.now();
      const res = await fetch(page, { signal: timed() });
      const ms = performance.now() - start;
      await res.arrayBuffer();
      // A 404 on the first request means the page is not built yet; any other error answer is a broken page.
      if (i === 0 && res.status === 404) {
        absent = true;
        break;
      }
      if (!res.ok) return { status: "failed", detail: `${page.href} answered ${res.status} on request ${i + 1}` };
      times.push(ms);
    }
    if (absent) missing.push(path);
    else measured.push(path);
  }
  const unmeasured = missing.length ? `; not measured: ${missing.join(", ")} answered 404 (not built yet)` : "";
  if (!times.length) return { status: "partial", detail: `no listed page exists yet${unmeasured}` };
  times.sort((a, b) => a - b);
  const p95 = Math.round(times[Math.ceil(0.95 * times.length) - 1]);
  const detail = `p95 first byte ${p95} ms over ${times.length} request(s) over ${measured.join(", ")}, budget ${TTFB_P95_MS} ms${unmeasured}`;
  if (p95 > TTFB_P95_MS) return { status: "failed", detail };
  return { status: missing.length ? "partial" : "passed", detail };
}

const portAnswers = (host, port) =>
  new Promise((done) => {
    const socket = connect({ host, port, timeout: 2000 });
    socket.once("connect", () => {
      socket.destroy();
      done(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      done(false);
    });
    socket.once("error", () => done(false));
  });

async function probePorts(base) {
  const host = new URL(base).hostname;
  const open = [];
  for (const port of closedPorts) if (await portAnswers(host, port)) open.push(port);
  return open.length
    ? { status: "failed", detail: `port(s) ${open.join(", ")} on ${host} accept connections from outside` }
    : { status: "partial", detail: `ports ${closedPorts.join(", ")} refuse connections; SSH keys-only and automatic updates are not probed` };
}

async function probeHome(base) {
  const home = new URL("/", base);
  const start = performance.now();
  const res = await fetch(home, { signal: timed() });
  const ms = Math.round(performance.now() - start);
  await res.arrayBuffer();
  if (!res.ok) return { status: "failed", detail: `${home.href} answered ${res.status}` };
  return { status: "partial", detail: `${home.href} answered ${res.status} in ${ms} ms; the monthly 99% share needs the outside monitor's history, which this check does not read` };
}

// ---------- Lighthouse: NFR-18 (LCP p75) and NFR-20 (median performance score) share one set of runs ----------
// Lighthouse's default mobile run emulates a mid-range phone on slow 4G, which is the profile both requirements name.
const lighthouseBin = process.env.LIGHTHOUSE_BIN ?? join(root, "node_modules", ".bin", "lighthouse");
let lighthouseRun = null;

async function sessionPagePath(base) {
  const res = await fetch(new URL("/sessions", base), { signal: timed() });
  const html = await res.text();
  return /href="(\/sessions\/[a-z0-9]+(?:-[a-z0-9]+)*)"/.exec(html)?.[1] ?? null;
}

const runLighthouse = (page) =>
  new Promise((done, fail) => {
    const args = [page, "--output=json", "--output-path=stdout", "--only-categories=performance", "--quiet", "--chrome-flags=--headless=new --no-sandbox"];
    execFile(lighthouseBin, args, { maxBuffer: 64 * 1024 * 1024, timeout: LIGHTHOUSE_TIMEOUT_MS }, (err, stdout, stderr) => {
      if (err) return fail(new Error(`lighthouse ${page} failed: ${String(stderr || err.message).trim().split("\n").pop()}`));
      try {
        const lhr = JSON.parse(stdout);
        const lcp = lhr.audits?.["largest-contentful-paint"]?.numericValue;
        const score = lhr.categories?.performance?.score;
        if (typeof lcp !== "number" || typeof score !== "number") return fail(new Error(`lighthouse ${page} reported no LCP or no performance score`));
        done({ lcp, score: Math.round(score * 100) });
      } catch (parseErr) {
        fail(new Error(`lighthouse ${page} printed no JSON report: ${parseErr.message}`));
      }
    });
  });

function lighthouse(base) {
  lighthouseRun ??= (async () => {
    if (!existsSync(lighthouseBin)) {
      return { error: `the Lighthouse CLI is not installed at ${lighthouseBin}; run \`npm install --save-dev lighthouse\` in the repository root, or set LIGHTHOUSE_BIN to its path` };
    }
    const session = await sessionPagePath(base);
    const pages = [];
    for (const path of ["/", "/sessions", ...(session ? [session] : [])]) {
      const runs = [];
      for (let i = 0; i < lighthouseRuns; i += 1) runs.push(await runLighthouse(new URL(path, base).href));
      pages.push({ path, lcp: runs.map((r) => r.lcp), score: runs.map((r) => r.score) });
    }
    return { pages, session };
  })();
  return lighthouseRun;
}

const nearestRank = (values, share) => [...values].sort((a, b) => a - b)[Math.ceil(share * values.length) - 1];
const noSession = "; no session page is listed on /sessions yet, so the session page is not measured";

async function probeLcp(base) {
  const result = await lighthouse(base);
  if (result.error) return { status: "failed", detail: result.error };
  const rows = result.pages.map((p) => ({ path: p.path, p75: Math.round(nearestRank(p.lcp, 0.75)) }));
  const detail = `p75 LCP over ${lighthouseRuns} mobile run(s) each: ${rows.map((r) => `${r.path} ${r.p75} ms`).join(", ")}; budget ${LCP_P75_MS} ms`;
  if (rows.some((r) => r.p75 > LCP_P75_MS)) return { status: "failed", detail };
  return result.session ? { status: "passed", detail } : { status: "partial", detail: detail + noSession };
}

async function probePerformanceScore(base) {
  const result = await lighthouse(base);
  if (result.error) return { status: "failed", detail: result.error };
  const rows = result.pages.map((p) => ({ path: p.path, median: nearestRank(p.score, 0.5) }));
  const detail = `median Lighthouse mobile performance over ${lighthouseRuns} run(s) each: ${rows.map((r) => `${r.path} ${r.median}`).join(", ")}; minimum ${PERFORMANCE_MIN}`;
  if (rows.some((r) => r.median < PERFORMANCE_MIN)) return { status: "failed", detail };
  return result.session ? { status: "passed", detail } : { status: "partial", detail: detail + noSession };
}

const PROBES = {
  "FR-146": probeHttps,
  "NFR-11": probeRedirect,
  "NFR-18": probeLcp,
  "NFR-19": probeTtfb,
  "NFR-20": probePerformanceScore,
  "NFR-7": probePorts,
  "NFR-24": probeHome,
};

// The live site does not show which commit runs, so these need access this check does not hold.
const NEEDS_ACCESS = {
  "FR-147": "needs a GitHub token to read the ci run of the last push to main",
  "FR-148": "needs a GitHub token with packages: read to list the GHCR image tags",
  "FR-149": "needs a GitHub token to read the deploy run, or SSH to the server to read the running image",
  "FR-150": "needs a GitHub token to read a failed ci run and its skipped deploy run",
  "NFR-23": "needs SSH to the server to read the container memory limits and docker stats",
};

// ---------- run ----------
const deployArchived = (() => {
  try {
    return readdirSync(join(root, PATHS.archive)).some((d) => d.endsWith("add-deploy-pipeline"));
  } catch {
    return false;
  }
})();

const requirements = [];
if (url && !inputErrors.length) {
  for (const id of [...declared].sort()) {
    const probe = PROBES[id];
    if (!probe) {
      requirements.push({ id, status: "uncovered", detail: NEEDS_ACCESS[id] ?? "no probe measures this requirement yet" });
      continue;
    }
    try {
      requirements.push({ id, ...(await probe(url)) });
    } catch (err) {
      requirements.push({ id, status: "failed", detail: `probe error: ${why(err)}` });
    }
  }
}

let result;
if (inputErrors.length) result = "FAIL";
else if (requirementsText === null) result = productCode ? "FAIL" : "SKIP-pending";
else if (declared.size === 0) result = productCode ? "NOT-EARNED" : "SKIP-pending";
else if (!url) result = deployArchived ? "NOT-EARNED" : "SKIP-pending";
else if (requirements.some((r) => r.status === "failed")) result = "FAIL";
else if (requirements.some((r) => r.status !== "passed")) result = "NOT-EARNED";
else result = "PASS";
const status = result === "NOT-EARNED" && url && declared.size ? "incomplete" : { PASS: "passed", FAIL: "failed", "NOT-EARNED": "not-earned", "SKIP-pending": "skip-pending" }[result];

const report = { generatedBy: "scripts/check-deploy.mjs", url: url || null, status, inputErrors, requirements };
mkdirSync(join(root, "docs", "qa"), { recursive: true });
writeFileSync(join(root, PATHS.report), `${JSON.stringify(report, null, 2)}\n`);

for (const e of inputErrors) console.error(`FAIL  [input] ${e}`);
if (!inputErrors.length && requirementsText === null) console.error(`${result === "FAIL" ? "FAIL" : "SKIP"}  [deploy] ${PATHS.requirements} not found`);
if (!inputErrors.length && requirementsText !== null && declared.size === 0) console.error(`${result === "NOT-EARNED" ? "NOT-EARNED" : "SKIP"}  [deploy] no requirement is tagged ${METHOD}`);
if (!inputErrors.length && declared.size && !url)
  console.log(deployArchived ? "NOT-EARNED  [deploy] add-deploy-pipeline is archived but no DEPLOY_URL is set" : "SKIP  [deploy] no DEPLOY_URL yet; the live site does not exist before slice add-deploy-pipeline");
for (const r of requirements) {
  const tag = { passed: "PASS", failed: "FAIL", partial: "PARTIAL", uncovered: "UNCOVERED" }[r.status];
  console.log(`${tag.padEnd(10)} [${r.id}] ${r.detail}`);
}
console.log(`\nScope: ${declared.size} requirement(s) tagged ${METHOD}${url ? ` against ${url}` : ""}`);
console.log(`wrote ${PATHS.report}`);
console.log(`Result: ${result}`);
process.exit(result === "FAIL" || result === "NOT-EARNED" ? 1 : 0);
