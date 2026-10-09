import { describe, expect, it } from "vitest";
import { MAX_PROFILES, addProfile, validateProfileName } from "./profiles";
import type { ProfilesState } from "./profiles";

const withNames = (names: string[]): ProfilesState => ({
  profiles: names.map((name, i) => ({ id: `p${i}`, name })),
  activeId: null,
});

describe("profile error codes (spec R10)", () => {
  it("reports an empty name with the code empty", () => {
    expect(validateProfileName("   ", [])).toEqual({ ok: false, error: "empty" });
  });

  it("reports a long name with the code too-long", () => {
    expect(validateProfileName("x".repeat(25), [])).toEqual({ ok: false, error: "too-long" });
  });

  it("reports a used name with the code duplicate, ignoring case", () => {
    expect(validateProfileName("ANN", withNames(["Ann"]).profiles)).toEqual({ ok: false, error: "duplicate" });
  });

  it("passes the name codes through addProfile", () => {
    expect(addProfile(withNames(["Ann"]), "ann", () => "id")).toEqual({ ok: false, error: "duplicate" });
  });

  it("reports the profile limit with the code too-many", () => {
    const full = withNames(Array.from({ length: MAX_PROFILES }, (_, i) => `P${i}`));
    expect(addProfile(full, "Extra", () => "id")).toEqual({ ok: false, error: "too-many" });
  });
});
