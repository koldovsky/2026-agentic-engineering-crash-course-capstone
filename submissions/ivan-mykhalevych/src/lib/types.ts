export const LEVELS = ["junior", "middle", "senior"] as const;
export type Level = (typeof LEVELS)[number];

export interface Question {
  id: string;
  level: Level;
  topic: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  code?: string;
}

export interface QuizScore {
  correct: number;
  total: number;
  percent: number;
}
