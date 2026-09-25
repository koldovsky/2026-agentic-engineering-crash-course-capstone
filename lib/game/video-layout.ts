import { DECOR_GAP, DECOR_MARGIN, decorRect, rectsOverlap } from "./decor";
import type { DecorPosition, PlacedVideo, Rect, Size } from "./types";
import { VIDEO_SIZE } from "./videos";

/** Step used while sliding a later video off an earlier one (design D23). */
const SHIFT_PX = 8;

/**
 * Returns a new list where later placed videos no longer sit on earlier ones.
 * The first positioned video keeps its saved spot. A null position stays null.
 */
export function separatePlacedVideos(
  videos: readonly PlacedVideo[],
  viewport: Size,
): readonly PlacedVideo[] {
  const occupied: Rect[] = [];
  let placedCount = 0;

  return videos.map((video) => {
    if (!video.position) {
      return video;
    }
    placedCount += 1;
    if (placedCount === 1) {
      occupied.push(decorRect(video.position, VIDEO_SIZE, viewport));
      return video;
    }

    const start = decorRect(video.position, VIDEO_SIZE, viewport);
    const clear = findClearSpot(start, occupied, viewport);
    const position: DecorPosition = {
      x: clear.left / viewport.width,
      y: clear.top / viewport.height,
    };
    occupied.push(decorRect(position, VIDEO_SIZE, viewport));
    return { ...video, position };
  });
}

/**
 * A spot `placeDecor` missed. The 384×216 frame often fails the 50 random tries and
 * would otherwise dock on top of the click-status slot.
 */
export function findClearVideoSpot(
  viewport: Size,
  reserved: readonly Rect[],
): DecorPosition | null {
  return (
    scanVideoSpot(viewport, reserved, DECOR_MARGIN, DECOR_GAP) ??
    scanVideoSpot(viewport, reserved, 0, 0)
  );
}

function scanVideoSpot(
  viewport: Size,
  reserved: readonly Rect[],
  margin: number,
  gap: number,
): DecorPosition | null {
  const maxLeft = viewport.width - margin - VIDEO_SIZE.width;
  const maxTop = viewport.height - margin - VIDEO_SIZE.height;
  for (let top = margin; top <= maxTop; top += SHIFT_PX) {
    for (let left = margin; left <= maxLeft; left += SHIFT_PX) {
      const candidate: Rect = {
        left: left - gap,
        top: top - gap,
        width: VIDEO_SIZE.width + 2 * gap,
        height: VIDEO_SIZE.height + 2 * gap,
      };
      if (!reserved.some((area) => rectsOverlap(candidate, area))) {
        return { x: left / viewport.width, y: top / viewport.height };
      }
    }
  }
  return null;
}

function findClearSpot(start: Rect, occupied: readonly Rect[], viewport: Size): Rect {
  let left = start.left;
  let top = start.top;
  for (let guard = 0; guard < 4000; guard += 1) {
    const candidate: Rect = { left, top, width: VIDEO_SIZE.width, height: VIDEO_SIZE.height };
    const inside =
      left >= 0 &&
      top >= 0 &&
      left + VIDEO_SIZE.width <= viewport.width &&
      top + VIDEO_SIZE.height <= viewport.height;
    if (inside && !occupied.some((other) => rectsOverlap(candidate, other))) {
      return candidate;
    }
    top += SHIFT_PX;
    if (top + VIDEO_SIZE.height > viewport.height) {
      top = 0;
      left += VIDEO_SIZE.width;
    }
    if (left + VIDEO_SIZE.width > viewport.width) {
      return start;
    }
  }
  return start;
}
