import { MAX_BODY_BYTES, handleApi, routeError } from "../../../server/api";
import { readLimitedText } from "../../../server/body";
import { getDatabase } from "../../../server/db";

function jsonResponse(status: number, body: unknown, setCookie?: string): Response {
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (setCookie !== undefined) headers.set("Set-Cookie", setCookie);
  return Response.json(body, { status, headers });
}

async function respond(request: Request): Promise<Response> {
  const method = request.method;
  const path = new URL(request.url).pathname;
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  const routed = routeError({ method, path, origin, host });
  if (routed !== null) return jsonResponse(routed.status, routed.body);

  const body = method === "GET" ? "" : await readLimitedText(request, MAX_BODY_BYTES);
  if (body === null) return jsonResponse(413, { error: "body-too-large" });

  const result = handleApi(
    getDatabase(),
    {
      method,
      path,
      origin,
      host,
      contentType: request.headers.get("content-type"),
      cookie: request.headers.get("cookie"),
      body,
    },
    Date.now(),
    process.env.NODE_ENV === "production",
  );
  return jsonResponse(result.status, result.body, result.setCookie);
}

export { respond as GET, respond as POST, respond as PATCH, respond as DELETE };
