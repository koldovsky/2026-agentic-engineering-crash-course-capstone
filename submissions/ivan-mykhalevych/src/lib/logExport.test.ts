import { describe, expect, it } from "vitest";
import type { Attempt } from "./attempts";
import { exportAttemptsJson, exportFileName, newestFirst } from "./logExport";

const attemptAt = (at: number): Attempt => ({
  at,
  level: "middle",
  total: 1,
  correct: 1,
  percent: 100,
  results: [{ id: "m1", topic: "Collections", correct: true }],
});

const exportedAt = Date.UTC(2026, 8, 30, 23, 59, 0);

describe("newestFirst (spec R15)", () => {
  it("orders by time, newest first, without mutating the input", () => {
    const log = [attemptAt(2), attemptAt(3), attemptAt(1)];
    expect(newestFirst(log).map((a) => a.at)).toEqual([3, 2, 1]);
    expect(log.map((a) => a.at)).toEqual([2, 3, 1]);
  });

  it("returns an empty list for an empty log", () => {
    expect(newestFirst([])).toEqual([]);
  });
});

describe("exportAttemptsJson (spec R15)", () => {
  it("contains the profile name, an ISO export time and the attempts", () => {
    const log = [attemptAt(5)];
    const parsed = JSON.parse(exportAttemptsJson("Ann", log, exportedAt));
    expect(parsed).toEqual({ profile: "Ann", exportedAt: "2026-09-30T23:59:00.000Z", attempts: log });
  });

  it("is indented by two spaces", () => {
    expect(exportAttemptsJson("Ann", [], exportedAt)).toContain('\n  "profile": "Ann"');
  });
});

describe("exportFileName (spec R15)", () => {
  it("builds a slug from the profile name and the UTC date", () => {
    expect(exportFileName("Ann Lee", exportedAt)).toBe("java-trainer-ann-lee-2026-09-30.json");
  });

  it("collapses symbols into single dashes and trims them", () => {
    expect(exportFileName("  --Bob!!  the   Builder--  ", exportedAt)).toBe("java-trainer-bob-the-builder-2026-09-30.json");
  });

  it("falls back to profile when nothing usable is left", () => {
    expect(exportFileName("!!!", exportedAt)).toBe("java-trainer-profile-2026-09-30.json");
    expect(exportFileName("ÄÖ", exportedAt)).toBe("java-trainer-profile-2026-09-30.json");
  });
});
