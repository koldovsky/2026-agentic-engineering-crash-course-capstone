import type { Question } from "./types";

export interface Mistake {
  question: Question;
  chosen: number | null;
}

export function getMistakes(questions: Question[], answers: (number | null)[]): Mistake[] {
  return questions.flatMap((question, i) => {
    const chosen = answers[i] ?? null;
    return chosen === question.correctIndex ? [] : [{ question, chosen }];
  });
}
