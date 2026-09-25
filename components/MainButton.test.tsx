import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MainButton } from "./MainButton";
import { PreferencesProvider } from "./PreferencesProvider";

// jsdom does not implement matchMedia; `matches: false` keeps motion "full".
beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderButton() {
  return render(
    <PreferencesProvider>
      <MainButton
        enabled
        onClick={() => {}}
        appearance={{ stack: ["floating-number"], material: "classic" }}
        clickValue={1}
      />
    </PreferencesProvider>,
  );
}

function stubRect(element: HTMLElement) {
  element.getBoundingClientRect = () =>
    ({ left: 100, top: 200, width: 160, height: 160, right: 260, bottom: 360 }) as DOMRect;
}

describe("MainButton floating number", () => {
  it("starts at the pointer for mouse clicks", () => {
    renderButton();
    const button = screen.getByTestId("main-button");
    stubRect(button);
    fireEvent.click(button, { detail: 1, clientX: 12, clientY: 34 });
    const floating = screen.getByTestId("floating-number");
    expect(floating.style.left).toBe("12px");
    expect(floating.style.top).toBe("34px");
  });

  it("starts at the button center for keyboard clicks (detail 0)", () => {
    renderButton();
    const button = screen.getByTestId("main-button");
    stubRect(button);
    fireEvent.click(button, { detail: 0, clientX: 0, clientY: 0 });
    const floating = screen.getByTestId("floating-number");
    expect(floating.style.left).toBe("180px");
    expect(floating.style.top).toBe("280px");
  });

  it("clears pending removal timers on unmount", () => {
    vi.useFakeTimers();
    const { unmount } = renderButton();
    fireEvent.click(screen.getByTestId("main-button"), { detail: 1 });
    fireEvent.click(screen.getByTestId("main-button"), { detail: 1 });
    expect(vi.getTimerCount()).toBeGreaterThanOrEqual(2);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
