// REFERENCE IMPLEMENTATION — automated, headless recording + validation harness.
//
// Replaces the old stack-coupled `record-demos.reference.ts` /
// `record-proof-recordings.reference.ts`. Lessons paid for in a real run:
//   - NEVER use the user's browser and NEVER trigger a Save-As dialog. This runs
//     its OWN background Playwright Chromium, fully headless, no interaction.
//   - "Record" and "prove the requirement" are the SAME step: every clip DRIVES
//     a real flow and ASSERTS the FRs it proves. The assertion IS the validation
//     — a clip that doesn't assert is not evidence.
//   - Pace clips so async content (maps, charts, fetches) actually renders before
//     the screenshot; capture a SETTLED full-page still, not the wrong moment.
//   - Stack-agnostic: needs only a running app at BASE_URL. No DB/ORM imports.
//     Seeding (if any) is a project hook, not baked in here.
//
// Output (consumed by scripts/check-recordings.mjs and the vision-verify workflow):
//   docs/qa/<outDir>/<id>.webm     video
//   docs/qa/<outDir>/<id>.png      settled full-page still
//   docs/qa/<outDir>/<id>.md       explainer (steps -> requirement)
//   docs/qa/<outDir>/manifest.json { results: [{ id, proof, video, screenshot, explainer, asserted }] }
//
// Run: `node scripts/record-demos.mjs`  (env: BASE_URL, OUT_DIR). Requires
// `@playwright/test` (or `playwright`) installed and the app already running.
import { chromium } from "@playwright/test";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = join("docs/qa", process.env.OUT_DIR ?? "demo-recordings");
const VIEWPORT = { width: 1280, height: 800 };
const assert = (cond, msg) => {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
};
// `settle` paces a clip so async content renders before we screenshot it.
const settle = async (page, ms = 1500) => {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(ms);
};

// ---- CLIPS: one per capability. Each `run` DRIVES the flow and ASSERTS the FRs
// it proves (replace these with the project's real flows). `proof` lists the ids.
const FAILURE_SENTENCE = "Generation failed. You can try Generate again.";
const VALIDATION_SENTENCE = "Enter a business request.";
const WEEKLY_REQUEST = "Need a weekly sales report for the regional team";
const WEEKLY_STORY =
  "As a regional manager, I want a weekly sales report, so that I can review team performance.";
const MONTHLY_REQUEST = "Need a monthly budget for the finance team";
const MONTHLY_STORY =
  "As a finance lead, I want a monthly budget summary, so that I can compare planned and actual spend.";
const PROVIDER_REQUEST = "Need a weekly sales report [[provider-error]]";

async function openApp(page) {
  const response = await page.goto(BASE_URL);
  assert(response !== null && response.status() < 500, "the page itself is not a generic HTTP 500");
  await settle(page, 300);
  const field = page.getByRole("textbox", { name: "Raw business request" });
  const generate = page.getByRole("button", { name: "Generate", exact: true });
  await field.waitFor();
  return { field, generate };
}

async function sawGenerateDisabled(page, generate) {
  const started = Date.now();
  while (Date.now() - started < 2000) {
    if (await generate.isDisabled()) return true;
    await page.waitForTimeout(40);
  }
  return false;
}

