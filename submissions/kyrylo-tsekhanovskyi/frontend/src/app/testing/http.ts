import { HttpTestingController, TestRequest } from '@angular/common/http/testing';

/** Asserts exactly one pending request with this method and URL, and returns it. */
export function expectRequest(
  http: HttpTestingController,
  method: string,
  url: string,
): TestRequest {
  const requests = http.match({ method, url });
  expect(requests.length, `${method} ${url} requests`).toBe(1);
  return requests[0];
}

/** Asserts that no request with this method is pending. */
export function expectNoRequest(http: HttpTestingController, method: string): void {
  expect(http.match({ method }).length, `${method} requests`).toBe(0);
}
