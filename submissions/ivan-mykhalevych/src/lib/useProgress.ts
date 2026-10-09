"use client";

import { useAccount } from "./account/AccountProvider";
import type { Attempt } from "./attempts";
import type { BestScores } from "./bestScores";
import { useActiveProfile, useAttempts, useBestScores } from "./useProfiles";

export interface Progress {
  name: string;
  attempts: Attempt[];
  best: BestScores;
}

export function useProgress(): Progress | null {
  const { session } = useAccount();
  const profile = useActiveProfile();
  const localAttempts = useAttempts(profile?.id ?? null);
  const localBest = useBestScores();

  if (session.status === "signedIn") {
    return { name: session.user.displayName, attempts: session.data.attempts, best: session.data.best };
  }
  if (session.status === "loading" || profile === null) return null;
  return { name: profile.name, attempts: localAttempts, best: localBest };
}