const CLIPS = [
  {
    id: "01-request-intake",
    title: "Public English intake validates empty input and disables Generate in flight",
    proof: "FR-1, FR-2, FR-7, FR-13, NFR-1, NFR-2, NFR-5",
    run: async (page) => {
      const { field, generate } = await openApp(page);
      assert(await field.isVisible(), "FR-1 the raw business request field is visible");
      assert(await field.isEditable(), "FR-1 the field is editable");
      assert(await generate.isVisible() && (await generate.isEnabled()), "FR-2 Generate is visible and enabled");
      assert((await page.getByText(/sign in|log in|sign up/i).count()) === 0, "NFR-2 there is no login step");
      assert((await page.locator('input[type="password"]').count()) === 0, "NFR-2 there is no password field");
      await field.fill("");
      await generate.click();
      assert(await page.getByText(VALIDATION_SENTENCE, { exact: true }).isVisible(), "FR-7 empty input shows Enter a business request.");
      assert((await page.getByText(FAILURE_SENTENCE, { exact: true }).count()) === 0, "FR-7 does not show the generation-failure sentence");
      assert(await generate.isEnabled(), "FR-7 Generate stays enabled after empty input");
      await field.fill(WEEKLY_REQUEST);
      await generate.click();
      assert(await sawGenerateDisabled(page, generate), "FR-13 Generate is disabled while the request is in flight");
      await page.getByRole("heading", { name: "User Story" }).waitFor({ timeout: 10000 });
      assert(await generate.isEnabled(), "FR-13 Generate is enabled again when the request finishes");
    },
  },
  {
    id: "02-requirement-generation",
    title: "Generate returns one story, acceptance criteria, and gap questions",
    proof: "FR-3, FR-4, FR-5, FR-9, FR-10, FR-11, NFR-4",
    run: async (page) => {
      const { field, generate } = await openApp(page);
      const started = Date.now();
      await field.fill(WEEKLY_REQUEST);
      await generate.click();
      await page.getByText(WEEKLY_STORY, { exact: true }).waitFor({ timeout: 10000 });
      assert(Date.now() - started < 30000, "NFR-4 the result arrives within 30 seconds");
      assert(await page.getByRole("heading", { name: "User Story" }).isVisible(), "FR-3 a User Story is shown");
      assert(WEEKLY_STORY.includes("As a") && WEEKLY_STORY.includes("I want") && WEEKLY_STORY.includes("so that"), "FR-9 the story has As a / I want / so that");
      assert(await page.getByRole("heading", { name: "Acceptance Criteria" }).isVisible(), "FR-4 Acceptance Criteria are shown");
      assert((await page.getByTestId("acceptance-criteria").locator("li").count()) >= 1, "FR-10 criteria are a bullet list");
      const questions = await page.getByTestId("clarifying-questions").locator("li").count();
      assert(questions >= 3 && questions <= 5, "FR-5 and FR-11 show 3 to 5 clarifying questions");
      assert((await page.getByText(FAILURE_SENTENCE, { exact: true }).count()) === 0, "a success does not show the failure sentence");
    },
  },
  {
    id: "03-result-review",
    title: "Labeled sections stay readable and a later success replaces them",
    proof: "FR-6, FR-12",
    run: async (page) => {
      const { field, generate } = await openApp(page);
      await field.fill(WEEKLY_REQUEST);
      await generate.click();
      await page.getByText(WEEKLY_STORY, { exact: true }).waitFor({ timeout: 10000 });
      for (const name of ["User Story", "Acceptance Criteria", "Clarifying Questions"]) {
        assert(await page.getByRole("heading", { name }).isVisible(), `FR-6 heading ${name} is visible`);
      }
      const selectable = await page.getByTestId("user-story").evaluate((node) => getComputedStyle(node).userSelect);
      assert(selectable !== "none", "FR-6 the story text is not blocked from native selection");
      await field.fill(MONTHLY_REQUEST);
      await generate.click();
      await page.getByText(MONTHLY_STORY, { exact: true }).waitFor({ timeout: 10000 });
      assert((await page.getByText(WEEKLY_STORY, { exact: true }).count()) === 0, "FR-12 the previous story is gone");
      assert(await page.getByText(MONTHLY_STORY, { exact: true }).isVisible(), "FR-12 only the new story remains");
    },
  },
  {
    id: "04-generation-failure",
    title: "A provider error shows a clear message and keeps the previous result",
    proof: "FR-8, NFR-3",
    run: async (page) => {
      const { field, generate } = await openApp(page);
      await field.fill(WEEKLY_REQUEST);
      await generate.click();
      await page.getByText(WEEKLY_STORY, { exact: true }).waitFor({ timeout: 10000 });
      await field.fill(PROVIDER_REQUEST);
      await generate.click();
      await page.getByRole("alert", { name: FAILURE_SENTENCE, exact: true }).waitFor({ timeout: 10000 });
      assert((await field.inputValue()) === PROVIDER_REQUEST, "FR-8 the raw request stays in the field");
      assert(await generate.isEnabled(), "FR-8 Generate can be used again");
      assert(await page.getByText(WEEKLY_STORY, { exact: true }).isVisible(), "the previous successful result stays visible");
      assert((await page.getByText("Internal Server Error").count()) === 0, "NFR-3 the page is not a generic HTTP 500");
    },
  },
  {
    id: "05-security-negative",
    title: "No login wall and no generic server error",
    proof: "NFR-2, NFR-3, FR-7",
    run: async (page) => {
      const { field, generate } = await openApp(page);
      assert(page.url().startsWith(BASE_URL), "NFR-2 the public page does not redirect to a login URL");
      assert((await page.getByText(/sign in|log in|sign up/i).count()) === 0, "NFR-2 anonymous use is not sent to a login step");
      assert((await page.locator('input[type="password"]').count()) === 0, "NFR-2 there is no password field");
      await field.fill("   ");
      await generate.click();
      assert(await page.getByText(VALIDATION_SENTENCE, { exact: true }).isVisible(), "FR-7 whitespace shows the validation message");
      assert((await page.getByText("Internal Server Error").count()) === 0, "NFR-3 whitespace input is not a generic HTTP 500");
      assert((await page.getByText(FAILURE_SENTENCE, { exact: true }).count()) === 0, "FR-7 whitespace does not show the generation-failure sentence");
    },
  },
];

