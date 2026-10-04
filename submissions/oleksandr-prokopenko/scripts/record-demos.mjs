// Recording harness for the public site: each clip DRIVES a real flow in its own headless Chromium and
// ASSERTS the requirements it shows, so a recording is evidence only when its assertions passed.
//
// Output (read by scripts/check-recordings.mjs and the vision-verify workflow):
//   docs/qa/<OUT_DIR>/<id>.webm   video
//   docs/qa/<OUT_DIR>/<id>.png    settled still (one per proof moment; a clip may write several)
//   docs/qa/<OUT_DIR>/<id>.md     explainer
//   docs/qa/<OUT_DIR>/manifest.json
//
// Run: `npm run qa:record-demos` (ONLY=viewer for the viewer clips of public-sessions alone, ONLY=overview OUT_DIR=overview, ONLY=booking OUT_DIR=booking-requests, ONLY=admin-access OUT_DIR=admin-access, ONLY=session-admin OUT_DIR=session-admin or ONLY=about OUT_DIR=about for one group alone) against the running LOCAL stack (env: BASE_URL, OUT_DIR); it refuses any other address.
// The run first removes every session in the local database, then seeds the demo sessions through the seed command, so the
// Sessions grid shows only them. Three phases: clips that need the seeded sessions, clips that need none (the 404 page and the
// empty Sessions list), and clips that stop the backend (the static 5xx page Caddy sends).
import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createBookingsDb } from "../tests/e2e/support/bookings-db.mjs";
import { composeRunner, createSessionsDb } from "../tests/e2e/support/sessions-db.mjs";
import { clipRows, explainerText, failureStill, stillFile } from "./lib/recording-rows.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:8000";
/** ONLY=overview, booking, admin-access, session-admin, about or viewer records that group alone, so the earlier clips and their vision verdicts stay as they are. */
const ONLY = process.env.ONLY;
const OUT_DIR = join("docs/qa", process.env.OUT_DIR ?? "public-sessions");
const FIXTURES = "backend/src/test/resources/photos";
const SEED_ROOT = "deploy/data/seed";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
const BACKEND_WAIT_MS = 180_000;
const compose = composeRunner();
const sessionsDb = createSessionsDb({ run: compose });
const bookingsDb = createBookingsDb({ run: compose });

const assert = (cond, msg) => {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
};
const settle = async (page, ms = 1200) => {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(ms);
};
const pause = (page, ms = 700) => page.waitForTimeout(ms);

// ---------- seed: the sessions the clips show ----------
const SESSIONS = {
  newer: {
    title: "Булочка і перший сніг",
    files: [["quality/bulochka-2.jpg", "1.jpg"], ["quality/karpaty-055.jpg", "2.jpg"]],
    settings: { titleEn: "Bulochka and the first snow", storyUk: "Перший сніг у парку.", shootDate: "2026-11-07", genre: "event", overview: ["1.jpg", "2.jpg"] },
  },
  demo: {
    title: "Карпати: вечір біля води",
    files: [
      ["quality/karpaty-040.jpg", "1.jpg"],
      ["quality/karpaty-055.jpg", "2.jpg"],
      ["quality/karpaty-081.jpg", "3.jpg"],
      ["quality/karpaty-102.jpg", "4.jpg"],
      ["quality/bulochka-2.jpg", "5.jpg"],
    ],
    settings: {
      titleEn: "Carpathians: evening by the water",
      storyUk: "Тиха вечірня прогулянка біля води.\n\nСвітло лягало на воду майже без вітру.",
      storyEn: "A quiet evening walk by the water.\n\nThe light lay on the water with hardly any wind.",
      shootDate: "2026-10-12",
      genre: "event",
      overview: ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"],
    },
  },
  older: {
    title: "Портрети на березі",
    files: [["quality/karpaty-102.jpg", "1.jpg"], ["quality/karpaty-081.jpg", "2.jpg"]],
    settings: { titleEn: "Portraits on the bank", shootDate: "2026-08-23", genre: "event", overview: ["1.jpg", "2.jpg"] },
  },
};

function seed(key) {
  const spec = SESSIONS[key];
  const parent = `demo-${randomUUID()}`;
  const folder = join(SEED_ROOT, parent, spec.title);
  mkdirSync(folder, { recursive: true });
  for (const [fixture, name] of spec.files) cpSync(join(FIXTURES, fixture), join(folder, name));
  writeFileSync(join(folder, "session.json"), JSON.stringify(spec.settings));
  const run = spawnSync(
    "docker",
    ["compose", "-f", "deploy/compose.yml", "run", "--rm", "--no-deps", "backend", `--seed=/srv/data/seed/${parent}/${spec.title}`, "--wait"],
    { encoding: "utf8", timeout: 300_000 },
  );
  rmSync(join(SEED_ROOT, parent), { recursive: true, force: true });
  const output = `${run.stdout}\n${run.stderr}`;
  if (run.status !== 0) throw new Error(`the seed command for "${spec.title}" exited ${run.status}:\n${output.slice(-3000)}`);
  const session = /^session (\d+) ([a-z0-9]+(?:-[a-z0-9]+)*) /m.exec(output);
  if (!session) throw new Error(`the seed command printed no session:\n${output.slice(-3000)}`);
  const photos = {};
  for (const match of output.matchAll(/^photo (\d+) imported from (.+)$/gm)) photos[match[2].trim()] = Number(match[1]);
  return { id: Number(session[1]), address: session[2], title: spec.title, titleEn: spec.settings.titleEn, photos };
}

function removeSeeded(sessions) {
  sessionsDb.removeSessions(Object.values(sessions).map((session) => session.id));
}

/** The local database holds whatever earlier runs left (e2e sessions, the slice-2 demo); none of it belongs in a recording. */
function pinBaseline() {
  const ids = sessionsDb.listSessionIds();
  if (ids.length > 0) console.log(`removing ${ids.length} session(s) this run did not seed from the local database: ${ids.join(", ")}`);
  if (!sessionsDb.removeSessions(ids)) throw new Error("cannot clear the local database of other sessions");
}

async function waitForBackend() {
  const deadline = Date.now() + BACKEND_WAIT_MS;
  for (;;) {
    if ((await fetch(`${BASE_URL}/api/sessions`).catch(() => null))?.ok === true) return;
    if (Date.now() > deadline) throw new Error(`the backend did not answer again within ${BACKEND_WAIT_MS} ms`);
    await new Promise((wait) => setTimeout(wait, 2000));
  }
}

// ---------- helpers shared by the clips ----------
const viewerDialog = (page) => page.locator("dialog[open]");
const counter = (page) => viewerDialog(page).locator("[data-viewer-counter]");

async function expectCounter(page, place, total) {
  await counter(page).waitFor({ timeout: 5000 });
  const text = (await counter(page).innerText()).trim();
  assert(text === `${place} / ${total}`, `the viewer counter reads "${place} / ${total}" (it reads "${text}")`);
}

/** The grid holds exactly the three seeded cards, newest shoot date first. */
async function expectSeededGrid(page, seeded) {
  const addresses = await page.locator("[data-session-card]").evaluateAll((cards) => cards.map((card) => card.getAttribute("data-session-card")));
  const wanted = [seeded.newer, seeded.demo, seeded.older].map((session) => session.address);
  assert(JSON.stringify(addresses) === JSON.stringify(wanted), `the Sessions page holds exactly the seeded cards in date order (${wanted.join(", ")}), got ${addresses.join(", ")}`);
}

async function slowScroll(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  for (const fraction of [0.25, 0.5, 0.75, 1, 0.5, 0]) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(height * fraction));
    await pause(page, 500);
  }
}

/** Waits until every photo in the window (the open viewer's photo included) is decoded. */
async function waitForVisibleImages(page) {
  try {
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll("img")]
          .filter((img) => {
            const box = img.getBoundingClientRect();
            return box.width > 0 && box.bottom > 0 && box.top < window.innerHeight;
          })
          .every((img) => img.complete && img.naturalWidth > 0),
      null,
      { timeout: 20_000 },
    );
  } catch {
    throw new Error("assertion failed: every photo in the window finished loading before the still");
  }
}

/** Lazy photos below the fold load only when scrolled to, so scroll the page through and wait until every photo is decoded (capture-determinism rule 4). */
async function revealImages(page) {
  const step = Math.round(page.viewportSize().height * 0.6);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += step) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await pause(page, 150);
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const decoded = () => [...document.querySelectorAll("main img")].every((img) => img.complete && img.naturalWidth > 0);
  try {
    await page.waitForFunction(decoded, null, { timeout: 20_000 });
  } catch {
    const missing = await page.evaluate(() => [...document.querySelectorAll("main img")].filter((img) => !(img.complete && img.naturalWidth > 0)).length);
    throw new Error(`assertion failed: every photo on the page finished loading before the still (${missing} did not)`);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await pause(page, 200);
}

async function noSidewaysScroll(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 0, `no sideways scroll (the page is ${overflow}px wider than the window)`);
}

const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 };

