"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getClickModifiers, getClickValue } from "@/lib/game/click-value";
import { getComboLevel } from "@/lib/game/combo";
import { placeDecor } from "@/lib/game/decor";
import { GOLDEN_SIZE } from "@/lib/game/golden";
import { HELPER_TICK_MS } from "@/lib/game/helpers";
import { getButtonAppearance } from "@/lib/game/skins";
import { isShopVisible } from "@/lib/game/shop";
import { isBalanceVisible } from "@/lib/game/state";
import type { DecorId, DecorPosition, ShopItem, SkinId } from "@/lib/game/types";
import { AchievementsPanel } from "./AchievementsPanel";
import { AchievementToast } from "./AchievementToast";
import { BalanceCounter } from "./BalanceCounter";
import {
  chooseDecorPosition,
  chooseVideoPosition,
  DecorLayer,
  reservedRects,
} from "./DecorLayer";
import {
  buy,
  catchGoldenButton,
  getRuntimeSnapshot,
  getSavedStateSnapshot,
  getServerRuntimeSnapshot,
  getServerSavedState,
  getServerTrophiesSnapshot,
  getTrophiesSnapshot,
  press,
  resetGame,
  subscribeRuntime,
  subscribeSavedState,
  subscribeTrophies,
  syncTrophiesOnLoad,
  tick,
  toggle,
} from "./game-store";
import { VideoDecorLayer } from "./VideoDecorLayer";
import { GoldenButton } from "./GoldenButton";
import { HelperZone } from "./HelperZone";
import { LanguageToggle } from "./LanguageToggle";
import { MainButton, retrigger } from "./MainButton";
import { pageRandom } from "./page-random";
import { ResetProgress } from "./ResetProgress";
import { ShopBox } from "./ShopBox";
import { ThemeToggle } from "./ThemeToggle";

/** How long the crit feedback runs (design D12). */
const CRIT_FX_MS = 900;

/** Most time one tick may credit: three interval periods (design D16 of add-shop-v1, "no catch-up"). */
const MAX_CATCH_UP_MS = 3 * HELPER_TICK_MS;

