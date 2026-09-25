import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/game/state";
import type { GameState } from "@/lib/game/types";
import { formatNumber } from "@/lib/i18n";
import { HelperZone } from "./HelperZone";
import { PreferencesProvider } from "./PreferencesProvider";
import { ShopBox } from "./ShopBox";

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

afterEach(cleanup);

const STATE: GameState = {
  ...createInitialState(),
  balance: 0,
  totalClicks: 750,
  ownedSkins: ["soft-shadow"],
  enabledSkins: ["soft-shadow"],
  helpers: { monkey: 1200, robot: 0, factory: 0 },
};

function renderShop(state: GameState) {
  return render(
    <PreferencesProvider>
      <ShopBox state={state} onBuy={() => {}} onToggle={() => {}} />
    </PreferencesProvider>,
  );
}

describe("ShopBox", () => {
  it("describes every buy button and skin toggle with its item name", () => {
    renderShop(STATE);
    const controls = [
      ...screen.getAllByTestId(/^shop-buy-/),
      ...screen.getAllByTestId(/^skin-toggle-/),
    ];
    expect(controls.length).toBeGreaterThan(1);
    const describedBy = new Set<string>();
    for (const control of controls) {
      const id = control.getAttribute("aria-describedby");
      expect(id).toBeTruthy();
      describedBy.add(id as string);
      const item = control.closest("li") as HTMLElement;
      const name = document.getElementById(id as string);
      expect(name).not.toBeNull();
      expect(item.contains(name)).toBe(true);
      expect(name?.textContent).not.toBe("");
    }
    expect(describedBy.size).toBe(controls.length);
  });

  it("formats the owned helper count", () => {
    renderShop(STATE);
    expect(screen.getByTestId("shop-count-monkey").textContent).toContain(
      formatNumber(1200, "uk"),
    );
  });
});

describe("HelperZone", () => {
  it("formats count and rate in the monkey label", () => {
    render(
      <PreferencesProvider>
        <HelperZone state={STATE} />
      </PreferencesProvider>,
    );
    const label = screen.getByTestId("helper-monkey").getAttribute("aria-label") ?? "";
    expect(label).toContain(formatNumber(1200, "uk"));
    expect(label).not.toContain("1200");
  });
});