// ---------- CLIPS ----------
// A clip with `stills` writes one settled still per proof moment (its `shot(name)` calls); a clip without them writes
// one still at the end. A dialog is fixed to the window, so its stills are viewport-only.
const CLIPS = [
  {
    id: "01-sessions-to-viewer-mouse",
    title: "Sessions page to a session page to the viewer, by mouse",
    context: { viewport: { width: 1280, height: 800 } },
    stills: [
      { name: "sessions-grid", title: "The Sessions page with the seeded cards", proof: "FR-4, FR-5", fullPage: true },
      { name: "session-page", title: "The session page: title, date, story, photos and neighbour links", proof: "FR-6, FR-7, FR-8", fullPage: true },
      { name: "viewer-open", title: "The viewer open at the clicked photo (counter 1 / 5)", proof: "FR-25" },
      { name: "viewer-next", title: "The viewer after the next button (counter 2 / 5)", proof: "FR-26" },
    ],
    run: async (page, seeded, shot) => {
      const { demo } = seeded;
      await page.goto(`${BASE_URL}/sessions`);
      await settle(page);
      const card = page.locator(`[data-session-card="${demo.address}"]`);
      assert(await card.isVisible(), "the Sessions page shows a card for the seeded session (FR-4)");
      assert((await card.locator("img").getAttribute("src"))?.includes("/media/"), "the card shows a cover photo (FR-5)");
      assert((await card.innerText()).includes(demo.title), "the card shows the title (FR-5)");
      assert((await card.innerText()).includes("12 жовтня 2026"), "the card shows the date (FR-5)");
      assert((await card.innerText()).includes("Подія"), "the card shows the genre (FR-5)");
      await expectSeededGrid(page, seeded);
      await pause(page);
      await shot("sessions-grid");
      await card.locator("a").click();
      await page.waitForURL(`**/sessions/${demo.address}`);
      assert(page.url().endsWith(`/sessions/${demo.address}`), "a click on the card opens the session page (FR-6)");
      await settle(page);
      assert((await page.locator("h1").innerText()).includes(demo.title), "the session page shows the title (FR-7)");
      assert((await page.locator("main").innerText()).includes("12 жовтня 2026"), "the session page shows the date (FR-7)");
      assert((await page.locator("[data-story]").count()) === 2, "the session page shows the story (FR-7)");
      const ids = Object.values(demo.photos);
      assert((await page.locator("main [data-photo-id]").count()) === ids.length, "every ready photo is on the page (FR-7)");
      const links = await page.locator(".session-links a").evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href")));
      assert(
        links.length === 2 && links[0] === `/sessions/${seeded.newer.address}` && links[1] === `/sessions/${seeded.older.address}`,
        `the page ends with a previous link to the newer session and a next link to the older one (FR-8), got ${JSON.stringify(links)}`,
      );
      await pause(page);
      await shot("session-page");
      await page.locator(`main [data-photo-id="${demo.photos["1.jpg"]}"]`).click();
      await viewerDialog(page).waitFor();
      await expectCounter(page, 1, ids.length);
      await pause(page, 1000);
      await shot("viewer-open");
      await viewerDialog(page).getByRole("button", { name: "Наступне фото" }).click();
      await expectCounter(page, 2, ids.length);
      await pause(page, 1000);
      await shot("viewer-next");
      await viewerDialog(page).getByRole("button", { name: "Попереднє фото" }).click();
      await expectCounter(page, 1, ids.length);
      await pause(page, 1000);
      await viewerDialog(page).getByRole("button", { name: "Закрити" }).click();
      assert((await viewerDialog(page).count()) === 0, "the close button closes the viewer (FR-25)");
      assert(page.url().endsWith(`/sessions/${demo.address}`), "the address did not change while the viewer was open (FR-25)");
    },
  },
  {
    id: "02-viewer-keyboard",
    title: "The viewer from the keyboard: Tab, Enter, arrow keys, Esc",
    context: { viewport: { width: 1280, height: 800 } },
    stills: [
      { name: "viewer-open-focus", title: "The viewer opened with Enter; focus is on its close button (counter 2 / 5)", proof: "FR-25, FR-30" },
      { name: "viewer-arrow-right", title: "The viewer after the right arrow key (counter 3 / 5)", proof: "FR-28" },
      { name: "focus-back", title: "After Esc the viewer is closed and the focus ring is on the photo that opened it", proof: "FR-29, FR-30" },
    ],
    run: async (page, { demo }, shot) => {
      await page.goto(`${BASE_URL}/sessions/${demo.address}`);
      await settle(page);
      const ids = Object.values(demo.photos);
      const second = page.locator(`main [data-photo-id="${demo.photos["2.jpg"]}"]`);
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press("Tab");
        await pause(page, 120);
        if (await second.evaluate((el) => el === document.activeElement)) break;
      }
      assert(await second.evaluate((el) => el === document.activeElement), "Tab reaches the second photo");
      await pause(page, 900);
      await page.keyboard.press("Enter");
      await viewerDialog(page).waitFor();
      await expectCounter(page, 2, ids.length);
      assert(await page.evaluate(() => Boolean(document.activeElement?.closest("dialog[open]"))), "focus moves into the viewer when it opens (FR-30)");
      await pause(page, 900);
      await shot("viewer-open-focus");
      await page.keyboard.press("ArrowRight");
      await expectCounter(page, 3, ids.length);
      await pause(page, 900);
      await shot("viewer-arrow-right");
      await page.keyboard.press("ArrowLeft");
      await expectCounter(page, 2, ids.length);
      await pause(page, 900);
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press("Tab");
        assert(await page.evaluate(() => Boolean(document.activeElement?.closest("dialog[open]"))), "focus stays inside the viewer while Tab is pressed (FR-30)");
        await pause(page, 250);
      }
      await page.keyboard.press("Escape");
      assert((await viewerDialog(page).count()) === 0, "Esc closes the viewer (FR-29)");
      assert(page.url().endsWith(`/sessions/${demo.address}`), "Esc leaves the visitor on the session page (FR-29)");
      assert(await second.evaluate((el) => el === document.activeElement), "focus returns to the photo that opened the viewer (FR-30)");
      await pause(page, 900);
      await shot("focus-back");
    },
  },
  {
    id: "03-viewer-swipe-phone",
    title: "The viewer by swipe on a phone",
    context: PHONE,
    stills: [
      { name: "viewer-open-phone", title: "The viewer on a phone, opened at the tapped photo (counter 1 / 5)", proof: "FR-25" },
      { name: "viewer-swiped-phone", title: "The viewer on a phone after a swipe to the left (counter 2 / 5)", proof: "FR-27" },
    ],
    run: async (page, { demo }, shot) => {
      await page.goto(`${BASE_URL}/sessions/${demo.address}`);
      await settle(page);
      const ids = Object.values(demo.photos);
      await page.locator(`main [data-photo-id="${demo.photos["1.jpg"]}"]`).tap();
      await viewerDialog(page).waitFor();
      await expectCounter(page, 1, ids.length);
      await pause(page, 900);
      await shot("viewer-open-phone");
      const box = await viewerDialog(page).locator("[data-viewer-stage]").boundingBox();
      const y = box.y + box.height / 2;
      const cdp = await page.context().newCDPSession(page);
      async function swipe(fromX, toX) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: fromX, y }] });
        for (let step = 1; step <= 8; step++) {
          await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: fromX + ((toX - fromX) * step) / 8, y: y + step }] });
          await pause(page, 30);
        }
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      }
      await swipe(box.x + box.width / 2 + 80, box.x + box.width / 2 - 80);
      await expectCounter(page, 2, ids.length);
      await pause(page, 900);
      await shot("viewer-swiped-phone");
      await swipe(box.x + box.width / 2 - 80, box.x + box.width / 2 + 80);
      await expectCounter(page, 1, ids.length);
      await pause(page, 900);
    },
  },
  ...[360, 1280, 2560].flatMap((width) => {
    const context = { viewport: { width, height: width === 360 ? 780 : width === 1280 ? 800 : 1440 } };
    return [
      {
        id: `04-sessions-${width}`,
        title: `The Sessions page at ${width} px`,
        proof: "FR-5, FR-17, NFR-29",
        context,
        run: async (page, seeded) => {
          const { demo } = seeded;
          await page.goto(`${BASE_URL}/sessions`);
          await settle(page);
          await expectSeededGrid(page, seeded);
          const card = page.locator(`[data-session-card="${demo.address}"]`);
          assert(await card.isVisible(), "the seeded session has a card (FR-5)");
          assert((await card.innerText()).includes("12 жовтня 2026"), "the card shows the date (FR-5)");
          const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
          assert(background === "rgb(255, 255, 255)", "the page background is white (FR-17)");
          await noSidewaysScroll(page);
          await slowScroll(page);
        },
      },
      {
        id: `05-session-${width}`,
        title: `A session page at ${width} px`,
        proof: "FR-7, FR-17, NFR-29",
        context,
        run: async (page, { demo }) => {
          await page.goto(`${BASE_URL}/sessions/${demo.address}`);
          await settle(page);
          assert((await page.locator("h1").innerText()).includes(demo.title), "the session page shows the title (FR-7)");
          assert((await page.locator("main [data-photo-id]").count()) === Object.keys(demo.photos).length, "the photos are on the page (FR-7)");
          const radius = await page.evaluate(() => [...document.querySelectorAll("img, button, a")].every((el) => getComputedStyle(el).borderRadius === "0px"));
          assert(radius, "the corners are square (FR-17)");
          await noSidewaysScroll(page);
          await slowScroll(page);
        },
      },
    ];
  }),
  {
    id: "10-viewer-fills-window",
    title: "The open viewer fills the window below its 56 px bar, at 1000 x 575 and at 1440 x 900",
    context: { viewport: { width: 1000, height: 575 } },
    stills: [
      { name: "viewer-1000x575", title: "The viewer at 1000 x 575: the photo takes almost all of the window below the bar, the arrows sit at the window edges, beside the photo or over it when it reaches the edge", proof: "FR-25, FR-17" },
      { name: "viewer-1440x900", title: "The viewer at 1440 x 900: the photo takes almost all of the window below the bar, the arrows sit at the window edges, beside the photo or over it when it reaches the edge", proof: "FR-25, FR-17" },
    ],
    run: async (page, { demo }, shot) => {
      await page.goto(`${BASE_URL}/sessions/${demo.address}`);
      await settle(page);
      await page.locator(`main [data-photo-id="${demo.photos["1.jpg"]}"]`).click();
      await viewerDialog(page).waitFor();
      await expectCounter(page, 1, Object.keys(demo.photos).length);
      for (const size of [{ width: 1000, height: 575 }, { width: 1440, height: 900 }]) {
        await page.setViewportSize(size);
        await waitForVisibleImages(page);
        await pause(page, 900);
        const drawn = await viewerDialog(page).locator("[data-viewer-photo] img").evaluate((image) => {
          const box = image.getBoundingClientRect();
          const scale = Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight);
          return { width: image.naturalWidth * scale, height: image.naturalHeight * scale };
        });
        const room = size.height - 56;
        const widthLimited = size.width / (drawn.width / drawn.height) <= room;
        assert(
          widthLimited ? drawn.width >= size.width * 0.95 : drawn.height >= room * 0.9,
          `the photo takes almost all of the ${size.width} x ${size.height} window below the 56 px bar (FR-25): drawn ${Math.round(drawn.width)} x ${Math.round(drawn.height)}, room ${size.width} x ${room}`,
        );
        await shot(`viewer-${size.width}x${size.height}`);
      }
    },
  },
  {
    id: "09-hover-changes-nothing",
    title: "Hovering a Sessions card photo and a session photo changes nothing",
    context: { viewport: { width: 1280, height: 800 } },
    stills: [
      { name: "hover-card", title: "The mouse rests on the demo session's card photo (its title underlines): full strength, no filter, nothing on top", proof: "FR-18" },
      { name: "hover-photo", title: "The mouse rests on the first session photo, centred in the window: full strength, no filter, nothing on top", proof: "FR-18" },
    ],
    run: async (page, seeded, shot) => {
      const unchangedOnHover = async (image, where) => {
        await image.evaluate((element) => element.scrollIntoView({ block: "center" }));
        const look = () =>
          image.evaluate((element) => {
            const style = getComputedStyle(element);
            const box = element.getBoundingClientRect();
            return { opacity: style.opacity, filter: style.filter, transform: style.transform, onTop: document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2) === element };
          });
        const before = await look();
        await image.hover();
        await pause(page, 600);
        const after = await look();
        assert(
          after.opacity === "1" && after.filter === "none" && after.transform === "none" && after.onTop && JSON.stringify(after) === JSON.stringify(before),
          `hovering ${where} changes nothing and puts nothing over it (FR-18), before ${JSON.stringify(before)}, after ${JSON.stringify(after)}`,
        );
      };
      await page.goto(`${BASE_URL}/sessions`);
      await settle(page);
      await unchangedOnHover(page.locator(`[data-session-card="${seeded.demo.address}"] img`), "the demo session's card photo");
      await shot("hover-card");
      await page.goto(`${BASE_URL}/sessions/${seeded.demo.address}`);
      await settle(page);
      await unchangedOnHover(page.locator("main [data-photo-id] img").first(), "the first session photo");
      await shot("hover-photo");
    },
  },
];

