"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAccount } from "@/lib/account/AccountProvider";
import { errorMessageKey } from "@/lib/account/errors";
import { useT } from "@/lib/useLanguage";

export const field = "w-full rounded-xl border border-line bg-surface px-3 py-2 backdrop-blur";
export const primaryButton =
  "rounded-xl bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-60";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { session, signIn, register } = useAccount();
  const { t } = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session.status === "signedIn") router.replace("/account");
  }, [session.status, router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const failure = mode === "login" ? await signIn(email, password) : await register(email, password, displayName);
    setPassword("");
    setError(failure);
    setBusy(false);
  };

  const registering = mode === "register";

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-surface p-6 backdrop-blur">
      <label className="block space-y-1">
        <span className="text-sm text-muted">{t("auth.email")}</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={field}
        />
      </label>
      {registering && (
        <label className="block space-y-1">
          <span className="text-sm text-muted">{t("auth.displayName")}</span>
          <input
            required
            maxLength={24}
            autoComplete="nickname"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className={field}
          />
        </label>
      )}
      <label className="block space-y-1">
        <span className="text-sm text-muted">{t("auth.password")}</span>
        <input
          type="password"
          required
          autoComplete={registering ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={field}
        />
      </label>
      {error !== null && (
        <p role="alert" className="text-sm text-bad">
          {t(errorMessageKey(error))}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? t("auth.working") : registering ? t("auth.register") : t("auth.signIn")}
        </button>
        <p className="text-sm text-muted">
          {registering ? t("auth.haveAccount") : t("auth.noAccountYet")}{" "}
          <Link href={registering ? "/login" : "/register"} className="text-accent underline">
            {registering ? t("auth.signIn") : t("auth.register")}
          </Link>
        </p>
      </div>
    </form>
  );
}
