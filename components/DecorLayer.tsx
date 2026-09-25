import { useEffect, useState } from "react";
import { decorRect, placeDecor } from "@/lib/game/decor";
import { getShopItem } from "@/lib/game/shop";
import { findClearVideoSpot, separatePlacedVideos } from "@/lib/game/video-layout";
import { VIDEO_SIZE } from "@/lib/game/videos";
import type {
  DecorId,
  DecorItem,
  DecorPosition,
  PlacedDecor,
  PlacedVideo,
  Rect,
  Size,
} from "@/lib/game/types";
import { pageRandom } from "./page-random";
import { usePreferences } from "./PreferencesProvider";
import type { TranslationKey } from "@/lib/i18n";

interface DecorLayerProps {
  readonly decor: readonly PlacedDecor[];
  /** Placed videos share the dock and reserve their spot (design D5). */
  readonly videos?: readonly PlacedVideo[];
}

/** Elements a decor item must not cover; measured at purchase time (design D10, D13, D21). */
// `balance-area` is the fixed-height counter wrapper, not only the number span inside it;
// `click-status` is the Stage 3 slot right of the main button (combo meter, golden bonus);
// `achievements` is the Stage 4 trophy-case button in the top-right cluster.
const RESERVED_TEST_IDS = [
  "main-button",
  "balance-area",
  "shop",
  "helpers",
  "reset",
  "click-status",
  "achievements",
];

function sizeOf(id: DecorId): Size {
  return (getShopItem(id) as DecorItem).size;
}

function rectOf(element: Element): Rect {
  const box = element.getBoundingClientRect();
  return { left: box.left, top: box.top, width: box.width, height: box.height };
}

/**
 * Reserved areas for a new decor item: the fixed UI plus every decor already on screen. The shop
 * is reserved with its maximum height (60 vh), so later reveals cannot grow into a decor (D10).
 */
export function reservedRects(
  placed: readonly PlacedDecor[],
  viewport: Size,
  videos: readonly PlacedVideo[] = [],
): Rect[] {
  const rects: Rect[] = [];
  for (const testId of RESERVED_TEST_IDS) {
    const element = document.querySelector(`[data-testid="${testId}"]`);
    if (element) {
      const rect = rectOf(element);
      rects.push(testId === "shop" ? { ...rect, height: 0.6 * viewport.height } : rect);
    }
  }
  // The top-right switcher container has no test id of its own; both toggles are measured.
  for (const testId of ["lang-toggle", "theme-toggle"]) {
    const element = document.querySelector(`[data-testid="${testId}"]`);
    if (element) {
      rects.push(rectOf(element));
    }
  }
  for (const entry of placed) {
    const element = document.querySelector(`[data-testid="decor-${entry.id}"]`);
    if (entry.position) {
      rects.push(decorRect(entry.position, sizeOf(entry.id), viewport));
    } else if (element) {
      rects.push(rectOf(element));
    }
  }
  // Every placed video is reserved exactly like a decor item, after the same
  // separation the screen uses, so a new buy cannot land on a shifted frame.
  for (const entry of separatePlacedVideos(videos, viewport)) {
    const element = document.querySelector(`[data-testid="${entry.id}"]`);
    if (entry.position) {
      rects.push(decorRect(entry.position, VIDEO_SIZE, viewport));
    } else if (element) {
      rects.push(rectOf(element));
    }
  }
  return rects;
}

/** Picks the saved position of a decor item at purchase time; `null` means the fallback dock. */
export function chooseDecorPosition(
  id: DecorId,
  placed: readonly PlacedDecor[],
  videos: readonly PlacedVideo[] = [],
): DecorPosition | null {
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  return placeDecor({
    viewport,
    size: sizeOf(id),
    reserved: reservedRects(placed, viewport, videos),
    random: pageRandom,
  });
}

/** Same for a bought video: the box is always `VIDEO_SIZE` (design D5). */
export function chooseVideoPosition(
  placed: readonly PlacedDecor[],
  videos: readonly PlacedVideo[],
): DecorPosition | null {
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const reserved = reservedRects(placed, viewport, videos);
  return (
    placeDecor({
      viewport,
      size: VIDEO_SIZE,
      reserved,
      random: pageRandom,
    }) ?? findClearVideoSpot(viewport, reserved)
  );
}