// ---------- the Overview (slice 4): seeded in the order older, demo, newer, so that is the Overview order ----------
/** The photo ids the Overview must show, in the photographer's order: each seeded session's photos as its overview list names them. */
function overviewIds(seeded) {
  return ["older", "demo", "newer"].flatMap((key) => Object.values(seeded[key].photos));
}

async function overviewFacts(page) {
  return page.locator("[data-overview-row]").evaluateAll((rows) =>
    rows.map((row) =>
      [...row.querySelectorAll("a")].map((link) => {
        const box = link.querySelector("img").getBoundingClientRect();
        return { href: link.getAttribute("href"), id: Number(/\/media\/(\d+)\//.exec(link.querySelector("img").getAttribute("src"))?.[1]), x: box.x, y: box.y, width: box.width, height: box.height };
      }),
    ),
  );
}

async function expectOverviewOrder(page, seeded) {
  const rows = await overviewFacts(page);
  const ids = rows.flat().map((link) => link.id);
  assert(JSON.stringify(ids) === JSON.stringify(overviewIds(seeded)), `the Overview shows the marked photos in the photographer's order (FR-1): wanted ${overviewIds(seeded)}, got ${ids}`);
  return rows;
}

/** The session page's rows (1, 2, 2 repeating; a portrait never alone while another photo follows), read off the photos' shapes. */
function expectOverviewRowSizes(rows) {
  const links = rows.flat();
  const pattern = [1, 2, 2];
  const wanted = [];
  for (let index = 0, step = 0; index < links.length; step++) {
    const portrait = links[index].height > links[index].width;
    const size = pattern[step % pattern.length] === 1 && portrait && index + 1 < links.length ? 2 : pattern[step % pattern.length];
    wanted.push(Math.min(size, links.length - index));
    index += size;
  }
  const got = rows.map((row) => row.length);
  assert(JSON.stringify(got) === JSON.stringify(wanted), `the Overview's rows hold 1, 2, 2 photos repeating like the session page (FR-17): wanted ${wanted}, got ${got}`);
  return wanted;
}

/** A row fills the content column or, when that would make its photos more than 800 px high, is 800 px high and centred in it. */
function expectFilledOrCapped(rows, left, right) {
  for (const [index, row] of rows.entries()) {
    const first = row[0];
    const last = row[row.length - 1];
    const extentLeft = first.x;
    const extentRight = last.x + last.width;
    const filled = Math.abs(extentLeft - left) <= 2 && Math.abs(extentRight - right) <= 2;
    const capped = Math.abs(first.height - 800) <= 1 && Math.abs((extentLeft + extentRight) / 2 - (left + right) / 2) <= 2 && extentLeft >= left - 2 && extentRight <= right + 2;
    assert(filled || capped, `row ${index + 1} runs from x = ${left} to ${right} or is 800 px high and centred (FR-17), it runs ${extentLeft} to ${extentRight}, ${first.height} px high`);
  }
}

const OVERVIEW_CLIPS = [
  {
    id: "10-overview-mouse",
    title: "The Overview, a click on a photo, the session page, by mouse",
    context: { viewport: { width: 1280, height: 800 } },
    stills: [
      { name: "overview", title: "The Overview: the marked photos of the three published sessions, rows of 1, 2, 2, 1 and 2 like the session page", proof: "FR-1, FR-17", fullPage: true },
      { name: "session-opened", title: "The session page a click on an Overview photo opened", proof: "FR-3" },
    ],
    run: async (page, seeded, shot) => {
      await page.goto(`${BASE_URL}/`);
      await settle(page);
      const rows = await expectOverviewOrder(page, seeded);
      expectOverviewRowSizes(rows);
      assert(rows.every((row) => row.every((link) => Math.abs(link.height - row[0].height) <= 1)), "every photo of a row has one height (FR-17)");
      await noSidewaysScroll(page);
      await pause(page);
      await shot("overview");
      const photo = seeded.demo.photos["3.jpg"];
      const link = page.locator(`a:has(img[src*="/media/${photo}/"])`);
      assert((await link.getAttribute("href")) === `/sessions/${seeded.demo.address}`, "the photo links to its session (FR-3)");
      await link.click();
      await page.waitForURL(`**/sessions/${seeded.demo.address}`);
      await settle(page);
      assert((await page.locator("h1").innerText()).includes(seeded.demo.title), "the session page shows the session's title (FR-3)");
      await pause(page, 900);
      await shot("session-opened");
    },
  },
  {
    id: "11-overview-keyboard",
    title: "The Overview from the keyboard: Tab to the photos, Enter opens the session",
    context: { viewport: { width: 1280, height: 800 } },
    stills: [
      { name: "focus-first", title: "Tab has reached the first photo: the focus mark is drawn on it", proof: "FR-3, NFR-35" },
      { name: "focus-second", title: "One more Tab: the focus mark is on the second photo", proof: "FR-3, NFR-35" },
      { name: "session-opened", title: "Enter on the second photo opened its session page", proof: "FR-3, NFR-35" },
    ],
    run: async (page, seeded, shot) => {
      await page.goto(`${BASE_URL}/`);
      await settle(page);
      const focused = () =>
        page.evaluate(() => {
          const links = [...document.querySelectorAll("[data-overview-row] a")];
          const active = document.activeElement;
          const style = active ? getComputedStyle(active) : null;
          return { index: active ? links.indexOf(active) : -1, outline: style ? `${style.outlineStyle} ${style.outlineWidth}` : "", visible: Boolean(active?.matches(":focus-visible")) };
        });
      let state = await focused();
      for (let i = 0; i < 40 && state.index !== 0; i++) {
        await page.keyboard.press("Tab");
        await pause(page, 120);
        state = await focused();
      }
      assert(state.index === 0, "Tab reaches the first photo (NFR-35)");
      assert(state.visible && state.outline === "solid 2px", `the first photo shows a visible focus mark (NFR-35), got ${JSON.stringify(state)}`);
      await pause(page, 900);
      await shot("focus-first");
      await page.keyboard.press("Tab");
      state = await focused();
      assert(state.index === 1 && state.visible && state.outline === "solid 2px", `the second photo has the focus and a visible mark (NFR-35), got ${JSON.stringify(state)}`);
      await pause(page, 900);
      await shot("focus-second");
      const second = await page.evaluate(() => document.querySelectorAll("[data-overview-row] a")[1].getAttribute("href"));
      await page.keyboard.press("Enter");
      await page.waitForURL(`**${second}`);
      await settle(page);
      assert(page.url().endsWith(second), `Enter opens the second photo's session (FR-3), got ${page.url()}`);
      await pause(page, 900);
      await shot("session-opened");
    },
  },
  ...[360, 390, 1280, 1440, 2560].map((width) => ({
    id: `12-overview-${width}`,
    title: `The Overview at ${width} px`,
    proof: "FR-1, FR-17, NFR-29",
    context: { viewport: { width, height: { 360: 780, 390: 844, 1280: 800, 1440: 900, 2560: 1440 }[width] } },
    run: async (page, seeded) => {
      await page.goto(`${BASE_URL}/`);
      await settle(page);
      const rows = await expectOverviewOrder(page, seeded);
      const links = rows.flat();
      const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      assert(background === "rgb(255, 255, 255)", "the page background is white (FR-17)");
      if (width < 720) {
        assert(links.every((link) => Math.abs(link.x - 16) <= 1 && Math.abs(link.x + link.width - (width - 16)) <= 1), `one column from x = 16 to ${width - 16} (FR-17)`);
      } else {
        expectOverviewRowSizes(rows);
        expectFilledOrCapped(rows, width === 2560 ? 624 : 64, { 2560: 1936, 1440: 1376, 1280: 1216 }[width]);
      }
      await noSidewaysScroll(page);
      await slowScroll(page);
    },
  })),
];

// ---------- booking request clips: the Order form, the Privacy page and the admin request pages ----------
const DEMO_MARK = "(демо)";
const SPRING_LOOPBACK = "http://127.0.0.1:8080";
const ORDER_TEXTS = {
  uk: { path: "/order", privacyPath: "/privacy", thanks: "Дякуємо, фотограф зв’яжеться з вами.", send: "Надіслати", type: "family", name: `Олена ${DEMO_MARK}` },
  en: { path: "/en/order", privacyPath: "/en/privacy", thanks: "Thank you, the photographer will contact you.", send: "Send", type: "family", name: `Olena ${DEMO_MARK}` },
};

async function fillOrder(page, lang, { contact = "@olena_k", delay = 0 } = {}) {
  const text = ORDER_TEXTS[lang];
  const enter = async (selector, value) => {
    if (delay > 0) {
      await page.locator(selector).click();
      await page.keyboard.type(value, { delay });
    } else {
      await page.locator(selector).fill(value);
    }
  };
  await enter("#order-name", text.name);
  if (contact !== "") await enter("#order-contact", contact);
  await page.locator("#order-shootType").selectOption(text.type);
  await enter("#order-preferredDate", lang === "uk" ? "кінець травня" : "end of May");
  await enter("#order-message", lang === "uk" ? "Хочемо сімейну зйомку в парку." : "We would like a family shoot in the park.");
  await page.locator("#order-consent").check();
}

async function expectNoSidewaysScroll(page, where) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 0, `${where}: no sideways scroll (the page is ${overflow}px wider than the window)`);
}