export function GameScreen() {
  // `null` until the saved game has been read in the browser: the button stays disabled, so a
  // click can never be overwritten by the load (design D7). Every write goes through game-store's
  // commitGame/resetGame, which persist and publish the new snapshot in one step.
  const state = useSyncExternalStore(subscribeSavedState, getSavedStateSnapshot, getServerSavedState);
  // The runtime (combo, golden button, bonus) lives next to it and is never saved (design D2).
  const { runtime, now } = useSyncExternalStore(
    subscribeRuntime,
    getRuntimeSnapshot,
    getServerRuntimeSnapshot,
  );
  // The trophy case and the toast queue are a store of their own (design D12, D21).
  const { trophies, toasts } = useSyncExternalStore(
    subscribeTrophies,
    getTrophiesSnapshot,
    getServerTrophiesSnapshot,
  );
  const loaded = state !== null;

  // The evaluation that runs on load fills the case of a long-time player without a toast storm.
  useEffect(() => {
    if (loaded) {
      syncTrophiesOnLoad();
    }
  }, [loaded]);

  const [crit, setCrit] = useState(0);
  const critTimer = useRef(0);
  const shakeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => window.clearTimeout(critTimer.current);
  }, []);

  // Each crit restarts the shake of the dedicated layer; `<main>` and the fixed UI never move.
  useEffect(() => {
    if (crit > 0) {
      retrigger(shakeRef.current);
    }
  }, [crit]);

  const handleClick = useCallback((): number | void => {
    const result = press(performance.now());
    if (result?.crit) {
      setCrit((key) => key + 1);
      window.clearTimeout(critTimer.current);
      critTimer.current = window.setTimeout(() => setCrit(0), CRIT_FX_MS);
    }
    // The floating +N skin promises "the earned amount", so it shows what this press credited:
    // combo, crit and the golden bonus are visible in it and it matches the balance jump (D9).
    return result?.credited;
  }, []);

  const handleReset = useCallback(() => {
    window.clearTimeout(critTimer.current);
    setCrit(0);
    resetGame();
  }, []);

  const handleBuy = useCallback((item: ShopItem) => {
    // Decor and video need a free spot on the current screen, measured right before the purchase
    // (design D10, D5); both avoid the other kind's boxes.
    const saved = getSavedStateSnapshot();
    const placedDecor = saved?.decor ?? [];
    const placedVideos = saved?.videos ?? [];
    if (item.kind === "decor") {
      buy(item.id, {
        decorPosition: chooseDecorPosition(item.id as DecorId, placedDecor, placedVideos),
      });
      return;
    }
    if (item.kind === "video-decor") {
      buy(item.id, { videoPosition: chooseVideoPosition(placedDecor, placedVideos) });
      return;
    }
    buy(item.id);
  }, []);

  const handleToggle = useCallback((id: SkinId) => {
    toggle(id);
  }, []);

  // One interval drives every helper (design D16). It always reads the latest snapshot inside
  // `tick`, so it never closes over a stale state, and it only saves when a whole click lands.
  useEffect(() => {
    if (!loaded) {
      return;
    }
    // A golden button gets the same free spot treatment as decor, plus the click-status slot (D8).
    const place = (): DecorPosition | null => {
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const saved = getSavedStateSnapshot();
      return placeDecor({
        viewport,
        size: GOLDEN_SIZE,
        reserved: reservedRects(saved?.decor ?? [], viewport, saved?.videos ?? []),
        random: pageRandom,
      });
    };

    let last = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      // A few missed ticks are caught up, a suspended or throttled tab is not: the game must not
      // pay out the time it was away (add-shop-v1 "No catch-up for closed time").
      const elapsed = Math.min(now - last, MAX_CATCH_UP_MS);
      last = now;
      tick(elapsed, now, place);
    }, HELPER_TICK_MS);
    return () => window.clearInterval(interval);
  }, [loaded]);

  const hasCombo = state?.upgrades.includes("combo") ?? false;
  const hasGolden = state?.upgrades.includes("golden-button") ?? false;
  const comboLevel = hasCombo ? getComboLevel(runtime.combo, now) : 0;
  const golden = hasGolden ? runtime.golden : null;

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-4 px-6">
      <div className="fixed right-4 top-4 z-20 flex items-center gap-2">
        <AchievementsPanel state={state} trophies={trophies} />
        <LanguageToggle />
        <ThemeToggle />
      </div>

      {state && isShopVisible(state) && (
        <ShopBox state={state} onBuy={handleBuy} onToggle={handleToggle} />
      )}

      {/* Only this layer shakes on a crit (design D12); nothing inside it is `position: fixed`. */}
      <div
        ref={shakeRef}
        data-testid="shake-layer"
        className={`shake-layer flex flex-col items-center gap-4${crit > 0 ? " is-crit" : ""}`}
      >
        <BalanceCounter
          balance={state?.balance ?? 0}
          visible={state !== null && isBalanceVisible(state)}
          loaded={loaded}
        />
        <MainButton
          enabled={loaded}
          onClick={handleClick}
          appearance={state ? getButtonAppearance(state) : { stack: [], material: "classic" }}
          clickValue={state ? getClickValue(getClickModifiers(state)) : 1}
          crit={crit > 0}
          critKey={crit}
          comboLevel={comboLevel}
          bonusMs={golden?.bonusMs ?? 0}
        />
      </div>
      <ResetProgress onConfirm={handleReset} />

      <DecorLayer decor={state?.decor ?? []} videos={state?.videos ?? []} />
      <VideoDecorLayer videos={state?.videos ?? []} decor={state?.decor ?? []} />
      <HelperZone state={state} />
      {golden?.visible && <GoldenButton spawn={golden.visible} onCatch={catchGoldenButton} />}
      <AchievementToast queue={toasts} />
    </main>
  );
}
