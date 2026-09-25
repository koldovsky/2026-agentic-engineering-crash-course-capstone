import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "./PreferencesProvider";
import { ResetProgress } from "./ResetProgress";

// jsdom implements neither matchMedia nor modal <dialog>; both are exercised by the Playwright
// scenarios in e2e/add-foundation.spec.ts.
beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;

  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});

// Vitest runs without globals, so Testing Library's automatic cleanup is not registered.
afterEach(cleanup);

function renderReset(onConfirm: () => void) {
  return render(
    <PreferencesProvider>
      <ResetProgress onConfirm={onConfirm} />
    </PreferencesProvider>,
  );
}

describe("ResetProgress", () => {
  it("wipes progress only through the confirm button", () => {
    const onConfirm = vi.fn();
    renderReset(onConfirm);

    fireEvent.click(screen.getByTestId("reset"));
    fireEvent.click(screen.getByTestId("reset-cancel"));
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("reset"));
    fireEvent.click(screen.getByTestId("reset-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("uses the copy of the current language", () => {
    renderReset(vi.fn());

    expect(screen.getByTestId("reset").textContent).toBe("Скинути прогрес");
    fireEvent.click(screen.getByTestId("reset"));
    expect(screen.getByTestId("reset-confirm").textContent).toBe("Скинути");
    expect(screen.getByTestId("reset-cancel").textContent).toBe("Скасувати");
  });
});
