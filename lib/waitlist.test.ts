import { describe, expect, it } from "vitest";
import {
  EMAIL_INVALID_MESSAGE,
  EMAIL_REQUIRED_MESSAGE,
  nextErrorOnEdit,
  validateEmail,
  waitlistEmailSchema,
} from "@/lib/waitlist";

describe("waitlist messages", () => {
  it("match the specification wording exactly", () => {
    expect(EMAIL_REQUIRED_MESSAGE).toBe("Введіть електронну пошту.");
    expect(EMAIL_INVALID_MESSAGE).toBe("Введіть коректну адресу електронної пошти.");
  });
});

describe("waitlistEmailSchema", () => {
  it("rejects an empty value as required", () => {
    const result = waitlistEmailSchema.safeParse("");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(EMAIL_REQUIRED_MESSAGE);
  });

  it("rejects a whitespace-only value as required", () => {
    const result = waitlistEmailSchema.safeParse("   \t ");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(EMAIL_REQUIRED_MESSAGE);
  });

  it.each(["not-an-email", "user@", "@example.com", "user@@example.com"])(
    "rejects %j as an invalid format",
    (value) => {
      const result = waitlistEmailSchema.safeParse(value);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe(EMAIL_INVALID_MESSAGE);
    },
  );

  it("accepts a valid address", () => {
    const result = waitlistEmailSchema.safeParse("user@example.com");
    expect(result.success).toBe(true);
    expect(result.data).toBe("user@example.com");
  });

  it("accepts a padded valid address and trims it", () => {
    const result = waitlistEmailSchema.safeParse("  user@example.com  ");
    expect(result.success).toBe(true);
    expect(result.data).toBe("user@example.com");
  });
});

describe("validateEmail", () => {
  it("returns the first error message for invalid input", () => {
    expect(validateEmail("")).toEqual({ ok: false, error: EMAIL_REQUIRED_MESSAGE });
    expect(validateEmail("user@")).toEqual({ ok: false, error: EMAIL_INVALID_MESSAGE });
  });

  it("returns the trimmed email for valid input", () => {
    expect(validateEmail(" user@example.com ")).toEqual({ ok: true, email: "user@example.com" });
  });
});

describe("nextErrorOnEdit", () => {
  it("never introduces an error when none is shown", () => {
    expect(nextErrorOnEdit(null, "user@")).toBeNull();
    expect(nextErrorOnEdit(null, "")).toBeNull();
  });

  it("clears the shown error as soon as the value is valid", () => {
    expect(nextErrorOnEdit(EMAIL_INVALID_MESSAGE, "user@example.com")).toBeNull();
    expect(nextErrorOnEdit(EMAIL_REQUIRED_MESSAGE, "  user@example.com  ")).toBeNull();
  });

  it("makes the shown error follow the current invalid value", () => {
    expect(nextErrorOnEdit(EMAIL_REQUIRED_MESSAGE, "a")).toBe(EMAIL_INVALID_MESSAGE);
    expect(nextErrorOnEdit(EMAIL_INVALID_MESSAGE, "")).toBe(EMAIL_REQUIRED_MESSAGE);
    expect(nextErrorOnEdit(EMAIL_INVALID_MESSAGE, "user@")).toBe(EMAIL_INVALID_MESSAGE);
  });
});
