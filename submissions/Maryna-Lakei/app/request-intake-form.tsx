"use client";

import { useRef, useState, type FormEvent } from "react";
import { generateFromRequest } from "@/lib/requirements/actions";
import { generationFailureMessage } from "@/lib/requirements/generation-failure";
import {
  RESULT_SECTION_LABELS,
  applyGenerationOutcome,
  type ReviewedResult,
} from "@/lib/requirements/result-review";
import { validateRawBusinessRequest } from "@/lib/requirements/validation";

type FailureReason =
  | "empty-input"
  | "missing-key"
  | "provider-error"
  | "timeout"
  | "invalid-payload";

export function RequestIntakeForm() {
  const [rawRequest, setRawRequest] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );
  const [inFlight, setInFlight] = useState(false);
  const [result, setResult] = useState<ReviewedResult | null>(null);
  const [failureReason, setFailureReason] = useState<FailureReason | null>(
    null,
  );
  const inFlightRef = useRef(false);
  const generationMessage = generationFailureMessage(failureReason);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlightRef.current) {
      return;
    }

    const validation = validateRawBusinessRequest(rawRequest);
    if (!validation.ok) {
      setValidationMessage(validation.message);
      setFailureReason(null);
      return;
    }

    setValidationMessage(null);
    setFailureReason(null);
    inFlightRef.current = true;
    setInFlight(true);
    try {
      const outcome = await generateFromRequest(rawRequest);
      if (outcome.ok) {
        setResult((stored) => applyGenerationOutcome(stored, outcome));
        setFailureReason(null);
      } else {
        setResult((stored) => applyGenerationOutcome(stored, outcome));
        setFailureReason(outcome.reason);
      }
    } catch {
      setResult((stored) =>
        applyGenerationOutcome(stored, {
          ok: false,
          reason: "provider-error",
        }),
      );
      setFailureReason("provider-error");
    } finally {
      inFlightRef.current = false;
      setInFlight(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4"
      data-generation-reason={failureReason ?? undefined}
    >
      <div className="flex flex-col gap-2">
        <label
          htmlFor="raw-business-request"
          className="text-sm font-medium text-neutral-950"
        >
          Raw business request
        </label>
        <textarea
          id="raw-business-request"
          name="rawBusinessRequest"
          value={rawRequest}
          rows={8}
          onChange={(event) => {
            setRawRequest(event.target.value);
          }}
          aria-invalid={validationMessage ? true : undefined}
          aria-describedby={
            validationMessage ? "raw-business-request-error" : undefined
          }
          className="w-full rounded-md border border-neutral-400 bg-white px-3 py-2 text-base text-neutral-950"
        />
      </div>
      {validationMessage ? (
        <p id="raw-business-request-error" role="alert" className="text-sm text-red-800">
          {validationMessage}
        </p>
      ) : null}
      {generationMessage ? (
        <p
          role="alert"
          aria-labelledby="generation-failure"
          className="text-sm text-red-800"
        >
          <span id="generation-failure">{generationMessage}</span>
        </p>
      ) : null}
      <button
        type="submit"
        disabled={inFlight}
        className="h-11 w-fit rounded-md bg-neutral-950 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        Generate
      </button>
      {result ? (
        <div className="flex flex-col gap-4 text-base text-neutral-950">
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">
              {RESULT_SECTION_LABELS.userStory}
            </h2>
            <p data-testid="user-story">{result.userStory}</p>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">
              {RESULT_SECTION_LABELS.acceptanceCriteria}
            </h2>
            <ul data-testid="acceptance-criteria" className="list-disc pl-5">
              {result.acceptanceCriteria.map((criterion, index) => (
                <li key={`${criterion}-${index}`}>{criterion}</li>
              ))}
            </ul>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">
              {RESULT_SECTION_LABELS.clarifyingQuestions}
            </h2>
            <ul data-testid="clarifying-questions" className="list-disc pl-5">
              {result.clarifyingQuestions.map((question, index) => (
                <li key={`${question}-${index}`}>{question}</li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </form>
  );
}
