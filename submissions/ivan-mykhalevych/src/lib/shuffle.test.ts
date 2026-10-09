import { describe, expect, it } from "vitest";
import { QUESTION_BANK } from "./questions";
import { QUIZ_LENGTH, pickQuiz, shuffleQuestions } from "./shuffle";

function deterministicRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const source = QUESTION_BANK.filter((q) => q.level === "junior");

describe("shuffleQuestions (spec R7)", () => {
  it("keeps exactly the same questions", () => {
    const out = shuffleQuestions(source, deterministicRandom(1));
    expect(out.map((q) => q.id).sort()).toEqual(source.map((q) => q.id).sort());
  });

  it("does not mutate its input", () => {
    const copy = JSON.parse(JSON.stringify(source));
    shuffleQuestions(source, deterministicRandom(2));
    expect(source).toEqual(copy);
  });

  it("keeps the same option texts and the right answer per question", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      for (const shuffled of shuffleQuestions(source, deterministicRandom(seed))) {
        const original = source.find((q) => q.id === shuffled.id)!;
        expect([...shuffled.options].sort()).toEqual([...original.options].sort());
        expect(shuffled.options[shuffled.correctIndex]).toBe(original.options[original.correctIndex]);
      }
    }
  });

  it("is deterministic for the same seed", () => {
    expect(shuffleQuestions(source, deterministicRandom(7))).toEqual(shuffleQuestions(source, deterministicRandom(7)));
  });

  it("actually changes the order for at least one seed", () => {
    const original = source.map((q) => q.id).join();
    const changed = [1, 2, 3].some(
      (seed) => shuffleQuestions(source, deterministicRandom(seed)).map((q) => q.id).join() !== original,
    );
    expect(changed).toBe(true);
  });
});

describe("pickQuiz (spec R3)", () => {
  const pool = Array.from({ length: 40 }, (_, i) => ({ ...source[i % source.length], id: `p${i}` }));

  it("returns the quiz length of distinct questions from the pool", () => {
    const quiz = pickQuiz(pool, deterministicRandom(3));
    expect(quiz).toHaveLength(QUIZ_LENGTH);
    expect(new Set(quiz.map((q) => q.id)).size).toBe(QUIZ_LENGTH);
    for (const q of quiz) expect(pool.map((p) => p.id)).toContain(q.id);
  });

  it("is deterministic for the same seed and varies with the seed", () => {
    expect(pickQuiz(pool, deterministicRandom(5))).toEqual(pickQuiz(pool, deterministicRandom(5)));
    const ids = (seed: number) => pickQuiz(pool, deterministicRandom(seed)).map((q) => q.id).join();
    expect(new Set([1, 2, 3, 4].map(ids)).size).toBeGreaterThan(1);
  });

  it("returns the whole pool when it is smaller than the length", () => {
    expect(pickQuiz(pool.slice(0, 5), deterministicRandom(1))).toHaveLength(5);
  });

  it("honours a custom length and keeps the right answers", () => {
    const quiz = pickQuiz(pool, deterministicRandom(9), 4);
    expect(quiz).toHaveLength(4);
    for (const shuffled of quiz) {
      const original = pool.find((q) => q.id === shuffled.id)!;
      expect(shuffled.options[shuffled.correctIndex]).toBe(original.options[original.correctIndex]);
    }
  });

  it("does not mutate the pool", () => {
    const copy = JSON.parse(JSON.stringify(pool));
    pickQuiz(pool, deterministicRandom(2));
    expect(pool).toEqual(copy);
  });
});
