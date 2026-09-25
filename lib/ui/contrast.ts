import type {
  CompositeOver,
  ContrastRatio,
  LastShadowColor,
  ParseCssColor,
  RelativeLuminance,
  Rgba,
} from "@/lib/game/types";

// Presentation maths (design D18): pure colour helpers shared by the e2e contrast assertions.
// No React, no DOM, no network — only numbers and strings.

/** Channel value 0–255 out of a decimal or percentage token, or null. */
function parseChannel(token: string): number | null {
  const text = token.trim();
  if (text === "") {
    return null;
  }
  if (text.endsWith("%")) {
    const percent = Number(text.slice(0, -1));
    if (!Number.isFinite(percent)) {
      return null;
    }
    return clampChannel((percent / 100) * 255);
  }
  const value = Number(text);
  if (!Number.isFinite(value)) {
    return null;
  }
  return clampChannel(value);
}

/** Alpha 0–1 out of a decimal or percentage token, or null. */
function parseAlpha(token: string): number | null {
  const text = token.trim();
  if (text === "") {
    return null;
  }
  if (text.endsWith("%")) {
    const percent = Number(text.slice(0, -1));
    if (!Number.isFinite(percent)) {
      return null;
    }
    return clamp(percent / 100, 0, 1);
  }
  const value = Number(text);
  if (!Number.isFinite(value)) {
    return null;
  }
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampChannel(value: number): number {
  return clamp(Math.round(value), 0, 255);
}

function parseHex(value: string): Rgba | null {
  const hex = value.slice(1);
  if (!/^[0-9a-f]+$/i.test(hex)) {
    return null;
  }
  if (hex.length === 3 || hex.length === 4) {
    const channels = [...hex].map((digit) => Number.parseInt(digit + digit, 16));
    return {
      r: channels[0],
      g: channels[1],
      b: channels[2],
      a: channels.length === 4 ? Number((channels[3] / 255).toFixed(4)) : 1,
    };
  }
  if (hex.length === 6 || hex.length === 8) {
    const channels: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      channels.push(Number.parseInt(hex.slice(i, i + 2), 16));
    }
    return {
      r: channels[0],
      g: channels[1],
      b: channels[2],
      a: channels.length === 4 ? Number((channels[3] / 255).toFixed(4)) : 1,
    };
  }
  return null;
}

export const parseCssColor: ParseCssColor = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const text = value.trim().toLowerCase();
  if (text === "") {
    return null;
  }
  if (text === "transparent") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  if (text.startsWith("#")) {
    return parseHex(text);
  }
  const functional = /^rgba?\(([^()]*)\)$/.exec(text);
  if (!functional) {
    return null;
  }
  const body = functional[1].trim();
  const [colorPart, alphaPart, ...rest] = body.split("/");
  if (rest.length > 0) {
    return null;
  }
  const tokens = colorPart
    .trim()
    .split(/[\s,]+/)
    .filter((token) => token !== "");
  const hasSlashAlpha = alphaPart !== undefined;
  if (hasSlashAlpha ? tokens.length !== 3 : tokens.length !== 3 && tokens.length !== 4) {
    return null;
  }
  const r = parseChannel(tokens[0]);
  const g = parseChannel(tokens[1]);
  const b = parseChannel(tokens[2]);
  if (r === null || g === null || b === null) {
    return null;
  }
  const alphaToken = hasSlashAlpha ? alphaPart : tokens[3];
  const a = alphaToken === undefined ? 1 : parseAlpha(alphaToken);
  if (a === null) {
    return null;
  }
  return { r, g, b, a };
};

export const compositeOver: CompositeOver = (fg, bg) => ({
  r: Math.round(fg.a * fg.r + (1 - fg.a) * bg.r),
  g: Math.round(fg.a * fg.g + (1 - fg.a) * bg.g),
  b: Math.round(fg.a * fg.b + (1 - fg.a) * bg.b),
  a: 1,
});

export const relativeLuminance: RelativeLuminance = (color) => {
  const channel = (raw: number): number => {
    const c = clamp(raw, 0, 255) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
  return Number(luminance.toFixed(6));
};

export const contrastRatio: ContrastRatio = (a, b) => {
  const opaqueA = a.a < 1 ? compositeOver(a, { ...b, a: 1 }) : a;
  const opaqueB = b.a < 1 ? compositeOver(b, { ...a, a: 1 }) : b;
  const first = relativeLuminance(opaqueA);
  const second = relativeLuminance(opaqueB);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(4));
};

export const lastShadowColor: LastShadowColor = (boxShadow) => {
  if (typeof boxShadow !== "string") {
    return null;
  }
  const text = boxShadow.trim();
  if (text === "" || text === "none") {
    return null;
  }
  const layers: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
    }
    if (char === "," && depth === 0) {
      layers.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  layers.push(current);
  const last = layers[layers.length - 1];
  const colorToken = /rgba?\([^()]*\)|#[0-9a-f]{3,8}\b|\btransparent\b/i.exec(last);
  if (!colorToken) {
    return null;
  }
  return parseCssColor(colorToken[0]);
};
