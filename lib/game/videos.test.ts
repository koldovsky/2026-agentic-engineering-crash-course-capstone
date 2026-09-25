import { describe, expect, it } from "vitest";
import {
  buildEmbedUrl,
  getActiveVideos,
  getVideoEntry,
  VIDEO_DECOR,
  VIDEO_EMBED_HOST,
  VIDEO_LOAD_TIMEOUT_MS,
  VIDEO_SIZE,
} from "./videos";
import type { PlacedVideo, VideoDecorId, VideoEntry } from "./types";

// ---------------------------------------------------------------------------
// Helpers (notation from openspec/changes/add-content-v3/design.md)
// ---------------------------------------------------------------------------

const CATALOG_IDS: readonly VideoDecorId[] = [
  "video-music",
  "video-runner",
  "video-parkour",
  "video-soap",
  "video-kinetic-sand",
  "video-slime",
  "video-hydraulic",
  "video-trailer",
  "video-combat",
  "video-rain",
  "video-seal",
];

const EXPECTED_IDS = [
  "wTRRKguilmY",
  "vTfD20dbxho",
  "VahKXgW2nXc",
  "ZnC9zqn9rBY",
  "f1-2xRx2gnE",
  "-MJi7T4lX80",
  "AKeUssuu3Is",
  "2VaLOc1FpSo",
  "nLdRv_N3y00",
  "n_Dv4JMiwK8",
  "h9uFQv3t1AU",
] as const;

const EXPECTED_ENTRIES: readonly VideoEntry[] = CATALOG_IDS.map((id, index) => ({
  id,
  provider: "youtube-nocookie",
  videoId: EXPECTED_IDS[index],
}));

function placed(id: VideoDecorId, x: number | null, y = 0.5): PlacedVideo {
  return { id, position: x === null ? null : { x, y } };
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

// ---------------------------------------------------------------------------
// Video catalog module
// ---------------------------------------------------------------------------

describe("video-decor: Video catalog module", () => {
  it("Catalog ids, order and constants", () => {
    expect(VIDEO_DECOR.map((v) => v.id)).toEqual(CATALOG_IDS);
    expect(VIDEO_SIZE).toStrictEqual({ width: 384, height: 216 });
    expect(VIDEO_LOAD_TIMEOUT_MS).toBe(5000);
    expect(VIDEO_EMBED_HOST).toBe("https://www.youtube-nocookie.com");
  });

  it("Catalog entries", () => {
    expect(VIDEO_DECOR).toEqual(EXPECTED_ENTRIES);
    expect(getVideoEntry("video-runner")).toEqual({
      id: "video-runner",
      provider: "youtube-nocookie",
      videoId: "vTfD20dbxho",
    });
    expect(getVideoEntry("video-seal")).toEqual({
      id: "video-seal",
      provider: "youtube-nocookie",
      videoId: "h9uFQv3t1AU",
    });
    for (const entry of VIDEO_DECOR) {
      expect(getVideoEntry(entry.id)).toEqual(entry);
    }

    const videoIds = VIDEO_DECOR.map((v) => v.videoId);
    expect(new Set(videoIds).size).toBe(VIDEO_DECOR.length);
    for (const entry of VIDEO_DECOR) {
      expect(typeof entry.videoId).toBe("string");
      expect(entry.videoId.length).toBeGreaterThan(0);
      expect(entry.provider).toBe("youtube-nocookie");
    }
  });
});

// ---------------------------------------------------------------------------
// Embed URL
// ---------------------------------------------------------------------------

describe("video-decor: Embed URL", () => {
  it("Default parameters", () => {
    expect(buildEmbedUrl(getVideoEntry("video-runner"))).toBe(
      "https://www.youtube-nocookie.com/embed/vTfD20dbxho?autoplay=1&mute=1&loop=1" +
        "&playlist=vTfD20dbxho&controls=0&modestbranding=1&playsinline=1&rel=0" +
        "&disablekb=1&iv_load_policy=3",
    );
  });

  it("Start offset", () => {
    const withStart = buildEmbedUrl({
      id: "video-soap",
      provider: "youtube-nocookie",
      videoId: "PLACEHLDR03",
      startSeconds: 90,
    });
    expect(withStart.endsWith("&iv_load_policy=3&start=90")).toBe(true);
    expect(
      withStart.startsWith("https://www.youtube-nocookie.com/embed/PLACEHLDR03?autoplay=1&mute=1"),
    ).toBe(true);

    for (const startSeconds of [0, -5, 1.5]) {
      const url = buildEmbedUrl({
        id: "video-soap",
        provider: "youtube-nocookie",
        videoId: "PLACEHLDR03",
        startSeconds,
      });
      expect(url).not.toContain("start=");
    }
  });

  it("Every catalog entry builds a same-host URL", () => {
    const urls = VIDEO_DECOR.map((entry) => buildEmbedUrl(entry));
    urls.forEach((url, index) => {
      expect(url.startsWith("https://www.youtube-nocookie.com/embed/")).toBe(true);
      expect(url).toContain("mute=1");
      expect(url).toContain("loop=1");
      expect(url).toContain(`playlist=${VIDEO_DECOR[index].videoId}`);
    });
    expect(new Set(urls).size).toBe(urls.length);
  });
});

// ---------------------------------------------------------------------------
// Every placed video is active
// ---------------------------------------------------------------------------

describe("video-decor: Every placed video is active", () => {
  it("Fewer than the cap", () => {
    const input = [placed("video-runner", 0.1, 0.1), placed("video-soap", 0.2, 0.2)];
    expect(getActiveVideos(input).map((v) => v.id)).toEqual(["video-runner", "video-soap"]);
  });

  it("Every placed video stays active", () => {
    const input = [
      placed("video-runner", 0.1),
      placed("video-parkour", 0.2),
      placed("video-soap", 0.3),
      placed("video-slime", 0.4),
      placed("video-rain", 0.5),
    ];
    expect(getActiveVideos(input).map((v) => v.id)).toEqual([
      "video-runner",
      "video-parkour",
      "video-soap",
      "video-slime",
      "video-rain",
    ]);
  });

  it("Docked videos never take a slot", () => {
    const input = [
      placed("video-runner", null),
      placed("video-parkour", 0.3, 0.3),
      placed("video-soap", null),
      placed("video-slime", 0.4, 0.4),
    ];
    expect(getActiveVideos(input).map((v) => v.id)).toEqual(["video-parkour", "video-slime"]);
  });

  it("Empty input", () => {
    expect(getActiveVideos([])).toEqual([]);
  });

  it("Does not mutate its input", () => {
    const input = deepFreeze([placed("video-runner", 0.1), placed("video-parkour", null)]);
    let result: readonly PlacedVideo[] | undefined;
    expect(() => {
      result = getActiveVideos(input);
    }).not.toThrow();
    expect(result?.map((v) => v.id)).toEqual(["video-runner"]);
    expect(input).toEqual([placed("video-runner", 0.1), placed("video-parkour", null)]);
  });
});
