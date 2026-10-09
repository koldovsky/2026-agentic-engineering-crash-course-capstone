import { describe, expect, it } from "vitest";
import {
  MAX_PROFILES,
  addProfile,
  ensureProfile,
  parseProfiles,
  removeProfile,
  switchProfile,
  validateProfileName,
} from "./profiles";
import type { ProfilesState } from "./profiles";

const empty: ProfilesState = { profiles: [], activeId: null };
const ann = { id: "a", name: "Ann" };
const bob = { id: "b", name: "Bob" };
const both: ProfilesState = { profiles: [ann, bob], activeId: "a" };

function idSequence() {
  let next = 0;
  return () => `id${next++}`;
}

describe("parseProfiles (spec R10)", () => {
  it("round-trips a valid state", () => {
    expect(parseProfiles(JSON.stringify(both))).toEqual(both);
  });

  it("returns the empty state for null, invalid JSON and non-objects", () => {
    expect(parseProfiles(null)).toEqual(empty);
    expect(parseProfiles("not json")).toEqual(empty);
    expect(parseProfiles("[1]")).toEqual(empty);
    expect(parseProfiles("42")).toEqual(empty);
  });

  it("drops invalid and duplicate profiles and fixes the active id", () => {
    const raw = JSON.stringify({
      profiles: [ann, { id: "b", name: "ann" }, { id: "", name: "X" }, { id: "c", name: "  " }, { id: "a", name: "Zed" }],
      activeId: "zzz",
    });
    expect(parseProfiles(raw)).toEqual({ profiles: [ann], activeId: "a" });
  });

  it("keeps at most the maximum number of profiles", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ id: `p${i}`, name: `Name${i}` }));
    expect(parseProfiles(JSON.stringify({ profiles: many, activeId: "p0" })).profiles).toHaveLength(MAX_PROFILES);
  });

  it("has a null active id when there are no profiles", () => {
    expect(parseProfiles(JSON.stringify({ profiles: [], activeId: "a" }))).toEqual(empty);
  });
});

describe("validateProfileName (spec R10)", () => {
  it("trims a valid name", () => {
    expect(validateProfileName(" Bob ", [ann])).toEqual({ ok: true, name: "Bob" });
  });

  it("rejects an empty name", () => {
    expect(validateProfileName("   ", [])).toMatchObject({ ok: false });
  });

  it("rejects a name longer than 24 characters and accepts exactly 24", () => {
    expect(validateProfileName("x".repeat(25), [])).toMatchObject({ ok: false });
    expect(validateProfileName("x".repeat(24), [])).toMatchObject({ ok: true });
  });

  it("rejects a duplicate name regardless of case", () => {
    expect(validateProfileName("ANN", [ann])).toMatchObject({ ok: false });
  });
});

describe("addProfile (spec R10)", () => {
  it("adds the profile and makes it active", () => {
    const result = addProfile(empty, "Ann", idSequence());
    expect(result).toEqual({ ok: true, state: { profiles: [{ id: "id0", name: "Ann" }], activeId: "id0" } });
  });

  it("returns an error for an invalid name", () => {
    expect(addProfile(both, "ann", idSequence())).toMatchObject({ ok: false });
  });

  it("returns an error when the maximum is reached", () => {
    const makeId = idSequence();
    let state = empty;
    for (let i = 0; i < MAX_PROFILES; i++) {
      const result = addProfile(state, `P${i}`, makeId);
      if (result.ok) state = result.state;
    }
    expect(addProfile(state, "One more", makeId)).toMatchObject({ ok: false });
  });

  it("does not mutate its input", () => {
    const copy = JSON.parse(JSON.stringify(both));
    addProfile(both, "Cy", idSequence());
    expect(both).toEqual(copy);
  });
});

describe("switchProfile and removeProfile (spec R10)", () => {
  it("switches to an existing profile", () => {
    expect(switchProfile(both, "b").activeId).toBe("b");
  });

  it("ignores an unknown id", () => {
    expect(switchProfile(both, "zzz")).toEqual(both);
  });

  it("removes a non-active profile and keeps the active one", () => {
    expect(removeProfile(both, "b")).toEqual({ profiles: [ann], activeId: "a" });
  });

  it("moves the active profile to the first remaining one", () => {
    expect(removeProfile(both, "a")).toEqual({ profiles: [bob], activeId: "b" });
  });

  it("ends with no active profile when the last one is removed", () => {
    expect(removeProfile({ profiles: [ann], activeId: "a" }, "a")).toEqual(empty);
  });

  it("ignores an unknown id on removal", () => {
    expect(removeProfile(both, "zzz")).toEqual(both);
  });
});

describe("ensureProfile (spec R10)", () => {
  it("adds an active Default profile when there are none", () => {
    expect(ensureProfile(empty, idSequence())).toEqual({
      profiles: [{ id: "id0", name: "Default" }],
      activeId: "id0",
    });
  });

  it("leaves existing profiles unchanged", () => {
    expect(ensureProfile(both, idSequence())).toEqual(both);
  });
});