const orderStateClip = (lang, width) => ({
  id: `21-order-${lang}-${width}`,
  title: `The Order form in ${lang === "uk" ? "Ukrainian" : "English"} at ${width} px: empty, with a refused field, and sent`,
  context: { viewport: { width, height: width === 360 ? 780 : 900 } },
  stills: [
    { name: "empty", fullPage: true, title: "The empty form: five labelled fields, the consent line, Send", proof: "FR-102, FR-103, NFR-30" },
    { name: "error", fullPage: true, title: "Contact left empty: its message under the field, every other value kept", proof: "FR-108, FR-112, NFR-17" },
    { name: "sent", fullPage: true, title: "The thank-you in place of the form, with the way on to the sessions", proof: "FR-111, FR-113" },
  ],
  run: async (page, _seeded, shot) => {
    const text = ORDER_TEXTS[lang];
    await page.goto(`${BASE_URL}${text.path}`);
    await settle(page);
    assert((await page.locator("#order-name").count()) === 1, "the form shows its Name field (FR-102)");
    await expectNoSidewaysScroll(page, `${lang} ${width} empty`);
    await shot("empty");
    await fillOrder(page, lang, { contact: "" });
    await page.getByRole("button", { name: text.send }).click();
    await page.locator("#order-contact-error").waitFor();
    assert((await page.locator("#order-name").inputValue()) === text.name, "the typed name is still in the form after the refusal (FR-112)");
    assert(await page.locator("#order-consent").isChecked(), "the ticked consent is still ticked after the refusal (FR-112)");
    await expectNoSidewaysScroll(page, `${lang} ${width} error`);
    await pause(page, 600);
    await shot("error");
    await page.locator("#order-contact").fill("@olena_k");
    await page.getByRole("button", { name: text.send }).click();
    await page.getByRole("status").filter({ hasText: text.thanks }).waitFor({ timeout: 15_000 });
    assert((await page.locator("form").count()) === 0, "the form is replaced by the thank-you (FR-111)");
    await expectNoSidewaysScroll(page, `${lang} ${width} sent`);
    await shot("sent");
  },
});

const BOOKING_CLIPS = [
  {
    id: "20-order-request-under-a-minute",
    title: "A request sent through the Order form in under a minute, typed at 250 ms per key",
    context: { viewport: { width: 1440, height: 900 } },
    stills: [
      { name: "filled", title: "The form filled in by typing, before Send", proof: "FR-111, NFR-30" },
      { name: "thanks", title: "The thank-you after Send (the clip itself asserts that Send came within 60 seconds of opening the page)", proof: "FR-111, NFR-30" },
    ],
    run: async (page, _seeded, shot) => {
      const text = ORDER_TEXTS.uk;
      const began = Date.now();
      await page.goto(`${BASE_URL}${text.path}`);
      await settle(page, 2000);
      await fillOrder(page, "uk", { delay: 250 });
      await pause(page, 2000);
      await shot("filled");
      await page.getByRole("button", { name: text.send }).click();
      await page.getByRole("status").filter({ hasText: text.thanks }).waitFor({ timeout: 15_000 });
      const seconds = (Date.now() - began) / 1000;
      assert(seconds < 60, `the request is sent within 60 seconds of opening the page (took ${seconds.toFixed(1)} s) (NFR-30)`);
      assert((await page.getByRole("status").innerText()).trim() === text.thanks, `the thank-you reads "${text.thanks}" (FR-111)`);
      await pause(page, 2000);
      await shot("thanks");
      console.log(`    order-request-under-a-minute took ${seconds.toFixed(1)} s`);
      return { notes: [`Elapsed from opening the Order page to the thank-you: ${seconds.toFixed(1)} s, asserted under 60 s (NFR-30).`] };
    },
  },
  ...[1440, 360].flatMap((width) => ["uk", "en"].map((lang) => orderStateClip(lang, width))),
  ...["uk", "en"].map((lang) => ({
    id: `22-privacy-${lang}`,
    title: `The Privacy page in ${lang === "uk" ? "Ukrainian" : "English"}`,
    proof: "FR-11",
    context: { viewport: { width: 1440, height: 900 } },
    run: async (page) => {
      const response = await page.goto(`${BASE_URL}${ORDER_TEXTS[lang].privacyPath}`);
      await settle(page);
      assert(response.status() === 200, `the ${lang} Privacy page answers 200 (it answered ${response.status()})`);
      assert((await page.locator('main a[href^="/admin"]').count()) === 0, "the page links to no admin address (FR-16)");
      await expectNoSidewaysScroll(page, `${lang} privacy`);
    },
  })),
  {
    id: "23-admin-requests",
    title: "the photographer's request list and one request page",
    context: { viewport: { width: 1440, height: 900 } },
    stills: [
      { name: "list", fullPage: true, title: "The request list, newest first, with the counter in the heading", proof: "FR-95, FR-96, FR-100" },
      { name: "request", fullPage: true, title: "One request as plain text with its status and the delete button", proof: "FR-97, FR-98, FR-99" },
    ],
    run: async (page, _seeded, shot) => {
      const context = page.context();
      const login = await context.request.get(`${SPRING_LOOPBACK}/internal/test-login?email=owner%40example.test`, { maxRedirects: 0 });
      assert(login.status() === 302, `the test login answers 302 (it answered ${login.status()})`);
      bookingsDb.deleteAll();
      const send = (data) => context.request.post(`${BASE_URL}/api/booking-requests`, { data: { consent: true, ...data } });
      const earlier = await send({ name: `Іванна ${DEMO_MARK}`, contact: "@ivanna_photo", shootType: "event" });
      assert(earlier.status() === 202, `the first demo request is accepted (status ${earlier.status()})`);
      const sent = await send({ name: `Марія ${DEMO_MARK}`, contact: "+380 50 123 45 67", shootType: "portrait", preferredDate: "літо", message: "Перший рядок <b>не розмітка</b>\nДругий рядок" });
      assert(sent.status() === 202, `the demo request is accepted (status ${sent.status()})`);
      const row = bookingsDb.rowsWith(`Марія ${DEMO_MARK}`)[0];
      assert(row, "the demo request is saved");
      const first = bookingsDb.rowsWith(`Іванна ${DEMO_MARK}`)[0];
      assert(first, "the first demo request is saved");
      bookingsDb.setArrivedMinutesAgo(first.id, 47);
      await page.goto(`${BASE_URL}/admin/requests`);
      await settle(page);
      assert((await page.locator("main").innerText()).includes(`Марія ${DEMO_MARK}`), "the list shows the demo request (FR-95)");
      await shot("list");
      await page.goto(`${BASE_URL}/admin/requests/${row.id}`);
      await settle(page);
      assert((await page.locator("main").innerText()).includes("<b>не розмітка</b>"), "markup in a message is shown as plain text (FR-97)");
      await shot("request");
    },
  },
];

// ---------- admin clips: sign-in, access denied, the shell, the not-found page, and the photographer's whole session flow ----------
const owner = "owner@example.test";
const STRANGER = "stranger@example.test";
const SIGN_IN = "Увійти через Google";
const SIGN_IN_OTHER = "Увійти іншим акаунтом Google";
const SIGN_OUT = "Вийти";
const BACKEND_UNAVAILABLE = "Не вдалося перевірити вхід, бо сервер не відповідає. Спробуйте за хвилину.";
const SERVER_DETAILS = [/Exception/, /\bat [\w.$]+\(/, /ECONNREFUSED/, /fetch failed/, /PSQL/, /digest/i, /BackendUnavailable/, /stack/i];
const ADMIN_VIEW = { viewport: { width: 1440, height: 900 } };
const DAY_SECONDS = 86_400;

/** The test login of the local stack, which replaces Google; the SESSION cookie it sets reaches the site on port 8000 too. */
async function adminLogin(context, email) {
  const login = await context.request.get(`${SPRING_LOOPBACK}/internal/test-login?email=${encodeURIComponent(email)}`, { maxRedirects: 0 });
  assert(login.status() === 302, `the test login for ${email} answers 302 (it answered ${login.status()})`);
  return login.headers()["location"] ?? "";
}

const sessionCookie = async (context) => (await context.cookies(BASE_URL)).find((cookie) => cookie.name === "SESSION");

async function expectSessionCookie(page, where) {
  const cookie = await sessionCookie(page.context());
  assert(cookie, `${where}: the login set a SESSION cookie`);
  assert(cookie.httpOnly === true, `${where}: the SESSION cookie is HttpOnly (NFR-4)`);
  assert(cookie.sameSite === "Lax", `${where}: the SESSION cookie is SameSite=Lax (NFR-4), it is ${cookie.sameSite}`);
  const days = (cookie.expires - Date.now() / 1000) / DAY_SECONDS;
  assert(days >= 30 && days <= 401, `${where}: the SESSION cookie outlives the 30-day login and survives a browser restart (NFR-4), it ends in ${days.toFixed(1)} days`);
  assert(!(await page.evaluate(() => document.cookie)).includes("SESSION"), `${where}: page scripts cannot read the SESSION cookie (NFR-4)`);
  return days;
}

async function expectAdminMe(context, status, where) {
  const me = await context.request.get(`${BASE_URL}/api/admin/me`);
  assert(me.status() === status, `${where}: /api/admin/me answers ${status} (it answered ${me.status()})`);
}

async function waitUntil(what, check, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await check()) return;
    if (Date.now() > deadline) throw new Error(`assertion failed: ${what} within ${timeoutMs / 1000} s`);
    await new Promise((wait) => setTimeout(wait, 500));
  }
}

