// Browser run for add-jira-gdocs-and-import, tasks 9.1 and 9.2, and the page fixes of task 9.4.
//
// Playwright from the npx cache drives the system Chrome against the running `pnpm dev` on :3033.
// The project gets no dependency. Run from the project directory:
//
//   PLAYWRIGHT=<path to node_modules/playwright> OUT=<result file> node <this file>

import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT);
const ORIGIN = "http://localhost:3033";
const results = [];
const log = (line) => {
  results.push(line);
  console.log(line);
};

async function check(name, run) {
  try {
    const note = await run();
    log(`PASS  ${name}${note ? `\n      ${note}` : ""}`);
  } catch (error) {
    log(`FAIL  ${name}\n      ${String(error.message).split("\n")[0]}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext();
await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: ORIGIN });
const page = await context.newPage();

// Every request, and the body of every script, in order.
const requests = [];
const scripts = [];
page.on("request", (request) =>
  requests.push({ url: request.url(), method: request.method(), body: request.postDataBuffer()?.length ?? 0 }),
);
page.on("response", async (response) => {
  if (response.request().resourceType() !== "script") return;
  scripts.push({ url: response.url(), body: await response.text().catch(() => "") });
});

await page.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
const firstLoadScripts = scripts.length;

const source = page.locator("#source");
// Scoped to <main>: the Next.js route announcer also carries role="alert".
const alert = page.locator("main").getByRole("alert");
const button = (name) => page.getByRole("button", { name, exact: true });
const fileInput = page.locator('input[type="file"]');
const alertText = async () => ((await alert.count()) ? alert.innerText() : "");
/** Poll the textarea until `test` holds, for 10 seconds at most. */
async function waitForValue(test) {
  for (let tries = 0; tries < 100; tries++) {
    if (test(await source.inputValue())) return;
    await page.waitForTimeout(100);
  }
  throw new Error(`timeout, textarea: ${JSON.stringify(await source.inputValue())}`);
}

async function transform(markdown) {
  await source.fill(markdown);
  await Promise.all([page.waitForResponse("**/api/transform"), button("Transform").click()]);
}

/** Write a clipboard item with the given entries, from inside the page. */
const writeClipboard = (entries) =>
  page.evaluate(async (entries) => {
    const blobs = Object.fromEntries(Object.entries(entries).map(([type, text]) => [type, new Blob([text], { type })]));
    await navigator.clipboard.write([new ClipboardItem(blobs)]);
  }, entries);

const readClipboard = () =>
  page.evaluate(async () => {
    const out = {};
    for (const item of await navigator.clipboard.read()) {
      for (const type of item.types) out[type] = await (await item.getType(type)).text();
    }
    return out;
  });

// Task 9.2, part 1: the first load carries no conversion code.
await check("9.2 The first page load carries no conversion code", async () => {
  const first = scripts.slice(0, firstLoadScripts);
  const hits = first.filter(({ body }) => /convertToHtml|docs-internal-guid/.test(body));
  assert(first.length > 0, "no script loaded");
  assert(hits.length === 0, `conversion code in ${hits.map((s) => s.url).join(", ")}`);
  return `${first.length} scripts on the first load, none holds "convertToHtml" or "docs-internal-guid"`;
});

log("\n## transform-tool");

await check("Paste gives six tabs", async () => {
  await transform("## Setup\n\nA **bold** word and a [link](https://example.com).\n\n```ts\nconst a = 1;\n```\n");
  const tabs = await page.getByRole("tab").allInnerTexts();
  assert(tabs.join("|") === "Blog|Email|X thread|LinkedIn|Jira|Google Docs", `tabs: ${tabs.join("|")}`);
  for (const tab of tabs) {
    await page.getByRole("tab", { name: tab }).click();
    assert((await page.getByText("No output").count()) === 0, `${tab} is empty`);
  }
  await page.getByRole("tab", { name: "Jira" }).click();
  const jira = await page.locator("pre").innerText();
  assert(jira.includes("h2. Setup") && jira.includes("{code:ts}"), `jira: ${jira}`);
  await page.getByRole("tab", { name: "Google Docs" }).click();
  const gdocs = await page.locator("pre").innerText();
  assert(gdocs.includes("<h2>Setup</h2>"), `gdocs: ${gdocs}`);
  await page.screenshot({ path: process.env.SHOT, fullPage: true });
  return `tabs: ${tabs.join(", ")}. Jira starts "${jira.split("\n")[0]}". Google Docs starts "${gdocs.split("\n")[0]}"`;
});

await check("The X tab shows each part apart", async () => {
  const sentence = (n) => `Sentence ${n} ${"word ".repeat(37)}ends here.`;
  await transform([1, 2, 3].map(sentence).join(" "));
  await page.getByRole("tab", { name: "X thread" }).click();
  const labels = await page.getByText(/^Part \d+ of \d+$/).allInnerTexts();
  assert(labels.join("|") === "Part 1 of 3|Part 2 of 3|Part 3 of 3", `labels: ${labels.join("|")}`);
  const parts = await page.locator("p.whitespace-pre-wrap").allInnerTexts();
  parts.forEach((part, index) => assert(part.endsWith(`${index + 1}/3`), `part ${index + 1}: ${part.slice(-10)}`));
  return labels.join(", ");
});

await check("An empty textarea shows no error", async () => {
  await transform("");
  assert((await alertText()) === "", `alert: ${await alertText()}`);
  assert((await page.getByText("No output. The source is empty.").count()) > 0, "no empty output message");
});

await check("The Google Docs tab copies rich text: the clipboard holds both entries", async () => {
  const markdown = "## Setup\n\nRun the **check** first.\n";
  await transform(markdown);
  await page.getByRole("tab", { name: "Google Docs" }).click();
  const gdocs = await page.locator("pre").innerText();
  // The plain entry must be the source of the result, not the textarea of now.
  await source.fill("edited after the transform");
  await button("Copy as rich text").click();
  await button("Copied").waitFor({ timeout: 5000 });
  const entries = await readClipboard();
  assert(entries["text/plain"] === markdown, `text/plain: ${JSON.stringify(entries["text/plain"])}`);
  assert((entries["text/html"] ?? "").includes(gdocs), `text/html: ${JSON.stringify(entries["text/html"])}`);
  return `types: ${Object.keys(entries).join(", ")}. text/html read back: ${JSON.stringify(entries["text/html"])}`;
});

log("NOT RUN  A paste into Google Docs keeps the heading\n      It needs a Google account in the browser. The human runs it.");

log("\n## markdown-import");

await check("A markdown file loads unchanged", async () => {
  const post = "# Post\n\nA line with  two spaces  \n\n* a star list\n\t- a tab\n";
  await fileInput.setInputFiles({ name: "post.md", mimeType: "text/markdown", buffer: Buffer.from(post) });
  await waitForValue((value) => value === post);
});

await check("An oversized file is refused", async () => {
  const before = await source.inputValue();
  await fileInput.setInputFiles({ name: "big.md", mimeType: "text/markdown", buffer: Buffer.alloc(2 * 1024 * 1024, 97) });
  await alert.waitFor({ timeout: 5000 });
  const message = await alertText();
  assert(message.includes("1 MB"), `alert: ${message}`);
  assert((await source.inputValue()) === before, "the textarea changed");
  return `message: "${message}"`;
});

await check("An unsupported file is refused", async () => {
  const before = await source.inputValue();
  await fileInput.setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: Buffer.from([137, 80, 78, 71]) });
  await page.waitForFunction(() => document.querySelector('main [role="alert"]')?.textContent.includes(".docx"));
  const message = await alertText();
  for (const extension of [".md", ".markdown", ".txt", ".html", ".docx"]) assert(message.includes(extension), `alert: ${message}`);
  assert((await source.inputValue()) === before, "the textarea changed");
  return `message: "${message}"`;
});

await check("An .html file loads as markdown", async () => {
  const html = '<h2>Setup</h2><p>See <a href="https://example.com">docs</a>.</p><script>alert(1)</script>';
  await fileInput.setInputFiles({ name: "page.html", mimeType: "text/html", buffer: Buffer.from(html) });
  await waitForValue((value) => value.includes("## Setup"));
  const value = await source.inputValue();
  assert(value.includes("[docs](https://example.com)") && !value.includes("alert"), `value: ${value}`);
  return `textarea: ${JSON.stringify(value)}`;
});

await check("A .docx file loads as markdown, and stays in the browser", async () => {
  const before = requests.length;
  await fileInput.setInputFiles("lib/import/fixtures/sample.docx");
  await waitForValue((value) => value.includes("# Release notes"));
  const value = await source.inputValue();
  assert(value.includes("**check**") && value.includes("- one") && !value.includes("data:"), `value: ${value}`);
  const sent = requests.slice(before);
  const withBody = sent.filter((request) => request.body > 0 || request.method !== "GET");
  assert(withBody.length === 0, `requests with a body: ${withBody.map((r) => `${r.method} ${r.url}`).join(", ")}`);
  return `textarea: ${JSON.stringify(value)}\n      requests during the open: ${sent.length}, all GET with no body: ${sent.map((r) => r.url.replace(ORIGIN, "")).join(", ") || "none"}`;
});

// Task 9.2, part 2: the conversion code arrived on demand, after the first load.
await check("9.2 The conversion code loads on demand", async () => {
  const later = scripts.slice(firstLoadScripts);
  assert(later.some(({ body }) => body.includes("docs-internal-guid")), "html.ts never loaded");
  assert(later.some(({ body }) => body.includes("convertToHtml")), "docx.ts never loaded");
  return `${later.length} scripts after the first load: ${later.map((s) => s.url.replace(ORIGIN, "")).join(", ")}`;
});

await check("Rich text becomes markdown (SIMULATED Google Docs HTML, not a real capture)", async () => {
  await writeClipboard({
    "text/html":
      '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-run"><h2 dir="ltr"><span style="font-weight:400;">Setup</span></h2><p dir="ltr"><span style="font-weight:400;">Run the </span><span style="font-weight:700;">check</span><span style="font-weight:400;"> first.</span></p></b>',
    "text/plain": "Setup\nRun the check first.",
  });
  await button("Paste rich text").click();
  await waitForValue((value) => value.includes("## Setup"));
  const value = await source.inputValue();
  assert(value.includes("Run the **check** first."), `value: ${value}`);
  return `textarea: ${JSON.stringify(value)}`;
});

await check("A clipboard with no rich text changes nothing", async () => {
  const before = await source.inputValue();
  await page.evaluate(() => navigator.clipboard.writeText("plain text only"));
  await button("Paste rich text").click();
  await page.waitForFunction(() => document.querySelector('main [role="alert"]')?.textContent.includes("no rich text"));
  assert((await source.inputValue()) === before, "the textarea changed");
  return `message: "${await alertText()}"`;
});

await check("A normal paste does not convert", async () => {
  // VS Code puts both entries on the clipboard when it copies markdown.
  await writeClipboard({ "text/html": "<div><span>## Setup</span></div>", "text/plain": "## Setup\n\n- a" });
  await source.fill("");
  await source.focus();
  await page.keyboard.press("ControlOrMeta+V");
  await waitForValue((value) => value !== "");
  const value = await source.inputValue();
  assert(value === "## Setup\n\n- a", `value: ${JSON.stringify(value)}`);
});

await check("The page converts the textarea (Convert Jira text)", async () => {
  await source.fill("h2. Setup");
  await button("Convert Jira text").click();
  await waitForValue((value) => value === "## Setup");
});

await check("The Jira output converts back through the page", async () => {
  const markdown = "## Setup\n\nA **bold** and `code` [link](https://example.com).\n";
  await transform(markdown);
  await page.getByRole("tab", { name: "Jira" }).click();
  await source.fill(await page.locator("pre").innerText());
  await button("Convert Jira text").click();
  await waitForValue((value) => value === markdown.trimEnd());
});

log("\n## page fixes, docs/reviews/2026-09-27-add-jira-gdocs-and-import.md");

await check("Finding 17: Convert Jira text runs once for each edit", async () => {
  await source.fill("*bold*");
  await button("Convert Jira text").click();
  await waitForValue((value) => value === "**bold**");
  assert(await button("Convert Jira text").isDisabled(), "the control stays on after the conversion");
  await source.fill("**bold** and *more*");
  assert(await button("Convert Jira text").isEnabled(), "the control stays off after an edit");
});

await check("Finding 18: Convert Jira text clears an old message", async () => {
  await page.evaluate(() => navigator.clipboard.writeText("plain text only"));
  await button("Paste rich text").click();
  await alert.waitFor({ timeout: 5000 });
  await source.fill("h2. Setup");
  await button("Convert Jira text").click();
  await waitForValue((value) => value === "## Setup");
  assert((await alertText()) === "", `alert: ${await alertText()}`);
});

await check("Finding 16: rich text with only an inline image changes nothing", async () => {
  await source.fill("my draft");
  await writeClipboard({ "text/html": '<img src="data:image/png;base64,AAAA">', "text/plain": "" });
  await button("Paste rich text").click();
  await page.waitForFunction(() => document.querySelector('main [role="alert"]')?.textContent.includes("found no text"));
  assert((await source.inputValue()) === "my draft", "the textarea changed");
  return `message: "${await alertText()}"`;
});

// A fresh tab has no conversion code yet, and each script request waits 2 s. The .docx import is
// still running when the edit lands. The check also waits until the .docx code arrives, so it cannot
// pass because the import never ran.
await check("Finding 6: an edit during a slow import stays", async () => {
  const slow = await context.newPage();
  const bodies = [];
  slow.on("response", async (response) => {
    if (response.request().resourceType() === "script") bodies.push(await response.text().catch(() => ""));
  });
  await slow.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
  await slow.route("**/*.js", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.continue();
  });
  await slow.locator('input[type="file"]').setInputFiles("lib/import/fixtures/sample.docx");
  await slow.locator("#source").fill("typed during the import");
  const arrived = () => bodies.some((body) => body.includes("convertToHtml"));
  for (let tries = 0; tries < 300 && !arrived(); tries++) await slow.waitForTimeout(100);
  await slow.waitForTimeout(1000);
  const value = await slow.locator("#source").inputValue();
  await slow.close();
  assert(arrived(), "the .docx code never arrived");
  assert(value === "typed during the import", `value: ${JSON.stringify(value)}`);
  return "the .docx code arrived after the edit, and the textarea kept the edit";
});

await browser.close();
writeFileSync(process.env.OUT, `${results.join("\n")}\n`);
const failed = results.filter((line) => line.startsWith("FAIL")).length;
console.log(`\n${results.filter((line) => line.startsWith("PASS")).length} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
