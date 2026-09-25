import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { BalanceCounter } from "./BalanceCounter";
import { PreferencesProvider } from "./PreferencesProvider";

// jsdom does not implement matchMedia; PreferencesProvider needs it to resolve the theme and the
// reduced-motion preference (exercised for real by the Playwright scenarios in e2e/).
beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

afterEach(cleanup);

function renderBalance(balance: number, visible: boolean, loaded: boolean) {
  return render(
    <PreferencesProvider>
      <BalanceCounter balance={balance} visible={visible} loaded={loaded} />
    </PreferencesProvider>,
  );
}

describe("BalanceCounter", () => {
  it("does not replay the bump animation for the hydration correction", () => {
    const { rerender } = renderBalance(0, false, false);
    const nodeBeforeLoad = screen.getByTestId("balance");

    // The saved state arrives right after hydration: balance jumps from the placeholder to the
    // real value while `loaded` flips true in the same update — this must not bump.
    rerender(
      <PreferencesProvider>
        <BalanceCounter balance={7} visible loaded />
      </PreferencesProvider>,
    );
    expect(screen.getByTestId("balance")).toBe(nodeBeforeLoad);
  });

  it("replays the bump animation for a balance change after load", () => {
    const { rerender } = renderBalance(7, true, true);
    const nodeAfterLoad = screen.getByTestId("balance");

    rerender(
      <PreferencesProvider>
        <BalanceCounter balance={8} visible loaded />
      </PreferencesProvider>,
    );
    expect(screen.getByTestId("balance")).not.toBe(nodeAfterLoad);
  });

  it("exposes an accessible, meaningful status label instead of a bare aria-label span", () => {
    renderBalance(5, true, true);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-label")).toBe("Баланс: 5");
    expect(screen.getByTestId("balance").textContent).toBe("5");
  });
});
