import type { Level, Question } from "./types";

export interface QuizState {
  questions: Question[];
  index: number;
  selected: number | null;
  answers: (number | null)[];
  finished: boolean;
}

export function initQuiz(questions: Question[]): QuizState {
  return {
    questions,
    index: 0,
    selected: null,
    answers: questions.map(() => null),
    finished: false,
  };
}

export function selectOption(state: QuizState, option: number): QuizState {
  if (state.finished || state.selected !== null) return state;
  const answers = [...state.answers];
  answers[state.index] = option;
  return { ...state, selected: option, answers };
}

export function nextQuestion(state: QuizState): QuizState {
  if (state.finished || state.selected === null) return state;
  if (state.index === state.questions.length - 1) return { ...state, finished: true };
  return { ...state, index: state.index + 1, selected: null };
}

function isOption(value: unknown): value is 0 | 1 | 2 | 3 {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 3;
}

function toQuestion(value: unknown, level: Level): Question | null {
  if (typeof value !== "object" || value === null) return null;
  const { id, topic, text, options, correctIndex, explanation, code } = value as Record<string, unknown>;
  if (typeof id !== "string" || typeof topic !== "string" || typeof text !== "string") return null;
  if (typeof explanation !== "string" || !isOption(correctIndex)) return null;
  if (!Array.isArray(options) || options.length !== 4 || !options.every((option) => typeof option === "string")) return null;
  if (code !== undefined && typeof code !== "string") return null;
  const question: Question = {
    id,
    level,
    topic,
    text,
    options: options as Question["options"],
    correctIndex,
    explanation,
  };
  if (code !== undefined) question.code = code;
  return question;
}

export function serializeQuiz(state: QuizState): string {
  return JSON.stringify(state);
}

export function parseQuiz(raw: string | null, level: Level): QuizState | null {
  if (raw === null) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const { questions, index, selected, answers, finished } = data as Record<string, unknown>;
  if (finished !== false || !Array.isArray(questions) || questions.length === 0) return null;
  if ((questions as { level?: unknown }[]).some((question) => (question as { level?: unknown })?.level !== level)) return null;
  const parsed = questions.map((question) => toQuestion(question, level));
  if (parsed.some((question) => question === null)) return null;
  if (!Array.isArray(answers) || answers.length !== questions.length) return null;
  if (!answers.every((answer) => answer === null || isOption(answer))) return null;
  if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= questions.length) return null;
  if (selected !== null && !isOption(selected)) return null;
  if (answers[index] !== selected) return null;
  return {
    questions: parsed as Question[],
    index,
    selected: selected as QuizState["selected"],
    answers: answers as QuizState["answers"],
    finished: false,
  };
}