/** Pure CSS art; every part animates only transform / opacity (design D17). */
function DecorArt({ id }: { readonly id: DecorId }) {
  switch (id) {
    case "sleeping-cat":
      return <SleepingCat />;
    case "lava-lamp":
      return (
        <>
          <span className="lamp-glass" />
          <span className="lamp-blob lamp-blob-a" />
          <span className="lamp-blob lamp-blob-b" />
          <span className="lamp-blob lamp-blob-c" />
        </>
      );
    case "hydraulic-press":
      return (
        <>
          <span className="press-frame" />
          <span className="press-ram" />
          <span className="press-belt" />
          <span className="press-object" />
        </>
      );
  }
}

/**
 * The sleeping cat as one inline SVG with eight named parts (design D15): a curled body, the head
 * resting on its right end with two ears, closed eyes, a nose, and the tail curling in front. The
 * geometry is the contract — the e2e asserts the silhouette from the rendered boxes.
 */
function SleepingCat() {
  return (
    <svg
      data-testid="cat-svg"
      viewBox="0 0 120 80"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className="h-full w-full"
    >
      <path
        data-testid="cat-tail"
        className="cat-tail"
        d="M64 54 C48 66 22 62 16 48"
        fill="none"
        stroke="#9ca3af"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <ellipse data-testid="cat-body" className="cat-body" cx="58" cy="54" rx="44" ry="22" fill="#9ca3af" />
      <polygon
        data-testid="cat-ear-left"
        className="cat-ear"
        points="80,16 74,30 88,26"
        fill="#9ca3af"
      />
      <polygon
        data-testid="cat-ear-right"
        className="cat-ear"
        points="108,20 100,26 110,34"
        fill="#9ca3af"
      />
      <circle data-testid="cat-head" className="cat-head" cx="92" cy="38" r="16" fill="#9ca3af" />
      <path
        data-testid="cat-eye-left"
        className="cat-eye"
        d="M82 40 Q86 44 90 40"
        fill="none"
        stroke="#3f3f46"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        data-testid="cat-eye-right"
        className="cat-eye"
        d="M96 40 Q100 44 104 40"
        fill="none"
        stroke="#3f3f46"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <polygon data-testid="cat-nose" className="cat-nose" points="90,44 96,44 93,48" fill="#f472b6" />
    </svg>
  );
}

/** Re-renders on resize so `decorRect` can clamp the saved fraction into the new viewport (D9). */
export function useViewport(): Size | null {
  const [viewport, setViewport] = useState<Size | null>(null);

  useEffect(() => {
    const read = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  return viewport;
}

/**
 * Items without a saved position go into one dock at the right edge, vertically centered and
 * stacked with an 8 px gap: decor first, then videos, each in catalog order (design D9, D5).
 */
export function fallbackDockRects(
  decor: readonly PlacedDecor[],
  viewport: Size,
  videos: readonly PlacedVideo[] = [],
): Map<string, Rect> {
  const docked: { readonly id: string; readonly size: Size }[] = [
    ...decor
      .filter((entry) => entry.position === null)
      .map((entry) => ({ id: entry.id as string, size: sizeOf(entry.id) })),
    ...videos
      .filter((entry) => entry.position === null)
      .map((entry) => ({ id: entry.id as string, size: VIDEO_SIZE })),
  ];
  const height =
    docked.reduce((total, entry) => total + entry.size.height, 0) +
    8 * Math.max(docked.length - 1, 0);

  const rects = new Map<string, Rect>();
  let top = viewport.height / 2 - height / 2;
  for (const entry of docked) {
    rects.set(entry.id, { left: viewport.width - 16 - entry.size.width, top, ...entry.size });
    top += entry.size.height + 8;
  }
  return rects;
}

export function DecorLayer({ decor, videos = [] }: DecorLayerProps) {
  const { t } = usePreferences();
  const viewport = useViewport();

  if (decor.length === 0 || viewport === null) {
    return null;
  }

  const dockRects = fallbackDockRects(decor, viewport, videos);

  return (
    <>
      {decor.map((entry) => {
        const size = sizeOf(entry.id);
        const rect = entry.position
          ? decorRect(entry.position, size, viewport)
          : (dockRects.get(entry.id) as Rect);
        return (
          <div
            key={entry.id}
            data-testid={`decor-${entry.id}`}
            role="img"
            aria-label={t(`item.${entry.id}.name` as TranslationKey)}
            style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
            className={`decor decor-${entry.id} pointer-events-none fixed z-0`}
          >
            <DecorArt id={entry.id} />
          </div>
        );
      })}
    </>
  );
}
