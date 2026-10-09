"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import { useAccount } from "@/lib/account/AccountProvider";
import { buildAttempt } from "@/lib/attempts";
import { localizeQuestion, topicLabel } from "@/lib/localize";
import { getMistakes } from "@/lib/mistakes";
import { initQuiz, nextQuestion, selectOption } from "@/lib/quizState";
import { clearRunningQuiz, loadRunningQuiz, saveRunningQuiz } from "@/lib/quizStore";
import type { QuizState } from "@/lib/quizState";
import { scoreQuiz } from "@/lib/scoring";
import { QUIZ_LENGTH, pickQuiz } from "@/lib/shuffle";
import type { Level, Question } from "@/lib/types";
import { useT } from "@/lib/useLanguage";

type QuizOrStartScreen = QuizState | null;
type Action =
  | { type: "start"; questions: Question[] }
  | { type: "restore"; state: QuizState }
  | { type: "select"; option: number }
  | { type: "next" };

function reducer(state: QuizOrStartScreen, action: Action): QuizOrStartScreen {
  if (action.type === "start") return initQuiz(action.questions);
  if (action.type === "restore") return action.state;
  if (state === null) return state;
  return action.type === "select" ? selectOption(state, action.option) : nextQuestion(state);
}

const card = "rounded-2xl border border-line bg-surface p-6 backdrop-blur";
const primaryBtn =
  "rounded-xl bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 font-semibold text-on-accent transition-opacity hover:opacity-90";
const ghostBtn =
  "rounded-xl border border-line px-5 py-2.5 transition-colors hover:border-accent hover:text-accent";

export default function QuizRunner({ level, questions }: { level: Level; questions: Question[] }) {
  const [state, dispatch] = useReducer(reducer, null);
  const { language, t, tn } = useT();
  const { record, session } = useAccount();
  const [savedOnDevice, setSavedOnDevice] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const screen = state === null ? "start" : state.finished ? "score" : state.index;

  useEffect(() => {
    if (screen !== "start") headingRef.current?.focus();
  }, [screen]);

  const loggedQuiz = useRef<QuizState | null>(null);

  useEffect(() => {
    if (!state?.finished || loggedQuiz.current === state) return;
    loggedQuiz.current = state;
    const attempt = buildAttempt(level, state.questions, state.answers, Date.now());
    const wasSignedIn = session.status === "signedIn";
    void record(attempt).then((outcome) => setSavedOnDevice(wasSignedIn && outcome === "device"));
  }, [state, level, record, session.status]);

  useEffect(() => {
    const saved = loadRunningQuiz(level);
    if (saved !== null) dispatch({ type: "restore", state: saved });
  }, [level]);

  useEffect(() => {
    if (state === null) return;
    if (state.finished) clearRunningQuiz(level);
    else saveRunningQuiz(level, state);
  }, [state, level]);

  const start = () => {
    setSavedOnDevice(false);
    dispatch({
      type: "start",
      questions: pickQuiz(
        questions.map((question) => localizeQuestion(question, language)),
        Math.random,
      ),
    });
  };

  if (state === null) {
    return (
      <section className={`${card} space-y-5`}>
        <p className="text-muted">
          {tn("quiz.intro", Math.min(QUIZ_LENGTH, questions.length), { pool: questions.length })}
        </p>
        <button onClick={start} className={primaryBtn}>
          {t("quiz.start")}
        </button>
      </section>
    );
  }

  if (state.finished) {
    const score = scoreQuiz(state.questions, state.answers);
    const mistakes = getMistakes(state.questions, state.answers);
    return (
      <div className="space-y-6">
        <section className={`${card} space-y-5`} aria-live="polite">
          <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold">
            {t("quiz.scoreTitle")}
          </h2>
          <p className="font-mono text-5xl font-bold text-accent">{score.percent}%</p>
          <p className="text-muted">{t("quiz.scoreSummary", { correct: score.correct, total: score.total })}</p>
          {savedOnDevice && (
            <p role="status" className="text-sm text-bad">
              {t("quiz.savedOnDevice")}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button onClick={start} className={primaryBtn}>
              {t("quiz.tryAgain")}
            </button>
            <Link href="/" className={ghostBtn}>
              {t("quiz.chooseLevel")}
            </Link>
          </div>
        </section>

        <section className={`${card} space-y-4`}>
          <h2 className="text-xl font-semibold">{t("quiz.reviewTitle")}</h2>
          {mistakes.length === 0 ? (
            <p className="text-good">{t("quiz.noMistakes")}</p>
          ) : (
            <ul className="space-y-5">
              {mistakes.map(({ question, chosen }) => (
                <li key={question.id} className="space-y-1.5 border-t border-line pt-4 first:border-0 first:pt-0">
                  <p className="font-semibold">{question.text}</p>
                  {question.code && (
                    <pre className="overflow-x-auto rounded-xl border border-line bg-ink/10 p-3 font-mono text-sm">
                      <code>{question.code}</code>
                    </pre>
                  )}
                  <p className="text-bad">
                    {t("quiz.yourAnswer", {
                      answer: chosen === null ? t("quiz.skipped") : question.options[chosen],
                    })}
                  </p>
                  <p className="text-good">
                    {t("quiz.correctAnswer", { answer: question.options[question.correctIndex] })}
                  </p>
                  <p className="text-sm text-muted">{question.explanation}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  const question = state.questions[state.index];
  const answered = state.selected !== null;
  const isLast = state.index === state.questions.length - 1;
  const progress = ((state.index + (answered ? 1 : 0)) / state.questions.length) * 100;

  return (
    <section className={`${card} space-y-5`}>
      <div>
        <div className="flex justify-between text-sm text-muted">
          <span>{t("quiz.progress", { current: state.index + 1, total: state.questions.length })}</span>
          <span className="font-mono">{topicLabel(language, question.topic)}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <h2 ref={headingRef} tabIndex={-1} className="text-xl leading-snug font-semibold">
        {question.text}
      </h2>

      {question.code && (
        <pre className="overflow-x-auto rounded-xl border border-line bg-ink/10 p-4 font-mono text-sm">
          <code>{question.code}</code>
        </pre>
      )}

      <ul className="space-y-2.5">
        {question.options.map((option, i) => {
          const isCorrect = i === question.correctIndex;
          const isChosen = i === state.selected;
          let style = "border-line hover:border-accent";
          if (answered && isCorrect) style = "border-good bg-good/15";
          else if (answered && isChosen) style = "border-bad bg-bad/15";
          else if (answered) style = "border-line opacity-60";
          return (
            <li key={option}>
              <button
                disabled={answered}
                onClick={() => dispatch({ type: "select", option: i })}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${style}`}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-line font-mono text-sm text-muted">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{option}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {answered && (
        <div aria-live="polite" className="space-y-3 border-t border-line pt-5">
          <p
            className={`font-mono font-semibold ${
              state.selected === question.correctIndex ? "text-good" : "text-bad"
            }`}
          >
            {state.selected === question.correctIndex ? t("quiz.correct") : t("quiz.wrong")}
          </p>
          <p className="text-muted">{question.explanation}</p>
          <button autoFocus onClick={() => dispatch({ type: "next" })} className={primaryBtn}>
            {isLast ? t("quiz.seeScore") : t("quiz.next")}
          </button>
        </div>
      )}
    </section>
  );
}
