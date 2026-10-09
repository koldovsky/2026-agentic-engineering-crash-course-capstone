"use client";

import { useMemo, useSyncExternalStore } from "react";
import { ATTEMPTS_KEY_BASE, parseAttempts } from "./attempts";
import type { Attempt } from "./attempts";
import { BEST_KEY_BASE, parseBestScores } from "./bestScores";
import type { BestScores } from "./bestScores";
import { PROFILES_KEY, parseProfiles, profileKey } from "./profiles";
import type { Profile, ProfilesState } from "./profiles";
import { readStored, subscribeToStore } from "./profileStore";

export function useStoredText(key: string | null): string | null {
  return useSyncExternalStore(
    subscribeToStore,
    () => (key === null ? null : readStored(key)),
    () => null,
  );
}

export function useProfiles(): ProfilesState {
  const storedText = useStoredText(PROFILES_KEY);
  return useMemo(() => parseProfiles(storedText), [storedText]);
}

export function useActiveProfile(): Profile | null {
  const { profiles, activeId } = useProfiles();
  return profiles.find((profile) => profile.id === activeId) ?? null;
}

export function useAttempts(profileId: string | null): Attempt[] {
  const storedText = useStoredText(profileId === null ? null : profileKey(ATTEMPTS_KEY_BASE, profileId));
  return useMemo(() => parseAttempts(storedText), [storedText]);
}

export function useBestScores(): BestScores {
  const profile = useActiveProfile();
  const storedText = useStoredText(profile === null ? null : profileKey(BEST_KEY_BASE, profile.id));
  return useMemo(() => parseBestScores(storedText), [storedText]);
}
