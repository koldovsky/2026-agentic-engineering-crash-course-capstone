import { describe, expect, it } from "vitest";
import { PATCH, POST } from "./route";

const oversized = () => " ".repeat(100_001);

describe("route order of checks (spec R26)", () => {
  it("answers 404 for an unknown path even when the body is too large", async () => {
    const request = new Request("http://localhost:3000/api/nothing", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: oversized(),
    });
    const response = await POST(request);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not-found" });
  });

  it("answers 405 for a known path with the wrong method even when the body is too large", async () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "PATCH",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: oversized(),
    });
    const response = await PATCH(request);
    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ error: "method-not-allowed" });
  });
});
