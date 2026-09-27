import { describe, expect, it, vi } from "vitest";

/** Counts the calls that reach lib/transform, and then runs the real one. */
const spy = vi.hoisted(() => ({ calls: 0 }));

vi.mock("@/lib/transform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/transform")>();
  return {
    ...actual,
    transform: (markdown: string) => {
      spy.calls += 1;
      return actual.transform(markdown);
    },
  };
});

const { POST } = await import("./route");

const post = (body: string): Promise<Response> =>
  POST(new Request("http://localhost/api/transform", { method: "POST", body }));

describe("The route handler stays thin", () => {
  it("answers 200 with every output and the meta", async () => {
    const response = await post(JSON.stringify({ markdown: "# Title" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(["blog", "email", "gdocs", "jira", "linkedin", "meta", "x"]);
    expect(body.blog).toContain("<h1>Title</h1>");
  });

  it("answers 400 and names the field when the body holds no markdown", async () => {
    const response = await post("{}");
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("markdown");
  });

  it("answers 400 when the body is not valid JSON", async () => {
    const response = await post("not json");

    expect(response.status).toBe(400);
  });

  it("answers 413 for a body over 100 KB, and does not call the transform", async () => {
    const before = spy.calls;
    const markdown = "a".repeat(100 * 1024 + 1);

    const response = await post(JSON.stringify({ markdown }));
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(spy.calls).toBe(before);
    expect(body).not.toHaveProperty("blog");
  });

  it("answers 413 on the declared size, before it reads the body", async () => {
    const before = spy.calls;
    const request = new Request("http://localhost/api/transform", {
      method: "POST",
      headers: { "content-length": String(100 * 1024 + 1) },
      body: JSON.stringify({ markdown: "# Small body, large claim" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(spy.calls).toBe(before);
  });

  it("answers 200 for an empty markdown string, because an empty source is not an error", async () => {
    const response = await post(JSON.stringify({ markdown: "" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.x).toEqual([]);
  });
});
