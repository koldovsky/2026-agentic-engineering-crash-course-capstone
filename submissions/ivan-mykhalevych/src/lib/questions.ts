import { JUNIOR_QUESTIONS } from "./bank/junior";
import { MIDDLE_QUESTIONS } from "./bank/middle";
import { SENIOR_QUESTIONS } from "./bank/senior";
import type { Level, Question } from "./types";

export const QUESTION_BANK: Question[] = [...JUNIOR_QUESTIONS, ...MIDDLE_QUESTIONS, ...SENIOR_QUESTIONS];

export function getQuestions(level: Level): Question[] {
  return QUESTION_BANK.filter((q) => q.level === level);
}
