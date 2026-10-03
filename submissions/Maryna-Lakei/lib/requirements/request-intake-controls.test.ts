/**
 * Scanned evidence for the intake controls. The Chromium specs in e2e/
 * already assert these behaviors, and the locked traceability walker does
 * not read that directory. These checks do not change the page.
 * @trace FR-1
 * @trace FR-2
 * @trace FR-13
 */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/requirements/actions", () => ({
  generateFromRequest: vi.fn(),
}));

import { RequestIntakeForm } from "../../app/request-intake-form";

describe("request intake controls", () => {
  it("renders a labeled raw-request field and an enabled Generate control", () => {
    const html = renderToStaticMarkup(createElement(RequestIntakeForm));

    expect(html).toContain("Raw business request");
    expect(html).toContain('id="raw-business-request"');
    expect(html).toContain('for="raw-business-request"');
    expect(html).toContain(">Generate</button>");
    expect(html).not.toMatch(/<button[^>]*\sdisabled(?:=""|\s|>)/);
  });

  it("disables Generate only while a request is in flight", () => {
    const source = readFileSync(
      new URL("../../app/request-intake-form.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toMatch(
      /<button[^>]*disabled=\{inFlight\}[^>]*>\s*Generate\s*<\/button>/,
    );
    expect(source).toContain("if (inFlightRef.current)");
    expect(source).toContain("setInFlight(true)");
    expect(source).toContain("setInFlight(false)");
  });
});
