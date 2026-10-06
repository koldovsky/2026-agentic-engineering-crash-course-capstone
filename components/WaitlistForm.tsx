"use client";

import { useState, type FormEvent } from "react";
import { nextErrorOnEdit, validateEmail } from "@/lib/waitlist";

const SUCCESS_MESSAGE = "Дякуємо! Це демо: вас не додано до списку, лист не надсилається.";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateEmail(email);
    if (result.ok) {
      setError(null);
      setSuccess(true);
    } else {
      setSuccess(false);
      setError(result.error);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="mt-6 max-w-md">
      <label htmlFor="waitlist-email" className="block font-medium">
        Електронна пошта
      </label>
      <input
        id="waitlist-email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => {
          const value = event.target.value;
          setEmail(value);
          setError((current) => nextErrorOnEdit(current, value));
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "waitlist-error" : undefined}
        className="mt-2 w-full rounded-md border border-zinc-400 bg-background px-3 py-2"
      />
      <button
        type="submit"
        className="mt-4 rounded-md bg-foreground px-6 py-3 font-medium text-background"
      >
        Приєднатися
      </button>
      <div className="mt-4 min-h-6">
        <p id="waitlist-error" role="alert" className="text-red-700 dark:text-red-400">
          {error}
        </p>
        <p role="status" className="text-green-700 dark:text-green-400">
          {success ? SUCCESS_MESSAGE : ""}
        </p>
      </div>
    </form>
  );
}