const ADMIN_CLIPS = [
  {
    id: "admin-signin",
    title: "The admin sign-in page, and the login cookie that sign-in sets",
    context: ADMIN_VIEW,
    stills: [{ name: null, title: "The sign-in page at 1440 px: one button and nothing else", proof: "FR-51, NFR-4", fullPage: true }],
    run: async (page, _seeded, shot) => {
      const response = await page.goto(`${BASE_URL}/admin`);
      await settle(page);
      assert(response.status() === 200, `/admin without a login answers 200 (it answered ${response.status()})`);
      assert((await page.locator("html").getAttribute("lang")) === "uk", "the sign-in page is Ukrainian (FR-58)");
      const link = page.getByRole("link", { name: SIGN_IN });
      assert(await link.isVisible(), "the sign-in page shows the Google sign-in button (FR-51)");
      assert((await link.getAttribute("href")) === "/oauth2/authorization/google", "the button leads to the Google sign-in (FR-51)");
      assert((await page.locator("input, textarea, select").count()) === 0, "the sign-in page has no input field (FR-51)");
      assert((await page.getByRole("button", { name: SIGN_OUT }).count()) === 0, "the sign-in page offers no sign-out (FR-51)");
      assert(!(await sessionCookie(page.context())), "an anonymous visit sets no login cookie (NFR-4)");
      await pause(page, 1000);
      await shot(null);
      await adminLogin(page.context(), owner);
      const days = await expectSessionCookie(page, "after the test login");
      return { notes: [`The login cookie set by the test login is HttpOnly, SameSite=Lax and persistent (it ends in ${days.toFixed(1)} days, so a browser restart keeps it) (NFR-4). The 30 days of the login itself end in the session row on the server, which a browser cannot read, so they are not asserted here; the Secure flag is a production setting and the local stack is plain http, so it is not asserted either.`] };
    },
  },
  {
    id: "admin-denied",
    title: "The access-denied page for an account that is not on the list",
    context: ADMIN_VIEW,
    stills: [{ name: null, title: "The access-denied page at 1440 px, with the way to sign in with another account", proof: "FR-54, NFR-17", fullPage: true }],
    run: async (page, _seeded, shot) => {
      const context = page.context();
      const location = await adminLogin(context, STRANGER);
      assert(location.endsWith("/admin/access-denied"), `an email missing from the list is sent to /admin/access-denied (FR-54), got ${location}`);
      await expectAdminMe(context, 401, "after the refused login");
      const response = await page.goto(`${BASE_URL}/admin/access-denied`);
      await settle(page);
      assert(response.status() === 200, `the access-denied page answers 200 (it answered ${response.status()})`);
      assert((await page.getByRole("heading", { level: 1 }).innerText()).trim() === "Доступ заборонено", "the heading reads «Доступ заборонено» (FR-54)");
      const text = await page.locator("main").innerText();
      assert(text.includes("Цей акаунт Google не має доступу до адмінки. Увійдіть іншим акаунтом Google."), "the page says plainly what is wrong and what to do next (NFR-17)");
      const other = page.getByRole("link", { name: SIGN_IN_OTHER });
      assert((await other.getAttribute("href")) === "/oauth2/authorization/google", "the button «Увійти іншим акаунтом Google» leads to the Google sign-in (NFR-17)");
      assert((await page.getByRole("button", { name: SIGN_OUT }).count()) === 0, "the refused account sees no admin content (FR-54)");
      await pause(page, 1000);
      await shot(null);
      await page.goto(`${BASE_URL}/admin`);
      await settle(page);
      assert(await page.getByRole("link", { name: SIGN_IN }).isVisible(), "the refused login was dropped: /admin shows the sign-in view again (FR-54)");
      await pause(page, 1000);
    },
  },
  {
    id: "admin-google-failed",
    title: "The sign-in page after a sign-in through Google failed",
    context: ADMIN_VIEW,
    stills: [{ name: null, title: "The sign-in page at 1440 px with the failure notice above the button", proof: "FR-51, NFR-17", fullPage: true }],
    run: async (page, _seeded, shot) => {
      const response = await page.goto(`${BASE_URL}/admin?error=google`);
      await settle(page);
      assert(response.status() === 200, `/admin?error=google answers 200 (it answered ${response.status()})`);
      const text = await page.locator("main").innerText();
      assert(text.includes("Не вдалося увійти через Google. Спробуйте ще раз."), "the page says that signing in failed and to try again (NFR-17)");
      assert(!SERVER_DETAILS.some((detail) => detail.test(text)), "the notice shows no technical detail (NFR-17)");
      assert(await page.getByRole("link", { name: SIGN_IN }).isVisible(), "the sign-in button stays under the notice (FR-51)");
      await pause(page, 1000);
      await shot(null);
    },
  },
  {
    id: "admin-shell",
    title: "A signed-in admin lands on the session list, and Sign out",
    context: ADMIN_VIEW,
    stills: [{ name: null, title: "The session list at 1440 px inside the admin shell, with the email and the Вийти button, reached from /admin", proof: "FR-53, FR-163", fullPage: true }],
    run: async (page, _seeded, shot) => {
      const context = page.context();
      await adminLogin(context, owner);
      const response = await page.goto(`${BASE_URL}/admin`);
      await settle(page);
      assert(response.status() === 200, `/admin with the login ends on a page that answers 200 (it answered ${response.status()})`);
      assert(new URL(page.url()).pathname === "/admin/sessions", `/admin with the login sends the admin to the session list (FR-53), the browser is at ${page.url()}`);
      assert((await page.locator("main").innerText()).includes("Вітаємо") === false, "the start page shows no welcome text (FR-53)");
      assert((await page.locator("header a", { hasText: "Адмінка" }).getAttribute("href")) === "/admin/sessions", "the «Адмінка» title links to the session list (FR-53)");
      const header = await page.locator("header").innerText();
      assert(header.includes("Адмінка") && header.includes(owner), `the shell header names the admin page and the signed-in email (FR-53), it reads ${JSON.stringify(header)}`);
      assert(await page.getByRole("button", { name: SIGN_OUT }).isVisible(), "the shell has the Вийти button (FR-163)");
      assert((await page.getByRole("link", { name: SIGN_IN }).count()) === 0, "a signed-in admin sees no sign-in button (FR-53)");
      await expectSessionCookie(page, "the shell");
      await pause(page, 1000);
      await shot(null);
      const ended = page.waitForResponse((answer) => answer.url().endsWith("/api/admin/sign-out"));
      await page.getByRole("button", { name: SIGN_OUT }).click();
      assert((await ended).status() === 204, "Вийти is answered with 204 (FR-163)");
      await page.getByRole("link", { name: SIGN_IN }).waitFor();
      await expectAdminMe(context, 401, "after Вийти");
      await pause(page, 1500);
    },
  },
  {
    id: "admin-notfound",
    title: "The admin page for an address that does not exist",
    context: ADMIN_VIEW,
    stills: [{ name: null, title: "The admin not-found page at 1440 px inside the shell, with the underlined «До адмінки» link", proof: "FR-58, NFR-17", fullPage: true }],
    run: async (page, _seeded, shot) => {
      await adminLogin(page.context(), owner);
      const response = await page.goto(`${BASE_URL}/admin/no-such-page`);
      await settle(page);
      assert(response.status() === 404, `an unknown admin address answers 404 (it answered ${response.status()})`);
      assert((await page.locator("html").getAttribute("lang")) === "uk", "the admin not-found page is Ukrainian (FR-58)");
      assert((await page.getByRole("heading", { level: 1 }).innerText()).trim() === "Сторінку не знайдено", "the heading reads «Сторінку не знайдено» (NFR-17)");
      assert((await page.locator("main").innerText()).includes("Такої сторінки в адмінці немає."), "the page says plainly that there is no such page (NFR-17)");
      assert((await page.locator(".site-header, .site-footer").count()) === 0, "the admin not-found page has none of the public header or footer (FR-58)");
      const back = page.locator("main a", { hasText: "До адмінки" });
      assert((await back.getAttribute("href")) === "/admin", "the link «До адмінки» leads to /admin (NFR-17)");
      await page.mouse.move(0, 0);
      const line = await back.evaluate((link) => getComputedStyle(link).textDecorationLine);
      assert(line.includes("underline"), `the link «До адмінки» is underlined at rest, so it reads as a link (NFR-17), its text-decoration-line is "${line}"`);
      await pause(page, 1000);
      await shot(null);
    },
  },
];

/** A login made while the backend runs, for the clip that opens /admin once it is stopped. */
async function loginCookie(browser) {
  const context = await browser.newContext();
  try {
    await adminLogin(context, owner);
    return (await sessionCookie(context)).value;
  } finally {
    await context.close();
  }
}

const BACKEND_DOWN_ADMIN_CLIPS = [
  {
    id: "admin-failed",
    title: "The admin page while the server does not answer",
    context: ADMIN_VIEW,
    stills: [{ name: null, title: "The page at 1440 px that says the server does not answer, with no server detail", proof: "NFR-12, NFR-17", fullPage: true }],
    run: async (page, seeded, shot) => {
      await page.context().addCookies([{ name: "SESSION", value: seeded.adminCookie, url: BASE_URL, httpOnly: true, sameSite: "Lax" }]);
      const response = await page.goto(`${BASE_URL}/admin`);
      await settle(page);
      assert(response.status() === 503, `/admin answers 503 while the backend is stopped (it answered ${response.status()})`);
      const text = await page.locator("body").innerText();
      assert(text.includes(BACKEND_UNAVAILABLE), "the page says plainly that the server does not answer and to try again in a minute (NFR-17)");
      assert(!SERVER_DETAILS.some((detail) => detail.test(text)), "the page shows no server detail (NFR-12)");
      assert(!text.includes(SIGN_OUT) && !text.includes(owner), "the page shows no admin content while the login cannot be checked (NFR-12)");
      assert((await page.locator("html").getAttribute("lang")) === "uk", "the page is Ukrainian (FR-58)");
      await pause(page, 1000);
      await shot(null);
    },
  },
];

const SESSION_TITLE = "Весна в парку (демо)";
const SESSION_PHOTOS = ["quality/karpaty-040.jpg", "quality/karpaty-102.jpg"];
const PREVIEW_BANNER = "Чернетка — відвідувачі цього не бачать";

async function editorOf(context, id) {
  const response = await context.request.get(`${BASE_URL}/api/admin/sessions/${id}`);
  assert(response.status() === 200, `GET /api/admin/sessions/${id} answers 200 (it answered ${response.status()})`);
  return response.json();
}

const photoOrder = (page) => page.locator(".photo-grid [data-photo-id]").evaluateAll((tiles) => tiles.map((tile) => Number(tile.getAttribute("data-photo-id"))));

