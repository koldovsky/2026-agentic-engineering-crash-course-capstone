import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MainButton } from "./MainButton";
import { PreferencesProvider } from "./PreferencesProvider";

// Stage 3 rendering of the main button: the crit overlay (design D12/D18), the fixed click-status
// slot (design D13) and the value the floating +N skin shows (design D9). The animations
// themselves are CSS and belong to e2e/add-upgrades-v2.spec.ts; jsdom only sees the DOM.

let reducedMotion = false;

// jsdom does not implement matchMedia; the reduced-motion query is the only one these tests vary.
beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reducedMotion : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

beforeEach(() => {
  reducedMotion = false;
});

afterEach(cleanup);

type Props = Partial<ComponentProps<typeof MainButton>>;

function renderButton(props: Props = {}) {
  return render(
    <PreferencesProvider>
      <MainButton
        enabled
        onClick={() => {}}
        appearance={{ stack: [], material: "classic" }}
        clickValue={1}
        {...props}
      />
    </PreferencesProvider>,
  );
}

describe("MainButton crit overlay", () => {
  it("shows the crit text, the flash over the button and the 12-particle burst", () => {
    renderButton({ crit: true, critKey: 1 });

    expect(screen.getByTestId("crit-text").textContent).toBe("КРИТ ×10!");
    expect(screen.getByTestId("crit-flash")).toBeTruthy();
    expect(screen.getAllByTestId("crit-particle")).toHaveLength(12);
    expect(screen.getByTestId("main-button").getAttribute("data-crit")).toBe("true");
  });

  it("spreads the particles evenly around the button", () => {
    renderButton({ crit: true, critKey: 1 });

    const angles = screen
      .getAllByTestId("crit-particle")
      .map((particle) => particle.style.getPropertyValue("--crit-angle"));
    expect(angles[0]).toBe("0deg");
    expect(angles[1]).toBe("30deg");
    expect(angles[11]).toBe("330deg");
  });

  it("keeps the text and the flash but drops the burst under reduced motion", () => {
    reducedMotion = true;
    renderButton({ crit: true, critKey: 1 });

    expect(screen.getByTestId("crit-text")).toBeTruthy();
    expect(screen.getByTestId("crit-flash")).toBeTruthy();
    expect(screen.queryByTestId("crit-burst")).toBeNull();
    expect(screen.queryAllByTestId("crit-particle")).toHaveLength(0);
  });

  it("renders nothing of the overlay without a crit", () => {
    renderButton();

    expect(screen.queryByTestId("crit-text")).toBeNull();
    expect(screen.queryByTestId("crit-flash")).toBeNull();
    expect(screen.getByTestId("main-button").getAttribute("data-crit")).toBeNull();
  });

  it("hides the overlay from assistive technology", () => {
    renderButton({ crit: true, critKey: 1 });

    for (const id of ["crit-text", "crit-flash", "crit-burst"]) {
      expect(screen.getByTestId(id).getAttribute("aria-hidden"), id).toBe("true");
    }
  });
});

describe("MainButton click-status slot", () => {
  it("stays mounted and empty without a combo and without a bonus", () => {
    renderButton();

    const slot = screen.getByTestId("click-status");
    expect(slot.childElementCount).toBe(0);
    expect(screen.queryByTestId("combo")).toBeNull();
    expect(screen.queryByTestId("golden-bonus")).toBeNull();
  });

  it("shows the combo multiplier and its level", () => {
    renderButton({ comboLevel: 10 });

    const combo = screen.getByTestId("combo");
    expect(combo.textContent).toBe("Комбо ×2");
    expect(combo.getAttribute("data-combo-level")).toBe("10");
    expect(screen.getByTestId("click-status").contains(combo)).toBe(true);
  });

  it("rounds the golden bonus up to whole seconds", () => {
    renderButton({ bonusMs: 29_100 });

    expect(screen.getByTestId("golden-bonus").textContent).toBe("Золотий бонус ×7: 30 с");
  });

  it("shows the combo and the bonus together", () => {
    renderButton({ comboLevel: 5, bonusMs: 1_000 });

    expect(screen.getByTestId("combo").textContent).toBe("Комбо ×1,5");
    expect(screen.getByTestId("golden-bonus").textContent).toBe("Золотий бонус ×7: 1 с");
    expect(screen.getByTestId("click-status").childElementCount).toBe(2);
  });
});

describe("MainButton floating number", () => {
  const withSkin: Props = { appearance: { stack: ["floating-number"], material: "classic" } };

  it("shows what the press actually credited, not the plain click value", () => {
    renderButton({ ...withSkin, clickValue: 1, onClick: () => 10 });

    fireEvent.click(screen.getByTestId("main-button"), { detail: 1, clientX: 5, clientY: 6 });
    expect(screen.getByTestId("floating-number").textContent).toBe("+10");
  });

  it("falls back to the click value when the press reports nothing", () => {
    renderButton({ ...withSkin, clickValue: 3, onClick: () => {} });

    fireEvent.click(screen.getByTestId("main-button"), { detail: 1, clientX: 5, clientY: 6 });
    expect(screen.getByTestId("floating-number").textContent).toBe("+3");
  });
});
