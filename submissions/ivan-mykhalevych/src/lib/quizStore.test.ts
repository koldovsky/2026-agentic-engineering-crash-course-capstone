import { afterEach, describe, expect, it, vi } from "vitest";
import { initQuiz } from "./quizState";
import { clearRunningQuiz, loadRunningQuiz, saveRunningQuiz } from "./quizStore";
import type { Question } from "./types";

const question: Question = {
  id: "j1",
  level: "junior",
  topic: "Basics",
  text: "text",
  options: ["a", "b", "c", "d"],
  correctIndex: 0,
  explanation: "why",
};

function fakeSessionStorage(): Storage {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
    clear: () => items.clear(),
    key: () => null,
    get length() {
      return items.size;
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("quizStore (spec R3)", () => {
  it("saves, loads per level and clears a running quiz", () => {
    vi.stubGlobal("sessionStorage", fakeSessionStorage());
    const state = initQuiz([question]);
    saveRunningQuiz("junior", state);
    expect(loadRunningQuiz("junior")).toEqual(state);
    expect(loadRunningQuiz("middle")).toBeNull();
    clearRunningQuiz("junior");
    expect(loadRunningQuiz("junior")).toBeNull();
  });

  it("removes a saved value that is not a valid quiz of that level", () => {
    const storage = fakeSessionStorage();
    vi.stubGlobal("sessionStorage", storage);
    storage.setItem("java-trainer-quiz:junior", "{broken");
    expect(loadRunningQuiz("junior")).toBeNull();
    expect(storage.getItem("java-trainer-quiz:junior")).toBeNull();
  });

  it("ignores blocked storage", () => {
    const blocked = new Proxy({}, { get: () => () => { throw new Error("blocked"); } });
    vi.stubGlobal("sessionStorage", blocked);
    expect(() => saveRunningQuiz("junior", initQuiz([question]))).not.toThrow();
    expect(() => clearRunningQuiz("junior")).not.toThrow();
    expect(loadRunningQuiz("junior")).toBeNull();
  });
});
