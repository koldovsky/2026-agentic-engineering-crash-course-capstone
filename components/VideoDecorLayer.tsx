"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildEmbedUrl,
  embedPlaybackCommands,
  getActiveVideos,
  getVideoEntry,
  VIDEO_LOAD_TIMEOUT_MS,
  VIDEO_SIZE,
} from "@/lib/game/videos";
import type { PlacedDecor, PlacedVideo, Rect, Size, VideoState } from "@/lib/game/types";
import { separatePlacedVideos } from "@/lib/game/video-layout";
import { fallbackDockRects, useViewport } from "./DecorLayer";
import { usePreferences } from "./PreferencesProvider";
import type { TranslationKey } from "@/lib/i18n";

interface VideoDecorLayerProps {
  readonly videos: readonly PlacedVideo[];
  /** Docked videos share the dock column with the docked decor (design D5). */
  readonly decor?: readonly PlacedDecor[];
}

/**
 * Third-party video decor: every placed video may mount an iframe when its box is on screen,
 * none under reduced motion until the viewer presses play, and every one of them falls back
 * to an own-art placeholder when the network is gone.
 */
export function VideoDecorLayer({ videos, decor = [] }: VideoDecorLayerProps) {
  const viewport = useViewport();

  if (videos.length === 0 || viewport === null) {
    return null;
  }

  const laid = separatePlacedVideos(videos, viewport);
  const dockRects = fallbackDockRects(decor, viewport, laid);
  const active = new Set(getActiveVideos(laid).map((entry) => entry.id));

  return (
    <>
      {laid.map((entry) => (
        <VideoDecor
          key={entry.id}
          entry={entry}
          active={active.has(entry.id)}
          rect={
            entry.position
              ? {
                  left: Math.round(entry.position.x * viewport.width),
                  top: Math.round(entry.position.y * viewport.height),
                  width: VIDEO_SIZE.width,
                  height: VIDEO_SIZE.height,
                }
              : (dockRects.get(entry.id) as Rect)
          }
        />
      ))}
    </>
  );
}

function sizeStyle(rect: Rect): Size & { left: number; top: number } {
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

function VideoDecor({
  entry,
  active,
  rect,
}: {
  readonly entry: PlacedVideo;
  readonly active: boolean;
  readonly rect: Rect;
}) {
  const { t, motion } = usePreferences();
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [started, setStarted] = useState(false);
  /** How the current mount attempt ended; "pending" is the `loading` state of design D7. */
  // A frame mounted while the browser is already offline starts in the placeholder state; waiting
  // for `load` would mark the error page as playing (design D7).
  const [outcome, setOutcome] = useState<"pending" | "playing" | "offline">(() =>
    typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "pending",
  );

  const name = t(`item.${entry.id}.name` as TranslationKey);
  const label = t("video.label", { name });

  // A video that is scrolled or placed out of view costs nothing (design D7).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((record) => record.isIntersecting)),
      { threshold: 0 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // Reduced motion never autoplays: the viewer starts one video by hand (design D8).
  const wanted = active && visible && (motion === "full" || started);

  // Every new attempt starts over: a frame that is wanted again is either offline right away or
  // gets its own five seconds. Adjusting state during the render is the documented way to do this
  // without a cascading effect.
  const [attempted, setAttempted] = useState(wanted);
  if (attempted !== wanted) {
    setAttempted(wanted);
    setOutcome(wanted && navigator.onLine === false ? "offline" : "pending");
  }

  const state: VideoState = !wanted ? "idle" : outcome === "pending" ? "loading" : outcome;

  // A frame that never fires `load` falls back to the placeholder (design D7).
  useEffect(() => {
    if (!wanted || outcome !== "pending") {
      return;
    }
    const timer = window.setTimeout(() => setOutcome("offline"), VIDEO_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [wanted, outcome]);

  // A frame that failed while offline may mount again once the network is back (design D7).
  useEffect(() => {
    const back = () => setOutcome((current) => (current === "offline" ? "pending" : current));
    window.addEventListener("online", back);
    return () => window.removeEventListener("online", back);
  }, []);

  const handleLoad = useCallback(() => setOutcome("playing"), []);
  const handleError = useCallback(() => setOutcome("offline"), []);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const sendPlayback = useCallback(() => {
    const target = frameRef.current?.contentWindow;
    if (!target) {
      return;
    }
    for (const command of embedPlaybackCommands(entry.id)) {
      target.postMessage(command, "*");
    }
  }, [entry.id]);

  // Autoplay only starts while muted. Unmute Expedition music once it is playing, and again
  // on the next click, because the browser drops the first unmute without a user gesture.
  useEffect(() => {
    if (state !== "playing" || embedPlaybackCommands(entry.id).length === 0) {
      return;
    }
    sendPlayback();
    window.addEventListener("pointerdown", sendPlayback);
    return () => window.removeEventListener("pointerdown", sendPlayback);
  }, [entry.id, sendPlayback, state]);

  const mounted = state === "loading" || state === "playing";
  // Catalog ids are still PLACEHLDR* (design D3). YouTube answers those with its own
  // "This video is unavailable" page and still fires `load`, so the frame must stay
  // mounted for the embed tests but must not cover our card.
  const placeholderId = getVideoEntry(entry.id).videoId.startsWith("PLACEHLDR");
  const showFrame = state === "playing" && !placeholderId;

  return (
    <div
      ref={rootRef}
      data-testid={entry.id}
      data-video-state={state}
      role="group"
      aria-label={label}
      style={sizeStyle(rect)}
      // `position: fixed` already makes this a stacking context, so the play button inside can
      // never rise above the shop on its own: the whole root sits above it instead (design D8).
      // It still takes no pointer events, so it can never swallow a click meant for the game.
      className="video-decor pointer-events-none fixed z-30 overflow-hidden rounded-xl"
    >
      <div
        data-testid="video-placeholder"
        className={`video-placeholder absolute inset-0 flex flex-col items-center justify-center gap-2 bg-foreground/10 px-2 text-center text-xs font-medium text-foreground ${showFrame ? "invisible" : "z-10"}`}
      >
        {state === "offline" ? (
          t("video.offline")
        ) : (
          <>
            <span>{name}</span>
            {/* The only pointer-interactive part of the video decor (design D8). */}
            {motion === "reduced" && !started && (
              <button
                type="button"
                data-testid="video-play"
                onClick={() => setStarted(true)}
                className="pointer-events-auto relative z-30 rounded-full border border-foreground/20 bg-background px-2 py-1 text-[0.7rem] font-semibold text-foreground"
              >
                {t("video.play")}
              </button>
            )}
          </>
        )}
      </div>

      {mounted && (
        <iframe
          ref={frameRef}
          data-testid="video-frame"
          src={buildEmbedUrl(getVideoEntry(entry.id))}
          title={label}
          tabIndex={-1}
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={handleLoad}
          onError={handleError}
          style={{ opacity: showFrame ? 1 : 0 }}
          className="absolute inset-0 h-full w-full border-0"
        />
      )}
    </div>
  );
}