const SESSION_ADMIN_CLIPS = [
  {
    id: "30-owner-flow",
    title: "the photographer's whole flow through the admin pages: create a session, upload two photos, reorder, set options, preview, publish, see it on the site",
    context: ADMIN_VIEW,
    stills: [
      { name: "session-new", id: "admin-session-new-1440", title: "The new-session form filled in with a title and a date", proof: "FR-60, FR-61", fullPage: true },
      { name: "editor-ready", id: "admin-editor-ready-1440", title: "The editor with the two uploaded photos ready as thumbnails", proof: "FR-71", fullPage: true },
      { name: "editor-reordered", id: "admin-editor-reordered-1440", title: "The editor after the second photo was moved to the first place; it is now the cover", proof: "FR-73, FR-75", fullPage: true },
      { name: "editor-options", id: "admin-editor-options-1440", title: "The photo options dialog over the editor, filled in (viewport capture)", proof: "FR-76, FR-77" },
      { name: "preview", id: "preview-banner-1440", title: "The draft preview in the public layout with its banner", proof: "FR-78", fullPage: true },
      { name: "published", id: "admin-published-1440", title: "The editor after Опублікувати: the status reads Опубліковано", proof: "FR-80, FR-81", fullPage: true },
      { name: "sessions-list", id: "admin-sessions-1440", title: "The session list with the published session and its two photos", proof: "FR-59", fullPage: true },
      { name: "public-session", id: "public-session-1440", title: "The public session page, with the photos in the new order", proof: "FR-81, FR-83, FR-73", fullPage: true },
    ],
    run: async (page, _seeded, shot) => {
      const context = page.context();
      await adminLogin(context, owner);
      let id = null;
      try {
        await page.goto(`${BASE_URL}/admin/sessions`);
        await settle(page);
        assert(await page.getByRole("link", { name: "Нова сесія" }).isVisible(), "the session list offers «Нова сесія» (FR-59)");
        await page.getByRole("link", { name: "Нова сесія" }).click();
        await page.waitForURL(/\/admin\/sessions\/new$/);
        await settle(page);
        await page.getByLabel("Назва українською").fill(SESSION_TITLE);
        await page.getByLabel("Дата зйомки", { exact: true }).fill("12.10.2026");
        await pause(page, 800);
        await shot("session-new");
        await page.getByRole("button", { name: "Створити сесію" }).click();
        await page.waitForURL(/\/admin\/sessions\/\d+$/);
        id = Number(new URL(page.url()).pathname.split("/").pop());
        await settle(page);
        const created = await editorOf(context, id);
        assert(created.status === "draft" && created.titleUk === SESSION_TITLE && created.shootDate === "2026-10-12", `a new session is a draft with the typed title and date (FR-60, FR-61), got ${JSON.stringify({ status: created.status, titleUk: created.titleUk, shootDate: created.shootDate })}`);

        let uploaded = created;
        for (const [index, fixture] of SESSION_PHOTOS.entries()) {
          await page.locator('input[type="file"]').setInputFiles({ name: `${index + 1}.jpg`, mimeType: "image/jpeg", buffer: readFileSync(join(FIXTURES, fixture)) });
          await waitUntil(`photo ${index + 1} is on the session`, async () => (uploaded = await editorOf(context, id)).photos.length === index + 1, 30_000);
        }
        await waitUntil("both uploaded photos are ready", async () => {
          uploaded = await editorOf(context, id);
          return uploaded.photos.filter((photo) => photo.status === "ready").length === 2;
        });
        await page.waitForFunction(() => document.querySelectorAll(".photo-grid [data-photo-id] img").length === 2, null, { timeout: 120_000 });
        const [first, second] = await photoOrder(page);
        assert(JSON.stringify(uploaded.photos.map((photo) => photo.id)) === JSON.stringify([first, second]), "the editor shows the photos in the order they were uploaded (FR-71)");
        await pause(page, 800);
        await shot("editor-ready");

        const handle = page.locator(`[data-photo-id="${second}"]`).getByRole("button", { name: "Перемістити фото" });
        await handle.focus();
        for (const key of ["Space", "ArrowLeft", "Space"]) {
          await page.keyboard.press(key);
          await pause(page, 500);
        }
        let reordered = uploaded;
        await waitUntil("the new order is saved", async () => {
          reordered = await editorOf(context, id);
          return reordered.photos[0]?.id === second;
        }, 30_000);
        assert(JSON.stringify(await photoOrder(page)) === JSON.stringify([second, first]), "the editor shows the moved photo first (FR-73)");
        assert(reordered.photos[0].cover === true && reordered.photos[1].cover === false, "until the photographer picks a cover, the first photo is the cover (FR-75)");
        await pause(page, 800);
        await shot("editor-reordered");

        await page.locator(`[data-photo-id="${second}"]`).getByRole("button", { name: "Параметри" }).click();
        const dialog = page.getByRole("dialog", { name: "Параметри фото" });
        await dialog.waitFor();
        await dialog.getByLabel("Опис українською").fill("Вечір біля води");
        await dialog.getByLabel("Опис англійською").fill("An evening by the water");
        await dialog.getByLabel("Показувати в Огляді").check();
        await pause(page, 800);
        await shot("editor-options");
        await dialog.getByRole("button", { name: "Зберегти" }).click();
        await dialog.waitFor({ state: "hidden" });
        let optioned = reordered;
        await waitUntil("the photo options are saved", async () => {
          optioned = await editorOf(context, id);
          return optioned.photos[0].descriptionUk === "Вечір біля води";
        }, 30_000);
        assert(optioned.photos[0].descriptionEn === "An evening by the water", "the English description is saved (FR-76)");
        assert(optioned.photos[0].overview === true && optioned.photos[1].overview === false, "only the marked photo is shown on the Overview (FR-77)");

        const draftList = await (await fetch(`${BASE_URL}/api/sessions`)).json();
        assert(!JSON.stringify(draftList).includes(SESSION_TITLE), "the public list does not show the draft (FR-81)");
        const previewHref = await page.getByRole("link", { name: "Попередній перегляд" }).getAttribute("href");
        assert(previewHref === `/preview/${id}`, `the preview link points at /preview/${id} (FR-78), got ${previewHref}`);
        await page.goto(`${BASE_URL}${previewHref}`);
        await settle(page);
        assert((await page.getByRole("status").innerText()).trim() === PREVIEW_BANNER, `the preview shows the banner "${PREVIEW_BANNER}" (FR-78)`);
        assert((await page.getByRole("heading", { level: 1 }).innerText()).trim() === SESSION_TITLE, "the preview shows the session title in the public layout (FR-78)");
        assert((await page.locator("header.site-header").count()) === 1, "the preview uses the public layout (FR-78)");
        await pause(page, 800);
        await shot("preview");

        await page.goto(`${BASE_URL}/admin/sessions/${id}`);
        await settle(page);
        await page.getByRole("button", { name: "Опублікувати" }).click();
        await page.locator(".status-tag").filter({ hasText: "Опубліковано" }).waitFor();
        assert((await editorOf(context, id)).status === "published", "Опублікувати makes the session published (FR-80, FR-81)");
        await pause(page, 800);
        await shot("published");

        await page.goto(`${BASE_URL}/admin/sessions`);
        await settle(page);
        const row = page.locator(`[data-session-id="${id}"]`);
        const rowText = await row.innerText();
        assert(rowText.includes(SESSION_TITLE) && rowText.includes("Опубліковано") && /\b2\b/.test(rowText), `the list row shows the title, the status and 2 photos (FR-59), it reads ${JSON.stringify(rowText)}`);
        assert((await page.locator("[data-session-id]").count()) === 1, "the list holds only the session of this clip (FR-59)");
        await pause(page, 800);
        await shot("sessions-list");

        await page.goto(`${BASE_URL}/sessions`);
        await settle(page);
        const card = page.locator("[data-session-card]").filter({ hasText: SESSION_TITLE });
        assert(await card.isVisible(), "the published session has a card on the public Sessions page (FR-81, FR-83)");
        await card.locator("a").click();
        await page.waitForURL(/\/sessions\/[^/]+$/);
        await settle(page);
        assert((await page.getByRole("heading", { level: 1 }).innerText()).trim() === SESSION_TITLE, "the public session page shows the title (FR-81)");
        const shown = await page.locator("main [data-photo-id]").evaluateAll((photos) => photos.map((photo) => Number(photo.getAttribute("data-photo-id"))));
        assert(JSON.stringify(shown) === JSON.stringify([second, first]), `the public page shows the photos in the new order (FR-73), wanted ${[second, first]}, got ${shown}`);
        await pause(page, 800);
        await shot("public-session");
      } finally {
        if (id !== null) sessionsDb.removeSessions([id]);
      }
      assert(sessionsDb.listSessionIds().length === 0, "the clip deleted the session it made");
    },
  },
];

// ---------- About clips: the photographer's About screen in the admin, then the public About pages ----------
const ABOUT_PORTRAIT_FILE = "docs/design/assets/owner-portrait.jpg";
const ABOUT_DESIGN_FILE = "docs/design/canvas/About-1440.dc.html";
const ABOUT_ENGLISH_TEXT = "Hello, I am the photographer.\n\nI photograph events, portraits and families in Ukraine.";
const ABOUT_PARAGRAPH = /<p style="margin: 0; font-size: 16px; line-height: 26px">([^<]*)<\/p>/g;
const ABOUT_TOO_LONG = "Текст задовгий: можна до 5000 символів, зараз 5001.";

const aboutDesignParagraphs = () => [...readFileSync(ABOUT_DESIGN_FILE, "utf8").matchAll(ABOUT_PARAGRAPH)].map((match) => match[1]);

function aboutPsql(sql) {
  const result = compose(["exec", "-T", "postgres", "psql", "-U", "portfolio", "-d", "portfolio", "-At", "-v", "ON_ERROR_STOP=1", "-c", sql]);
  if (result.status !== 0) throw new Error(`psql failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

/** Puts the About row back as migration V9 leaves it and removes every session-less photo with its files. */
function resetAbout() {
  const designText = aboutDesignParagraphs().join("\n\n");
  assert(designText.length > 0, `the design file ${ABOUT_DESIGN_FILE} holds the About paragraphs`);
  const photos = aboutPsql("select id || '|' || original_path from photo where session_id is null")
    .split("\n")
    .filter((line) => line.includes("|"))
    .map((line) => line.split("|"));
  aboutPsql(
    `begin; update about_page set text_uk = '${designText.replaceAll("'", "''")}', text_en = null, portrait_photo_id = null, replacement_photo_id = null where id = 1; delete from photo where session_id is null; commit;`,
  );
  const paths = photos.flatMap(([id, original]) => [`/srv/data/media/${id}`, `/srv/data/drafts/${id}`, `/srv/data/staging/${id}`, `/srv/data/${original}`]);
  if (paths.length > 0) {
    const removed = compose(["exec", "-T", "backend", "rm", "-rf", ...paths]);
    if (removed.status !== 0) console.error(`clean-up: the files of the portraits ${photos.map(([id]) => id).join(",")} stay on disk: ${removed.stderr}`);
  }
}

