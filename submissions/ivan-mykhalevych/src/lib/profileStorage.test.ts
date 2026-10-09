import { describe, expect, it } from "vitest";
import { parseProfiles, profileKey, serializeProfiles } from "./profiles";

describe("profile storage format (spec R11)", () => {
  it("serializes so that parseProfiles restores the same state", () => {
    const state = { profiles: [{ id: "a", name: "Ann" }, { id: "b", name: "Bob" }], activeId: "b" };
    expect(parseProfiles(serializeProfiles(state))).toEqual(state);
  });

  it("builds a per-profile key from a base and an id", () => {
    expect(profileKey("java-trainer-attempts", "p1")).toBe("java-trainer-attempts:p1");
  });

  it("gives different profiles different keys", () => {
    expect(profileKey("java-trainer-best", "a")).not.toBe(profileKey("java-trainer-best", "b"));
  });
});
