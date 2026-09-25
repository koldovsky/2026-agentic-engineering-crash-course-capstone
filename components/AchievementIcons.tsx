import type { ReactNode } from "react";
import type { AchievementId } from "@/lib/game/types";

/**
 * One original 24×24 glyph per achievement. Decorative: the row already has a name.
 */
export function AchievementIcon({ id }: { readonly id: AchievementId }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-achievement-icon={id}
    >
      {glyph(id)}
    </svg>
  );
}

export function AchievementCheck() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <path
        d="M3.5 8.2 6.4 11 12.5 4.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function glyph(id: AchievementId): ReactNode {
  switch (id) {
    case "first-click":
      return (
        <path
          fill="currentColor"
          stroke="none"
          d="M7.2 2.2 7.4 15.4 10.6 12.6 13.8 19.4 16.4 18.3 13.2 11.6 17.4 11.4Z"
        />
      );
    case "clicks-100":
      return (
        <>
          <rect x="4" y="6" width="16" height="12" rx="3" />
          <path d="M9 12h6" />
        </>
      );
    case "clicks-1000":
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="M12 8.5v7M8.5 12h7" />
        </>
      );
    case "clicks-10000":
      return (
        <>
          <circle cx="6" cy="6" r="1.35" fill="currentColor" stroke="none" />
          <circle cx="12" cy="6" r="1.35" fill="currentColor" stroke="none" />
          <circle cx="18" cy="6" r="1.35" fill="currentColor" stroke="none" />
          <circle cx="6" cy="12" r="1.35" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none" />
          <circle cx="18" cy="12" r="1.35" fill="currentColor" stroke="none" />
          <circle cx="6" cy="18" r="1.35" fill="currentColor" stroke="none" />
          <circle cx="12" cy="18" r="1.35" fill="currentColor" stroke="none" />
          <circle cx="18" cy="18" r="1.35" fill="currentColor" stroke="none" />
        </>
      );
    case "clicks-100000":
      return (
        <>
          <circle cx="12" cy="12" r="2.3" />
          <path d="M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2M5.1 5.1l2.3 2.3M16.6 16.6l2.3 2.3M18.9 5.1l-2.3 2.3M7.4 16.6l-2.3 2.3" />
        </>
      );
    case "balance-1000":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
        </>
      );
    case "balance-50000":
      return (
        <>
          <ellipse cx="12" cy="17" rx="7" ry="2.5" />
          <path d="M5 17V12c0-1.4 3.1-2.5 7-2.5s7 1.1 7 2.5v5" />
          <path d="M5 12V7.5C5 6.1 8.1 5 12 5s7 1.1 7 2.5V12" />
        </>
      );
    case "first-purchase":
      return (
        <>
          <path d="M3.5 12 12 3.5H20V11.5L11.5 20Z" />
          <circle cx="16.2" cy="7.8" r="1.15" fill="currentColor" stroke="none" />
        </>
      );
    case "purchases-10":
      return (
        <>
          <path d="M6 8h12l-1.1 12H7.1Z" />
          <path d="M9 8V6.2A3 3 0 0 1 12 3.2 3 3 0 0 1 15 6.2V8" />
        </>
      );
    case "purchases-25":
      return (
        <>
          <path d="M3 5h2.2l2.1 10.2h9.4L19 8H7" />
          <circle cx="9.2" cy="18.6" r="1.35" fill="currentColor" stroke="none" />
          <circle cx="16.6" cy="18.6" r="1.35" fill="currentColor" stroke="none" />
        </>
      );
    case "skins-3":
      return (
        <>
          <circle cx="8" cy="8.5" r="2.4" fill="currentColor" stroke="none" />
          <circle cx="16" cy="8.5" r="2.4" />
          <circle cx="12" cy="15.5" r="2.4" />
        </>
      );
    case "skins-all":
      return (
        <>
          <path d="M12 3.2A8.8 8.8 0 1 0 19.2 17a2.3 2.3 0 0 1-2.3-2.3H15a2.2 2.2 0 0 1-2.2-2.2A4.2 4.2 0 0 1 17 8.3" />
          <circle cx="8" cy="10" r="1.05" fill="currentColor" stroke="none" />
          <circle cx="10.2" cy="14.6" r="1.05" fill="currentColor" stroke="none" />
          <circle cx="14.2" cy="8.2" r="1.05" fill="currentColor" stroke="none" />
        </>
      );
    case "gold-equipped":
      return (
        <>
          <path d="M4 16.5h16V20H4Z" />
          <path d="M5.5 16.5 8 7.5l4 5.2 4-5.2 2.5 9" />
        </>
      );
    case "first-decor":
      return (
        <path d="M12 2.8 13.6 9.1 20 10.6 13.6 12.2 12 18.5 10.4 12.2 4 10.6 10.4 9.1Z" />
      );
    case "decor-all":
      return (
        <>
          <rect x="3" y="3.5" width="7.5" height="7.5" rx="1.2" />
          <circle cx="17" cy="7.2" r="3.4" />
          <path d="M8.2 20.5 13.2 12.2 18.2 20.5Z" />
        </>
      );
    case "cat-nap":
      return (
        <>
          <path d="M4.8 10.2 7 4.2l3.2 4h3.6l3.2-4 2.2 6v4.6A5.2 5.2 0 0 1 14 20h-4a5.2 5.2 0 0 1-5.2-5.2Z" />
          <path d="M8.2 13.2c.7.55 1.5.55 2.2 0M13.6 13.2c.7.55 1.5.55 2.2 0M12 14.4v1.3" />
        </>
      );
    case "first-video":
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M10 9.2v5.6l5.2-2.8Z" fill="currentColor" stroke="none" />
        </>
      );
    case "videos-all":
      return (
        <>
          <rect x="4" y="3" width="16" height="18" rx="1.5" />
          <path d="M8 3v18M16 3v18M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4" />
        </>
      );
    case "first-helper":
      return (
        <>
          <circle cx="12" cy="13" r="5" />
          <circle cx="6.2" cy="12" r="2.1" />
          <circle cx="17.8" cy="12" r="2.1" />
          <path d="M10 14.6c.55.7 1.3 1 2 1s1.45-.3 2-1" />
        </>
      );
    case "helpers-10":
      return (
        <>
          <circle cx="6" cy="7.5" r="1.7" />
          <circle cx="12" cy="6.4" r="2" />
          <circle cx="18" cy="7.5" r="1.7" />
          <path d="M3.4 18.5c.35-2.5 1.5-3.8 2.6-3.8s2.25 1.3 2.6 3.8M8.6 18.5c.5-3 1.8-4.5 3.4-4.5s2.9 1.5 3.4 4.5M15.4 18.5c.35-2.5 1.5-3.8 2.6-3.8s2.25 1.3 2.6 3.8" />
        </>
      );
    case "factory-owner":
      return (
        <>
          <path d="M3 20V10.5l5 3V10l5 3V7.5h8V20Z" />
          <path d="M17.2 3.5v4" />
          <path d="M15.2 14.2h3.2V18h-3.2Z" />
        </>
      );
    case "first-crit":
      return (
        <path
          fill="currentColor"
          stroke="none"
          d="M13.2 1.8 4.6 13.2h5.6l-1.1 8.8 9.4-12.4h-5.8Z"
        />
      );
    case "crits-100":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M13 6.8 8.6 13h3.2l-.7 4.2 4.8-6.6H12.2Z" />
        </>
      );
    case "combo-5":
      return <path d="M4 19V14M8 19V11M12 19V8M16 19V5M20 19V9" />;
    case "combo-max":
      return (
        <path d="M12 2.4c.8 3.2-1.6 4.4-1.6 7.2a1.7 1.7 0 1 0 3.4 0c0-1.1-.5-2-.5-2 1.8 1.1 3.2 3 3.2 5.2A4.6 4.6 0 1 1 7.2 13.4c0-2.8 2-4.6 2.9-6.6.7-1.5 1.4-2.8 1.9-4.4Z" />
      );
    case "first-golden":
      return (
        <path d="M12 3.2 14.5 8.8 20.6 9.4 16 13.4 17.4 19.4 12 16.2 6.6 19.4 10 13.4 3.4 9.4 9.5 8.8Z" />
      );
    case "golden-10":
      return (
        <path
          fill="currentColor"
          stroke="none"
          d="M12 2.4 14.7 8.6l6.8.6-5.2 4.4 1.6 6.6L12 16.8 6.1 20.2 7.7 13.6 2.5 9.2l6.8-.6Z"
        />
      );
    case "reset-once":
      return (
        <>
          <path d="M20 12a8 8 0 1 1-2.3-5.6" />
          <path d="M20 3.8V9h-5.2" />
        </>
      );
    case "achievements-10":
      return (
        <>
          <circle cx="12" cy="14.2" r="5.2" />
          <path d="M9 3.2h6l-1.1 6H10.1Z" />
          <path d="M12 12.2v3.4" />
        </>
      );
    case "achievements-all":
      return (
        <>
          <path d="M8 4h8v5.6a4 4 0 0 1-8 0Z" />
          <path d="M8 6.2H5.2A2.6 2.6 0 0 0 8 9.4M16 6.2h2.8A2.6 2.6 0 0 1 16 9.4" />
          <path d="M12 13.6V16M9 20h6M10.2 17.8h3.6" />
        </>
      );
    default: {
      const unreachable: never = id;
      return unreachable;
    }
  }
}
