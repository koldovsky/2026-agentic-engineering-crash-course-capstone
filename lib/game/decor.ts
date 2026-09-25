import type { DecorRect, PlaceDecor, RectsOverlap } from "./types";

/** Distance kept from the viewport edges, in CSS px (design D9). */
export const DECOR_MARGIN = 16;

/** Free space kept around a decor item when testing overlap, in CSS px (design D9). */
export const DECOR_GAP = 16;

/** Random candidates tried before giving up with `null` (design D9). */
export const DECOR_MAX_ATTEMPTS = 50;

export const rectsOverlap: RectsOverlap = (a, b) =>
  a.left < b.left + b.width &&
  b.left < a.left + a.width &&
  a.top < b.top + b.height &&
  b.top < a.top + a.height;

export const placeDecor: PlaceDecor = ({
  viewport,
  size,
  reserved,
  random,
  margin = DECOR_MARGIN,
  gap = DECOR_GAP,
  maxAttempts = DECOR_MAX_ATTEMPTS,
}) => {
  const rangeX = viewport.width - 2 * margin - size.width;
  const rangeY = viewport.height - 2 * margin - size.height;
  if (rangeX < 0 || rangeY < 0) {
    return null;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    // Exactly two random values per attempt, x first (design D9).
    const left = margin + Math.round(random() * rangeX);
    const top = margin + Math.round(random() * rangeY);
    const candidate = {
      left: left - gap,
      top: top - gap,
      width: size.width + 2 * gap,
      height: size.height + 2 * gap,
    };
    if (!reserved.some((area) => rectsOverlap(candidate, area))) {
      return { x: left / viewport.width, y: top / viewport.height };
    }
  }
  return null;
};

export const decorRect: DecorRect = (position, size, viewport) => ({
  left: clamp(Math.round(position.x * viewport.width), 0, viewport.width - size.width),
  top: clamp(Math.round(position.y * viewport.height), 0, viewport.height - size.height),
  width: size.width,
  height: size.height,
});

/** Keeps a decor rect inside the viewport; a decor larger than the viewport sticks to 0 (D9). */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(max, min));
}
