import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ACHIEVEMENTS } from "@/lib/game/achievements";
import { createInitialState } from "@/lib/game/state";
import { createInitialTrophies } from "@/lib/game/trophies";
import { AchievementsPanel } from "./AchievementsPanel";
import { AchievementIcon } from "./AchievementIcons";
import { PreferencesProvider } from "./PreferencesProvider";

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;

  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
    };
  }
});

afterEach(cleanup);

function renderPanel(unlocked: readonly ["first-click"] | readonly [] = ["first-click"]) {
  const trophies = {
    ...createInitialTrophies(),
    unlocked,
  };
  return render(
    <PreferencesProvider>
      <AchievementsPanel state={createInitialState()} trophies={trophies} />
    </PreferencesProvider>,
  );
}

describe("AchievementsPanel", () => {
  it("closes from a cross button", () => {
    renderPanel([]);

    fireEvent.click(screen.getByTestId("achievements"));
    const close = screen.getByTestId("achievements-close");
    expect(close.getAttribute("aria-label")).toBe("Закрити");
    expect(close.querySelector("svg")).not.toBeNull();
    expect(close.textContent).not.toContain("Закрити");

    fireEvent.click(close);
    expect(screen.getByTestId("achievements-dialog").hasAttribute("open")).toBe(false);
  });

  it("marks unlocked rows green-ready with a check and a unique icon", () => {
    renderPanel(["first-click"]);

    const done = screen.getByTestId("achievement-first-click");
    expect(done.getAttribute("data-unlocked")).toBe("true");
    expect(done.className).toContain("achievement-row");
    expect(screen.getByTestId("achievement-check-first-click")).toBeTruthy();
    expect(done.querySelector("[data-achievement-icon='first-click']")).not.toBeNull();

    const locked = screen.getByTestId("achievement-clicks-100");
    expect(locked.getAttribute("data-unlocked")).toBe("false");
    expect(screen.queryByTestId("achievement-check-clicks-100")).toBeNull();
  });
});

describe("AchievementIcon", () => {
  it("draws a distinct glyph for every achievement", () => {
    const { container } = render(
      <>
        {ACHIEVEMENTS.map((achievement) => (
          <AchievementIcon key={achievement.id} id={achievement.id} />
        ))}
      </>,
    );
    const marks = [...container.querySelectorAll("svg")].map((svg) => svg.innerHTML);
    expect(marks).toHaveLength(ACHIEVEMENTS.length);
    expect(new Set(marks).size).toBe(ACHIEVEMENTS.length);
  });
});