async function ensureServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(BASE_URL);
      if (res.ok || res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`app not reachable at ${BASE_URL} — start it first (this harness never launches the user's browser)`);
}

async function main() {
  await ensureServer();
  if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(join(OUT_DIR, "raw"), { recursive: true });
  const browser = await chromium.launch(); // headless by default
  const results = [];
  let anyFailed = false;

  for (const clip of CLIPS) {
    const context = await browser.newContext({ viewport: VIEWPORT, recordVideo: { dir: join(OUT_DIR, "raw"), size: VIEWPORT } });
    const page = await context.newPage();
    let asserted = true;
    let error = null;
    try {
      await clip.run(page);
      await settle(page); // settle again before the proof still
    } catch (e) {
      asserted = false;
      anyFailed = true;
      error = e.message;
    }
    const shot = join(OUT_DIR, `${clip.id}.png`);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    const video = page.video();
    await page.close();
    await context.close();
    const videoPath = join(OUT_DIR, `${clip.id}.webm`);
    if (video) await video.saveAs(videoPath).catch(() => {});

    await writeFile(
      join(OUT_DIR, `${clip.id}.md`),
      `# ${clip.title}\n\n**Proves:** ${clip.proof}\n\n**Result:** ${asserted ? "asserted ✓" : `FAILED — ${error}`}\n\n![still](${clip.id}.png)\n`,
    );
    results.push({ id: clip.id, title: clip.title, proof: clip.proof, video: videoPath.replaceAll("\\", "/"), screenshot: shot.replaceAll("\\", "/"), explainer: join(OUT_DIR, `${clip.id}.md`).replaceAll("\\", "/"), asserted });
    console.log(`${asserted ? "✓" : "✗"} ${clip.id} (${clip.proof})${error ? ` — ${error}` : ""}`);
  }

  await rm(join(OUT_DIR, "raw"), { recursive: true, force: true });
  await writeFile(join(OUT_DIR, "manifest.json"), `${JSON.stringify({ kind: "demo", results }, null, 2)}\n`);
  await browser.close();
  console.log(`\nwrote ${results.length} clip(s) to ${OUT_DIR}. Validate: node scripts/check-recordings.mjs`);
  // A clip whose assertions failed is NOT evidence — fail so it gets fixed and re-recorded.
  process.exit(anyFailed ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
