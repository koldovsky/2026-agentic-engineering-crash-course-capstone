import { baseURL } from '../playwright.config';

const TIMEOUT_MS = 60_000;

// Waits until the running stack reports healthy, so tests never fail on a half-started Api.
export default async function globalSetup(): Promise<void> {
  const deadline = Date.now() + TIMEOUT_MS;
  let lastError = '';
  while (Date.now() < deadline) {
    try {
      // Bounded by the remaining time, so a stalled Api cannot hold the setup past its deadline.
      const signal = AbortSignal.timeout(Math.max(1, deadline - Date.now()));
      const response = await fetch(new URL('/api/health', baseURL), { signal });
      if (response.ok) {
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(
    `The stack is not healthy at ${baseURL}/api/health (${lastError}). ` +
      'Start it with `npm run start` in the repo root (Docker Desktop must be running).',
  );
}
