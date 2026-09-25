import type {
  BuildEmbedUrl,
  GetActiveVideos,
  GetVideoEntry,
  Size,
  VideoEntry,
} from "./types";

/** Privacy-friendly embed host; the only provider of Stage 4 (design D6). */
export const VIDEO_EMBED_HOST = "https://www.youtube-nocookie.com";

/** 16:9 box every video decor is rendered and placed with. */
export const VIDEO_SIZE: Size = Object.freeze({ width: 384, height: 216 });

/** A frame that does not fire `load` within this many ms falls back to `offline` (design D7). */
export const VIDEO_LOAD_TIMEOUT_MS = 5000;

/**
 * The ten video decor entries in catalog order (design D3). The `videoId` values are placeholders
 * of the right shape until the human pastes the real ids in; swapping a video means editing only
 * this array.
 */
export const VIDEO_DECOR: readonly VideoEntry[] = Object.freeze([
  { id: "video-music", provider: "youtube-nocookie", videoId: "wTRRKguilmY" },
  { id: "video-runner", provider: "youtube-nocookie", videoId: "vTfD20dbxho" },
  { id: "video-parkour", provider: "youtube-nocookie", videoId: "VahKXgW2nXc" },
  { id: "video-soap", provider: "youtube-nocookie", videoId: "ZnC9zqn9rBY" },
  { id: "video-kinetic-sand", provider: "youtube-nocookie", videoId: "f1-2xRx2gnE" },
  { id: "video-slime", provider: "youtube-nocookie", videoId: "-MJi7T4lX80" },
  { id: "video-hydraulic", provider: "youtube-nocookie", videoId: "AKeUssuu3Is" },
  { id: "video-trailer", provider: "youtube-nocookie", videoId: "2VaLOc1FpSo" },
  { id: "video-combat", provider: "youtube-nocookie", videoId: "nLdRv_N3y00" },
  { id: "video-rain", provider: "youtube-nocookie", videoId: "n_Dv4JMiwK8" },
  { id: "video-seal", provider: "youtube-nocookie", videoId: "h9uFQv3t1AU" },
] as const satisfies readonly VideoEntry[]);

export const getVideoEntry: GetVideoEntry = (id) => {
  const entry = VIDEO_DECOR.find((candidate) => candidate.id === id);
  if (!entry) {
    throw new Error(`Unknown video decor id: ${id}`);
  }
  return entry;
};

export const buildEmbedUrl: BuildEmbedUrl = (entry) => {
  const params = [
    "autoplay=1",
    "mute=1",
    "loop=1",
    `playlist=${entry.videoId}`,
    "controls=0",
    "modestbranding=1",
    "playsinline=1",
    "rel=0",
    "disablekb=1",
    "iv_load_policy=3",
  ];
  const { startSeconds } = entry;
  if (typeof startSeconds === "number" && Number.isInteger(startSeconds) && startSeconds > 0) {
    params.push(`start=${startSeconds}`);
  }
  // Expedition music starts muted so autoplay is allowed, then the frame is unmuted (design D25).
  if (entry.id === "video-music") {
    params.push("enablejsapi=1");
  }
  return `${VIDEO_EMBED_HOST}/embed/${entry.videoId}?${params.join("&")}`;
};

/** YouTube IFrame API commands. Only Expedition music is unmuted. */
export function embedPlaybackCommands(id: string): readonly string[] {
  if (id !== "video-music") {
    return [];
  }
  return [
    JSON.stringify({ event: "command", func: "unMute", args: [] }),
    JSON.stringify({ event: "command", func: "playVideo", args: [] }),
  ];
}

export const getActiveVideos: GetActiveVideos = (placed) =>
  placed.filter((video) => video.position !== null);
