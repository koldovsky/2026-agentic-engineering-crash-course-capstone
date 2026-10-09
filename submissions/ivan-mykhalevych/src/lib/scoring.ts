import type { Question, QuizScore } from "./types";

export function scoreQuiz(questions: Question[], answers: (number | null)[]): QuizScore {
  const total = questions.length;
  const correct = questions.filter((q, i) => answers[i] === q.correctIndex).length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { correct, total, percent };
}
