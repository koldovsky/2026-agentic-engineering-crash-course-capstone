import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { formatNumber } from "@/lib/i18n";
import type { ButtonAppearance } from "@/lib/game/types";
import { usePreferences } from "./PreferencesProvider";

interface MainButtonProps {
  /** False until the saved state has been read from storage (design D7). */
  readonly enabled: boolean;
  /**
   * Runs the press. It may return what the press actually earned (whole clicks added to the
   * balance); the floating +N skin shows that instead of the preview, so a combo, a crit or a
   * golden bonus is visible in it. Returning nothing falls back to `clickValue`.
   */
  readonly onClick: () => number | void;
  /** Enabled stack skins and the material slot (design D17). */
  readonly appearance: ButtonAppearance;
  /** Value of the next click without any runtime factor; fallback for the floating +N skin. */
  readonly clickValue: number;
  /** True while the crit feedback of the last press runs (design D12). */
  readonly crit?: boolean;
  /** Increases with every crit; a new crit restarts the effect instead of extending it. */
  readonly critKey?: number;
  /** Combo level shown in the click-status slot; 0 hides the meter (design D13). */
  readonly comboLevel?: number;
  /** Remaining golden bonus in ms; 0 hides the timer (design D13). */
  readonly bonusMs?: number;
}

interface FloatingNumber {
  readonly id: number;
  readonly value: number;
  readonly x: number;
  readonly y: number;
}

/** Lifetime of a floating +N, matching the `float-up` keyframes (design D17). */
const FLOAT_MS = 800;

/** Particles of the crit burst, at angles `i × 30°` (design D18). */
const CRIT_PARTICLES = 12;

/** Restarts a CSS animation that keeps its class between events (design D17). */
export function retrigger(element: HTMLElement | null): void {
  if (!element) {
    return;
  }
  element.style.animation = "none";
  void element.offsetWidth;
  element.style.animation = "";
}

/**
 * Where a floating +N starts: the pointer for mouse / touch clicks, the button center for
 * keyboard-triggered clicks (`detail === 0`, whose clientX / clientY are 0).
 */
export function floatingOrigin(event: MouseEvent<HTMLElement>): { x: number; y: number } {
  if (event.detail === 0) {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }
  return { x: event.clientX, y: event.clientY };
}

export function MainButton({
  enabled,
  onClick,
  appearance,
  clickValue,
  crit = false,
  critKey = 0,
  comboLevel = 0,
  bonusMs = 0,
}: MainButtonProps) {
  const { t, language, motion } = usePreferences();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const capRef = useRef<HTMLSpanElement>(null);
  const nextFloatingId = useRef(0);
  const [floating, setFloating] = useState<readonly FloatingNumber[]>([]);
  const timers = useRef(new Set<number>());

  // Pending floating-number removals must not fire after unmount.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) {
        window.clearTimeout(timer);
      }
      pending.clear();
    };
  }, []);

  const stack = appearance.stack;
  const hasSquish = stack.includes("squish");
  const hasCap = stack.includes("jumping-cap");
  const showsFloating = stack.includes("floating-number") && motion === "full";

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const earned = onClick();
      retrigger(buttonRef.current);
      retrigger(capRef.current);

      if (showsFloating) {
        const id = nextFloatingId.current;
        nextFloatingId.current += 1;
        // What the press credited, not what a plain press would be worth (design D9).
        const value = typeof earned === "number" ? earned : clickValue;
        const spawned = { id, value, ...floatingOrigin(event) };
        setFloating((current) => [...current, spawned]);
        const timer = window.setTimeout(() => {
          timers.current.delete(timer);
          setFloating((current) => current.filter((item) => item.id !== id));
        }, FLOAT_MS);
        timers.current.add(timer);
      }
    },
    [clickValue, onClick, showsFloating],
  );

  return (
    // The wrapper only hosts the overlays; the button keeps the layout box Stage 1 gave it.
    <div className="relative flex items-center justify-center">
      <button
        ref={buttonRef}
        type="button"
        data-testid="main-button"
        data-skins={stack.join(" ")}
        data-material={appearance.material}
        data-crit={crit ? "true" : undefined}
        disabled={!enabled}
        onClick={handleClick}
        className={`main-button h-40 w-40 rounded-full bg-accent text-2xl font-bold text-accent-foreground shadow-lg disabled:opacity-60${
          hasSquish ? " skin-squish" : ""
        }${stack.includes("soft-shadow") ? " skin-soft-shadow" : ""}`}
      >
        {t("mainButton.label")}
      </button>

      {hasCap && (
        <span
          ref={capRef}
          data-testid="jumping-cap"
          aria-hidden="true"
          className="skin-jumping-cap pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 text-3xl"
        >
          🧢
        </span>
      )}

      {/* A new crit remounts the overlays, which restarts every keyframe (design D12). */}
      {crit && (
        <CritEffect key={critKey} text={t("crit.text")} particles={motion === "full"} />
      )}

      {/* Fixed-size slot right of the button, so nothing in it ever moves the button (D13). */}
      <div
        data-testid="click-status"
        className="pointer-events-none absolute left-full top-1/2 ml-6 flex h-16 w-40 -translate-y-1/2 flex-col items-start justify-center gap-1"
      >
        {comboLevel > 0 && (
          <span
            data-testid="combo"
            data-combo-level={comboLevel}
            className="text-lg font-bold text-accent"
          >
            {t("combo.label", { value: formatNumber(1 + comboLevel / 10, language) })}
          </span>
        )}
        {bonusMs > 0 && (
          <span data-testid="golden-bonus" className="text-sm font-semibold text-muted">
            {t("golden.bonus", { seconds: formatNumber(Math.ceil(bonusMs / 1000), language) })}
          </span>
        )}
      </div>

      {/* Rendered outside the shake layer: a transformed ancestor would trap them (design D12). */}
      {floating.length > 0 &&
        typeof document !== "undefined" &&
        createPortal(
          floating.map((item) => (
            <span
              key={item.id}
              data-testid="floating-number"
              aria-hidden="true"
              style={{ left: item.x, top: item.y }}
              className="floating-number pointer-events-none fixed text-xl font-bold"
            >
              +{item.value}
            </span>
          )),
          document.body,
        )}
    </div>
  );
}

/** Crit text, gold flash over the button and the particle burst (design D12, D18). */
function CritEffect({ text, particles }: { readonly text: string; readonly particles: boolean }) {
  return (
    <>
      <span
        data-testid="crit-flash"
        aria-hidden="true"
        className="crit-flash pointer-events-none absolute inset-0 rounded-full"
      />
      <span
        data-testid="crit-text"
        aria-hidden="true"
        className="crit-text pointer-events-none absolute bottom-full left-1/2 z-20 -translate-x-1/2 whitespace-nowrap text-2xl font-bold text-accent"
      >
        {text}
      </span>
      {particles && (
        <span
          data-testid="crit-burst"
          aria-hidden="true"
          className="crit-burst pointer-events-none absolute inset-0"
        >
          {Array.from({ length: CRIT_PARTICLES }, (_, index) => (
            <span
              key={index}
              data-testid="crit-particle"
              className="crit-particle"
              style={{ ["--crit-angle" as string]: `${index * 30}deg` }}
            />
          ))}
        </span>
      )}
    </>
  );
}