/** The id of the portrait the admin clip uploaded, which the public clips look for. */
const aboutPortrait = { id: null };

const aboutOf = async (context) => {
  const response = await context.request.get(`${BASE_URL}/api/admin/about`);
  assert(response.status() === 200, `GET /api/admin/about answers 200 (it answered ${response.status()})`);
  return response.json();
};

const ABOUT_ADMIN_CLIPS = [
  {
    id: "40-about-admin",
    title: "the photographer's About screen: the V9 text, a portrait upload until it is ready, an English text, the save and the too-long refusal",
    context: ADMIN_VIEW,
    stills: [
      { name: "empty", id: "admin-about-empty-1440", title: "The About screen as migration V9 leaves it: the Ukrainian design text, an empty English field, no portrait", proof: "FR-93, FR-94", fullPage: true },
      { name: "portrait-ready", id: "admin-about-portrait-1440", title: "The About screen after the portrait upload settled: the portrait shown, no replacement under way", proof: "FR-94", fullPage: true },
      { name: "saved", id: "admin-about-saved-1440", title: "The About screen after the English text was saved: «Збережено» next to the button", proof: "FR-93", fullPage: true },
      { name: "too-long", id: "admin-about-too-long-1440", title: "A 5001-character Ukrainian text refused with the message under the field", proof: "FR-93", fullPage: true },
    ],
    run: async (page, _seeded, shot) => {
      const context = page.context();
      const design = aboutDesignParagraphs().join("\n\n");
      await adminLogin(context, owner);
      await page.goto(`${BASE_URL}/admin/about`);
      await settle(page);
      assert(new URL(page.url()).pathname === "/admin/about", `a signed-in admin stays on /admin/about, the browser is at ${page.url()}`);
      assert((await page.getByRole("heading", { level: 1 }).innerText()).trim() === "Про мене", "the heading reads «Про мене» (FR-93)");
      assert((await page.getByLabel("Текст українською").inputValue()) === design, "the Ukrainian field holds the V9 design text (FR-93)");
      assert((await page.getByLabel("Текст англійською (необов'язково)").inputValue()) === "", "the English field is empty (FR-93)");
      assert((await page.locator("main").innerText()).includes("Портрета ще немає."), "a fresh About page says there is no portrait yet (FR-94)");
      assert((await page.locator("[data-about-portrait]").count()) === 0, "no portrait is shown before the upload (FR-94)");
      assert(await page.getByRole("button", { name: "Обрати фото" }).isVisible(), "the screen offers «Обрати фото» (FR-94)");
      await pause(page, 800);
      await shot("empty");

      await page.locator('input[type="file"]').setInputFiles({ name: "owner-portrait.jpg", mimeType: "image/jpeg", buffer: readFileSync(ABOUT_PORTRAIT_FILE) });
      let view = null;
      await waitUntil("the uploaded portrait is ready and settled as the portrait", async () => {
        view = await aboutOf(context);
        return view.portrait?.status === "ready";
      });
      aboutPortrait.id = view.portrait.id;
      assert(view.replacement === null, "once the portrait is settled no replacement is left (FR-94)");
      await page.locator("[data-about-portrait] img").waitFor({ timeout: 30_000 });
      assert((await page.locator("[data-about-replacement]").count()) === 0, "no processing or failure note remains on the screen (FR-94)");
      assert(await page.getByRole("button", { name: "Замінити фото" }).isVisible(), "with a portrait the button reads «Замінити фото» (FR-94)");
      assert((await page.locator("[data-about-portrait] img").getAttribute("alt")) === "Поточний портрет", "the admin portrait has its fixed description (FR-94)");
      assert(!(await page.locator("main").innerText()).includes("Портрета ще немає."), "the no-portrait line is gone (FR-94)");
      await pause(page, 800);
      await shot("portrait-ready");

      await page.getByLabel("Текст англійською (необов'язково)").fill(ABOUT_ENGLISH_TEXT);
      await page.getByRole("button", { name: "Зберегти" }).click();
      await page.getByRole("status").filter({ hasText: "Збережено" }).waitFor();
      view = await aboutOf(context);
      assert(view.textEn === ABOUT_ENGLISH_TEXT, `the English text is saved (FR-93), the server holds ${JSON.stringify(view.textEn)}`);
      assert(view.textUk === design, "the Ukrainian V9 text is kept as it was (FR-93)");
      await pause(page, 800);
      await shot("saved");

      await page.getByLabel("Текст українською").fill("а".repeat(5001));
      await page.getByRole("button", { name: "Зберегти" }).click();
      await page.getByText(ABOUT_TOO_LONG).waitFor();
      assert((await page.getByText(ABOUT_TOO_LONG).count()) === 1, `the refusal reads «${ABOUT_TOO_LONG}» once (FR-93)`);
      assert((await aboutOf(context)).textUk === design, "a refused text changes nothing on the server (FR-93)");
      await pause(page, 800);
      await shot("too-long");

      await page.goto(`${BASE_URL}/admin/about`);
      await settle(page);
      assert((await page.getByLabel("Текст українською").inputValue()) === design, "after a reload the screen shows the saved Ukrainian text (FR-93)");
      assert((await page.getByLabel("Текст англійською (необов'язково)").inputValue()) === ABOUT_ENGLISH_TEXT, "after a reload the screen shows the saved English text (FR-93)");
      assert((await page.locator("[data-about-portrait] img").count()) === 1, "after a reload the screen shows the portrait (FR-94)");
      await pause(page, 800);
    },
  },
];

const ABOUT_PAGES = {
  uk: { path: "/about", heading: "Про мене", title: "Про мене — Фотограф", alt: "Портрет фотограф", orderHref: "/order" },
  en: { path: "/en/about", heading: "About", title: "About — Photographer", alt: "the photographer's portrait", orderHref: "/en/order" },
};

const boxOf = (page, selector) =>
  page.locator(selector).first().evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x + scrollX, y: rect.y + scrollY, right: rect.right + scrollX, bottom: rect.bottom + scrollY };
  });

function aboutPublicClip(width) {
  const phone = width < 720;
  const context = phone ? PHONE : { viewport: { width, height: width >= 2000 ? 1440 : 900 } };
  return {
    id: `41-about-public-${width}`,
    title: `The public About pages in Ukrainian and English at ${width} px`,
    context,
    stills: ["uk", "en"].map((lang) => ({
      name: lang,
      id: `about-${lang}-${width}`,
      title: `The ${lang === "uk" ? "Ukrainian" : "English"} About page at ${width} px with the portrait, the title and the text`,
      proof: "FR-10",
      fullPage: true,
    })),
    run: async (page, _seeded, shot) => {
      assert(Number.isInteger(aboutPortrait.id), "the admin About clip ran first and uploaded the portrait");
      const design = aboutDesignParagraphs();
      for (const lang of ["uk", "en"]) {
        const wanted = ABOUT_PAGES[lang];
        const response = await page.goto(`${BASE_URL}${wanted.path}`);
        await settle(page);
        assert(response.status() === 200, `${wanted.path} answers 200 (it answered ${response.status()})`);
        assert((await page.title()) === wanted.title, `${wanted.path} has the title «${wanted.title}» (FR-10)`);
        assert((await page.getByRole("heading", { level: 1 }).innerText()).trim() === wanted.heading, `${wanted.path} shows the title «${wanted.heading}» (FR-10)`);
        const image = page.locator("[data-about-portrait] img");
        assert(await image.isVisible(), `${wanted.path} shows the portrait (FR-10)`);
        assert((await image.getAttribute("alt")) === wanted.alt, `${wanted.path} describes the portrait as «${wanted.alt}» (FR-10)`);
        assert((await image.getAttribute("src"))?.includes(`/media/${aboutPortrait.id}/`) === true, `${wanted.path} shows the uploaded portrait, photo ${aboutPortrait.id} (FR-10)`);
        await waitForVisibleImages(page);
        assert(await image.evaluate((img) => img.complete && img.naturalWidth > 0), `${wanted.path} has the portrait decoded (FR-10)`);
        const paragraphs = await page.locator("[data-about-text] p").allInnerTexts();
        const expected = lang === "uk" ? design : ABOUT_ENGLISH_TEXT.split("\n\n");
        assert(JSON.stringify(paragraphs) === JSON.stringify(expected), `${wanted.path} shows the ${lang === "uk" ? "V9 Ukrainian" : "saved English"} text paragraph by paragraph (FR-10), got ${JSON.stringify(paragraphs)}`);
        assert((await page.locator("main [lang='uk']").count()) === 0, `${wanted.path} marks no part of its text as another language (FR-10)`);
        assert((await page.locator("[data-about-order] a").getAttribute("href")) === wanted.orderHref, `${wanted.path} links to the order page (FR-10)`);
        assert((await page.locator('a[href^="/admin"]').count()) === 0, `${wanted.path} links to no admin address (FR-16)`);
        const portrait = await boxOf(page, "[data-about-portrait] img");
        const title = await boxOf(page, "main h1");
        const text = await boxOf(page, "[data-about-text]");
        if (phone) {
          assert(title.bottom <= portrait.y && portrait.bottom <= text.y, `${wanted.path} at ${width} px stacks the title, the portrait and the text in that order (FR-10)`);
        } else {
          assert(text.x >= portrait.right && text.y < portrait.bottom, `${wanted.path} at ${width} px puts the text beside the portrait (FR-10)`);
        }
        if (width === 2560) {
          const main = await boxOf(page, "main");
          assert(main.x >= 623 && main.x <= 626 && main.right >= 1934 && main.right <= 1938, `${wanted.path} at 2560 px keeps the content column from x = 624 to x = 1936, it spans ${main.x} to ${main.right}`);
        }
        await noSidewaysScroll(page);
        await pause(page, 800);
        await shot(lang);
      }
    },
  };
}

const ABOUT_PUBLIC_CLIPS = [1280, 1440, 2560, 390].map(aboutPublicClip);

// ---------- clips that need no seeded session ----------
const LANGS = {
  uk: {
    notFound: "Сторінку не знайдено",
    failed: "Сторінка не завантажилася",
    empty: "Тут поки немає сесій",
    notFoundPath: "/sessions/nemaye-takoi",
    listPath: "/sessions",
    overview: "/",
    sessions: "/sessions",
  },
  en: {
    notFound: "Page not found",
    failed: "This page could not load",
    empty: "There are no sessions here yet",
    notFoundPath: "/en/sessions/no-such-session",
    listPath: "/en/sessions",
    overview: "/en",
    sessions: "/en/sessions",
  },
};

