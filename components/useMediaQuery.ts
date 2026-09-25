import { useSyncExternalStore } from "react";

/**
 * Live `matchMedia` result. The server (and the hydration render) get `serverValue`; the browser
 * value arrives right after hydration and updates whenever the media query changes.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}
