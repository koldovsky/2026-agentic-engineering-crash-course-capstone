/**
 * Pure validation for the raw business request (FR-7).
 * @trace FR-7
 *
 * `validateRawBusinessRequest` trims the input and rejects only an empty
 * result. There is no character minimum and no word minimum. A rejection is
 * `{ ok: false, message: "Enter a business request." }` so the page can show
 * that string inline. An eligible value is `{ ok: true }`. The function is
 * synchronous and must not call the network.
 */
import http from "node:http";
import https from "node:https";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateRawBusinessRequest } from "./validation";

const EMPTY_MESSAGE = "Enter a business request.";

afterEach(() => {
  vi.restoreAllMocks();
});

function readResult(input: string) {
  const result = validateRawBusinessRequest(input);
  expect(result).not.toBeInstanceOf(Promise);
  return result;
}

describe("validateRawBusinessRequest", () => {
  it.each([
    ["empty string", ""],
    ["single space", " "],
    ["spaces only", "   "],
    ["single tab", "\t"],
    ["tabs only", "\t\t\t"],
    ["mixed spaces and tabs", " \t \t "],
    ["mixed whitespace", " \n\t\r "],
  ])("rejects %s", (_label, input) => {
    expect(readResult(input)).toEqual({
      ok: false,
      message: EMPTY_MESSAGE,
    });
  });

  it.each([
    ["single word", "reports"],
    ["single character", "a"],
    ["longer non-empty string", "Need a weekly sales report for the regional team"],
    ["non-empty after trim", "  reports  "],
    ["two words", "weekly reports"],
  ])("accepts %s with no length minimum", (_label, input) => {
    expect(readResult(input)).toEqual({ ok: true });
  });

  it("does not call the network", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const httpSpy = vi.spyOn(http, "request");
    const httpsSpy = vi.spyOn(https, "request");

    expect(readResult("")).toEqual({
      ok: false,
      message: EMPTY_MESSAGE,
    });
    expect(readResult(" \t ")).toEqual({
      ok: false,
      message: EMPTY_MESSAGE,
    });
    expect(readResult("reports")).toEqual({ ok: true });
    expect(readResult("Need a weekly sales report")).toEqual({ ok: true });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(httpSpy).not.toHaveBeenCalled();
    expect(httpsSpy).not.toHaveBeenCalled();
  });
});
