import { describe, expect, it } from "vitest";
import { buildEmbedUrl, embedPlaybackCommands, getVideoEntry, VIDEO_DECOR } from "./videos";

describe("video-decor: Expedition music is audible", () => {
  it("Music URL can be controlled and still starts muted", () => {
    const url = buildEmbedUrl(getVideoEntry("video-music"));
    expect(url).toContain("mute=1");
    expect(url).toContain("enablejsapi=1");
    expect(url).toContain("wTRRKguilmY");
  });

  it("Only the music video is unmuted", () => {
    expect(embedPlaybackCommands("video-music")).toEqual([
      JSON.stringify({ event: "command", func: "unMute", args: [] }),
      JSON.stringify({ event: "command", func: "playVideo", args: [] }),
    ]);
    for (const entry of VIDEO_DECOR) {
      if (entry.id !== "video-music") {
        expect(embedPlaybackCommands(entry.id)).toEqual([]);
        expect(buildEmbedUrl(entry)).not.toContain("enablejsapi=1");
      }
    }
  });
});
