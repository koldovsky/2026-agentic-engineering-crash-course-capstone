import type { Question } from "./types";

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function shuffleQuestions(questions: Question[], rng: () => number): Question[] {
  return shuffled(questions, rng).map((q) => {
    const order = shuffled([0, 1, 2, 3], rng);
    return {
      ...q,
      options: order.map((i) => q.options[i]) as Question["options"],
      correctIndex: order.indexOf(q.correctIndex) as Question["correctIndex"],
    };
  });
}

export const QUIZ_LENGTH = 12;

export function pickQuiz(pool: Question[], rng: () => number, length: number = QUIZ_LENGTH): Question[] {
  return shuffleQuestions(pool, rng).slice(0, length);
}
