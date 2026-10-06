import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("unit test toolchain", () => {
  it("runs Vitest with Zod available", () => {
    expect(z.string().safeParse("ok").success).toBe(true);
  });
});
