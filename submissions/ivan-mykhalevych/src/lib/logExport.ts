import type { Attempt } from "./attempts";

const FALLBACK_SLUG = "profile";

export function newestFirst(attempts: Attempt[]): Attempt[] {
  return [...attempts].sort((a, b) => b.at - a.at);
}

export function exportAttemptsJson(profileName: string, attempts: Attempt[], exportedAt: number): string {
  const exportedAtIso = new Date(exportedAt).toISOString();
  return JSON.stringify({ profile: profileName, exportedAt: exportedAtIso, attempts }, null, 2);
}

export function exportFileName(profileName: string, exportedAt: number): string {
  const slug = profileName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const utcDate = new Date(exportedAt).toISOString().slice(0, 10);
  return `java-trainer-${slug === "" ? FALLBACK_SLUG : slug}-${utcDate}.json`;
}
