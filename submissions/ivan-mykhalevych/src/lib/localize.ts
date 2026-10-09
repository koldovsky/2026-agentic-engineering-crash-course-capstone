import type { Language } from "./language";
import { UK_QUESTIONS } from "./questions.uk";
import type { Question } from "./types";

export interface QuestionTranslation {
  text: string;
  options: [string, string, string, string];
  explanation: string;
}

const UK_TOPIC_LABELS: Record<string, string> = {
  Basics: "Основи",
  Strings: "Рядки",
  OOP: "ООП",
  Collections: "Колекції",
  Exceptions: "Винятки",
  Concurrency: "Багатопоточність",
  Streams: "Стріми",
  Generics: "Узагальнення",
  JVM: "JVM",
  "Memory model": "Модель пам'яті",
  Spring: "Spring",
  JPA: "JPA",
  Design: "Проєктування",
  Performance: "Продуктивність",
  "Modern Java": "Сучасна Java",
};

const TOPIC_LABELS: Record<Language, Record<string, string>> = { en: {}, uk: UK_TOPIC_LABELS };

export function localizeQuestion(
  question: Question,
  language: Language,
  translations: Record<string, QuestionTranslation> = UK_QUESTIONS,
): Question {
  if (language === "en") return question;
  const translation = translations[question.id];
  if (!translation) return question;
  return {
    ...question,
    text: translation.text,
    options: translation.options,
    explanation: translation.explanation,
  };
}

export function topicLabel(language: Language, topic: string): string {
  return TOPIC_LABELS[language][topic] ?? topic;
}
