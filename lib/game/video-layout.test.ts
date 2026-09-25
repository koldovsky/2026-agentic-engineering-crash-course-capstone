import { describe, expect, it } from "vitest";
import { decorRect, rectsOverlap } from "./decor";
import type { PlacedVideo } from "./types";
import { VIDEO_SIZE } from "./videos";
import { separatePlacedVideos } from "./video-layout";

const VIEWPORT = { width: 1280, height: 720 };

describe("video-decor: Placed videos do not overlap", () => {
  it("Two videos on the same spot are separated", () => {
    const input: PlacedVideo[] = [
      { id: "video-runner", position: { x: 0.1, y: 0.1 } },
      { id: "video-parkour", position: { x: 0.1, y: 0.1 } },
    ];
    const frozen = input.map((entry) => ({ ...entry, position: entry.position && { ...entry.position } }));
    const laid = separatePlacedVideos(input, VIEWPORT);

    expect(laid[0].position).toEqual({ x: 0.1, y: 0.1 });
    const first = decorRect(laid[0].position!, VIDEO_SIZE, VIEWPORT);
    const second = decorRect(laid[1].position!, VIDEO_SIZE, VIEWPORT);
    expect(rectsOverlap(first, second)).toBe(false);
    expect(input).toEqual(frozen);
  });

  it("A docked video stays docked", () => {
    const input: PlacedVideo[] = [{ id: "video-soap", position: null }];
    expect(separatePlacedVideos(input, VIEWPORT)).toEqual(input);
  });
});