async function expectPlainPage(page, lang, status, heading, atLeast = false) {
  const where = `${lang} ${page.url()}`;
  assert(atLeast ? status >= 500 : status === 404, `the ${where} answers ${atLeast ? "a 5xx" : "404"} (it answered ${status})`);
  assert((await page.locator("h1").innerText()).trim() === heading, `the ${where} heading reads "${heading}"`);
  assert((await page.locator("html").getAttribute("lang")) === lang, `the ${where} page is marked lang="${lang}"`);
  assert((await page.locator(`main a[href="${LANGS[lang].overview}"]`).count()) === 1, `the ${where} page links back to the Overview`);
  await noSidewaysScroll(page);
}

const BARE_CLIPS = [
  {
    id: "06-not-found",
    title: "The Page not found page, in both languages",
    phase: "bare",
    context: { viewport: { width: 1280, height: 800 } },
    stills: [
      { name: "not-found-uk", fullPage: true, title: "An unknown session address, Ukrainian: status 404, the heading, links back", proof: "FR-9, FR-12, NFR-17" },
      { name: "not-found-en", fullPage: true, title: "An unknown session address, English: status 404, the heading, links back", proof: "FR-9, FR-12, NFR-17" },
    ],
    run: async (page, _seeded, shot) => {
      for (const lang of ["uk", "en"]) {
        const response = await page.goto(`${BASE_URL}${LANGS[lang].notFoundPath}`);
        await settle(page);
        await expectPlainPage(page, lang, response.status(), LANGS[lang].notFound);
        assert((await page.locator(`main a[href="${LANGS[lang].sessions}"]`).count()) === 1, `the ${lang} page links to the Sessions page`);
        await shot(`not-found-${lang}`);
      }
    },
  },
  {
    id: "07-empty-sessions",
    title: "The Sessions page with no published session, in both languages",
    phase: "bare",
    context: { viewport: { width: 1280, height: 800 } },
    stills: [
      { name: "empty-uk", fullPage: true, title: "The Ukrainian Sessions page with no card and the plain message", proof: "FR-4" },
      { name: "empty-en", fullPage: true, title: "The English Sessions page with no card and the plain message", proof: "FR-4" },
    ],
    run: async (page, _seeded, shot) => {
      const list = await (await fetch(`${BASE_URL}/api/sessions`)).json();
      assert(Array.isArray(list) && list.length === 0, `the database holds no published session (the API lists ${JSON.stringify(list).slice(0, 80)})`);
      for (const lang of ["uk", "en"]) {
        const response = await page.goto(`${BASE_URL}${LANGS[lang].listPath}`);
        await settle(page);
        assert(response.status() === 200, `the ${lang} Sessions page answers 200 (it answered ${response.status()})`);
        assert((await page.locator("[data-session-card]").count()) === 0, `the ${lang} Sessions page shows no card (FR-4)`);
        assert((await page.locator("main").innerText()).includes(LANGS[lang].empty), `the ${lang} Sessions page says "${LANGS[lang].empty}" (FR-4)`);
        assert((await page.locator("header.site-header").count()) === 1 && (await page.locator("footer.site-footer").count()) === 1, `the ${lang} page keeps its header and footer`);
        await noSidewaysScroll(page);
        await shot(`empty-${lang}`);
      }
    },
  },
];

// ---------- clips that run with the backend stopped ----------
const DOWN_CLIPS = [
  {
    id: "08-backend-down",
    title: "The failed page Caddy sends while the backend is stopped, in both languages",
    phase: "backend-down",
    context: { viewport: { width: 1280, height: 800 } },
    stills: [
      { name: "failed-uk", fullPage: true, title: "The Ukrainian failed page: status 5xx, the message, the link to the Overview", proof: "NFR-12, NFR-17" },
      { name: "failed-en", fullPage: true, title: "The English failed page: status 5xx, the message, the link to the Overview", proof: "NFR-12, NFR-17" },
    ],
    run: async (page, _seeded, shot) => {
      for (const lang of ["uk", "en"]) {
        const response = await page.goto(`${BASE_URL}${LANGS[lang].listPath}`);
        await settle(page);
        await expectPlainPage(page, lang, response.status(), LANGS[lang].failed, true);
        const text = await page.locator("body").innerText();
        assert(!/Exception|ECONNREFUSED|fetch failed|digest|stack/i.test(text), `the ${lang} failed page shows no server detail (NFR-12)`);
        await shot(`failed-${lang}`);
      }
    },
  },
];

/** The viewer clips written again replace their rows, which drops their old vision verdicts on purpose; the other clips' rows stay as they are. */
const VIEWER_CLIPS = new Set(["01-sessions-to-viewer-mouse", "02-viewer-keyboard", "03-viewer-swipe-phone", "10-viewer-fills-window"]);

async function keepOtherClips(fresh) {
  const old = JSON.parse(await readFile(join(OUT_DIR, "manifest.json"), "utf8")).results;
  const kept = old.filter((row) => ![...VIEWER_CLIPS].some((clip) => row.id.startsWith(clip)));
  return [...fresh, ...kept].sort((a, b) => a.id.localeCompare(b.id));
}

async function ensureServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE_URL}/healthz`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`the site is not reachable at ${BASE_URL}: start the stack with npm run stack:up`);
}

async function recordClip(browser, clip, seeded) {
  const size = clip.context.viewport;
  const video = { width: Math.min(size.width, 1280), height: Math.round((Math.min(size.width, 1280) / size.width) * size.height) };
  const context = await browser.newContext({ ...clip.context, recordVideo: { dir: join(OUT_DIR, "raw"), size: video } });
  const page = await context.newPage();
  const stills = clip.stills ?? [{ name: null, title: clip.title, proof: clip.proof, fullPage: true }];
  const taken = new Set();
  const shot = async (name) => {
    const still = stills.find((candidate) => candidate.name === name);
    assert(still, `the clip ${clip.id} declares no still named ${name}`);
    await settle(page, 600);
    if (still.fullPage) await revealImages(page);
    else await waitForVisibleImages(page);
    await page.screenshot({ path: stillFile(OUT_DIR, clip, still), fullPage: still.fullPage === true });
    taken.add(name);
  };
  let asserted = true;
  let error = null;
  let failureTaken = false;
  let notes = [];
  try {
    notes = (await clip.run(page, seeded, shot))?.notes ?? [];
    await settle(page);
    if (!clip.stills) await shot(null);
    for (const still of stills) assert(taken.has(still.name), `the still ${still.name} was not taken`);
  } catch (e) {
    asserted = false;
    error = e.message;
    failureTaken = await page.screenshot({ path: failureStill(OUT_DIR, clip), fullPage: true }).then(() => true, () => false);
  }
  const recording = page.video();
  await page.close();
  await context.close();
  const videoPath = join(OUT_DIR, `${clip.id}.webm`);
  if (recording) await recording.saveAs(videoPath).catch(() => {});
  const explainer = join(OUT_DIR, `${clip.id}.md`);
  await writeFile(explainer, explainerText({ clip, stills, taken, asserted, error, failureTaken, notes }));
  const proves = [...new Set(stills.flatMap((still) => still.proof.split(", ")))].join(", ");
  console.log(`${asserted ? "ok " : "FAIL"} ${clip.id} (${proves})${error ? `: ${error}` : ""}`);
  return { asserted, rows: clipRows({ clip, stills, taken, outDir: OUT_DIR, video: videoPath, explainer, asserted, failureTaken }) };
}

async function main() {
  if (!LOCAL_HOSTS.has(new URL(BASE_URL).hostname)) {
    throw new Error(`refusing to record against ${BASE_URL}: the run deletes every session of the local database, so it works on the local stack only`);
  }
  await ensureServer();
  if (ONLY !== "viewer" && existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(join(OUT_DIR, "raw"), { recursive: true });
  const seeded = {};
  if (ONLY === "booking") {
    bookingsDb.deleteAll();
  } else if (ONLY === "admin-access" || ONLY === "session-admin") {
    pinBaseline();
    bookingsDb.deleteAll();
  } else if (ONLY === "about") {
    resetAbout();
  } else {
    pinBaseline();
    for (const key of ["older", "demo", "newer"]) seeded[key] = seed(key);
    console.log(`seeded ${Object.values(seeded).map((s) => `${s.id} ${s.address}`).join(", ")}`);
  }
  const browser = await chromium.launch();
  const results = [];
  let anyFailed = false;
  const run = async (clips, shared = seeded) => {
    for (const clip of clips) {
      const outcome = await recordClip(browser, clip, shared);
      results.push(...outcome.rows);
      if (!outcome.asserted) anyFailed = true;
    }
  };
  try {
    if (ONLY === "viewer") {
      await run(CLIPS.filter((clip) => VIEWER_CLIPS.has(clip.id)));
    } else if (ONLY === "overview") {
      await run(OVERVIEW_CLIPS);
    } else if (ONLY === "booking") {
      await run(BOOKING_CLIPS);
    } else if (ONLY === "session-admin") {
      await run(SESSION_ADMIN_CLIPS);
    } else if (ONLY === "about") {
      await run([...ABOUT_ADMIN_CLIPS, ...ABOUT_PUBLIC_CLIPS]);
    } else if (ONLY === "admin-access") {
      await run(ADMIN_CLIPS);
      const adminCookie = await loginCookie(browser);
      compose(["stop", "backend"]);
      try {
        await run(BACKEND_DOWN_ADMIN_CLIPS, { adminCookie });
      } finally {
        compose(["start", "backend"]);
        await waitForBackend();
      }
    } else {
      await run([...CLIPS, ...OVERVIEW_CLIPS]);
      removeSeeded(seeded);
      await run(BARE_CLIPS);
      compose(["stop", "backend"]);
      try {
        await run(DOWN_CLIPS);
      } finally {
        compose(["start", "backend"]);
        await waitForBackend();
      }
    }
  } finally {
    await browser.close();
    removeSeeded(seeded);
    if (ONLY === "booking") bookingsDb.deleteAll();
    if (ONLY === "about") resetAbout();
  }
  await rm(join(OUT_DIR, "raw"), { recursive: true, force: true });
  await writeFile(join(OUT_DIR, "manifest.json"), `${JSON.stringify({ kind: "demo", results: ONLY === "viewer" ? await keepOtherClips(results) : results }, null, 2)}\n`);
  console.log(`\nwrote ${results.length} still(s) to ${OUT_DIR}. Validate: node scripts/check-recordings.mjs`);
  process.exit(anyFailed ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
