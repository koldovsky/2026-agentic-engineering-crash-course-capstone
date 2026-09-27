import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");
const SCRIPT = join(ROOT, "scripts", "generate-seed.mjs");
const DATA_FILE = join(ROOT, "data", "etfs.json");

afterEach(() => {
  if (existsSync(DATA_FILE)) {
    rmSync(DATA_FILE);
  }
});

function runGenerator() {
  execFileSync("node", [SCRIPT], { cwd: ROOT, stdio: "pipe" });
}

describe("generate-seed", () => {
  // Scenario: Deterministic output
  it.fails("produces byte-for-byte identical data/etfs.json on two consecutive runs", () => {
    runGenerator();
    const first = readFileSync(DATA_FILE, "utf-8");

    runGenerator();
    const second = readFileSync(DATA_FILE, "utf-8");

    expect(first).toBe(second);
  });

  // Scenario: No network calls
  // SC-1: the WHEN condition ("without network access") is not mechanically enforced here —
  // the test verifies the generator produces valid output, but does not block or intercept
  // network I/O. A script that secretly fetched live data would still pass if the network
  // were available. Manual verification: confirm generate-seed.mjs contains no import of
  // node:http, node:https, node-fetch, undici, or similar.
  it.fails("produces valid JSON output without requiring network access", () => {
    runGenerator();
    const content = readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(content);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThanOrEqual(35);
    // CR-4: upper bound aligned with the "approximately 40" test below (was 50, now 45)
    expect(parsed.length).toBeLessThanOrEqual(45);
  });

  it.fails("generates approximately 40 ETF records", () => {
    runGenerator();
    const parsed = JSON.parse(readFileSync(DATA_FILE, "utf-8")) as unknown[];
    expect(parsed.length).toBeGreaterThanOrEqual(35);
    expect(parsed.length).toBeLessThanOrEqual(45);
  });
});
