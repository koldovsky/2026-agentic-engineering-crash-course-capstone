import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { GoldenSpawn } from "@/lib/game/types";
import { GoldenButton } from "./GoldenButton";
import { PreferencesProvider } from "./PreferencesProvider";

// jsdom does not implement matchMedia; `matches: false` keeps theme and motion at their defaults.
beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

afterEach(cleanup);

/** jsdom's viewport is 1024 × 768, so the rect below is `decorRect({0.5, 0.25}, 64 × 64)`. */
const SPAWN: GoldenSpawn = { position: { x: 0.5, y: 0.25 }, remainingMs: 5000 };

function renderGolden(onCatch = () => {}) {
  return render(
    <PreferencesProvider>
      <GoldenButton spawn={SPAWN} onCatch={onCatch} />
    </PreferencesProvider>,
  );
}

describe("GoldenButton", () => {
  it("is a real button at the placed rect with a localized label", () => {
    renderGolden();

    const golden = screen.getByTestId("golden-button");
    expect(golden.tagName).toBe("BUTTON");
    expect(golden.getAttribute("type")).toBe("button");
    expect(golden.getAttribute("aria-label")).toBe("Зловити золоту кнопку");
    expect(golden.style.left).toBe("512px");
    expect(golden.style.top).toBe("192px");
    expect(golden.style.width).toBe("64px");
    expect(golden.style.height).toBe("64px");
  });

  it("catches on click", () => {
    const onCatch = vi.fn();
    renderGolden(onCatch);

    fireEvent.click(screen.getByTestId("golden-button"));
    expect(onCatch).toHaveBeenCalledTimes(1);
  });

  it("keeps the animated glow out of the accessibility tree", () => {
    renderGolden();

    const glow = screen.getByTestId("golden-button").querySelector(".golden-button-glow");
    expect(glow?.getAttribute("aria-hidden")).toBe("true");
  });
});
