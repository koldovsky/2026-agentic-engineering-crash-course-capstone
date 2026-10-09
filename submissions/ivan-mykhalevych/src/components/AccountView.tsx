"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { field, primaryButton } from "./AuthForm";
import { useAccount } from "@/lib/account/AccountProvider";
import { errorMessageKey } from "@/lib/account/errors";
import type { MessageKey } from "@/lib/translate";
import { useT } from "@/lib/useLanguage";
import { useActiveProfile } from "@/lib/useProfiles";

const card = "space-y-3 rounded-2xl border border-line bg-surface p-6 backdrop-blur";

function Feedback({ error, success }: { error: string | null; success: MessageKey | null }) {
  const { t } = useT();
  if (error !== null) {
    return (
      <p role="alert" className="text-sm text-bad">
        {t(errorMessageKey(error === "invalid-credentials" ? "wrong-password" : error))}
      </p>
    );
  }
  if (success !== null) {
    return (
      <p role="status" className="text-sm text-good">
        {t(success)}
      </p>
    );
  }
  return null;
}

function useAction(run: () => Promise<string | null>, successKey: MessageKey) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);
    const failure = await run();
    setError(failure);
    setDone(failure === null);
    setBusy(false);
  };
  return { busy, submit, feedback: <Feedback error={error} success={done ? successKey : null} /> };
}

function NameSection({ current }: { current: string }) {
  const { updateName } = useAccount();
  const { t } = useT();
  const [name, setName] = useState(current);
  const { busy, submit, feedback } = useAction(() => updateName(name), "account.saved");
  return (
    <form onSubmit={submit} className={card}>
      <h2 className="text-xl font-semibold">{t("account.nameHeading")}</h2>
      <input
        aria-label={t("auth.displayName")}
        required
        maxLength={24}
        value={name}
        onChange={(event) => setName(event.target.value)}
        className={field}
      />
      {feedback}
      <button type="submit" disabled={busy} className={primaryButton}>
        {t("account.save")}
      </button>
    </form>
  );
}

function PasswordSection() {
  const { changePassword } = useAccount();
  const { t } = useT();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const { busy, submit, feedback } = useAction(async () => {
    const failure = await changePassword(current, next);
    setCurrent("");
    setNext("");
    return failure;
  }, "account.passwordChanged");
  return (
    <form onSubmit={submit} className={card}>
      <h2 className="text-xl font-semibold">{t("account.passwordHeading")}</h2>
      <input
        type="password"
        required
        aria-label={t("account.currentPassword")}
        placeholder={t("account.currentPassword")}
        autoComplete="current-password"
        value={current}
        onChange={(event) => setCurrent(event.target.value)}
        className={field}
      />
      <input
        type="password"
        required
        aria-label={t("account.newPassword")}
        placeholder={t("account.newPassword")}
        autoComplete="new-password"
        value={next}
        onChange={(event) => setNext(event.target.value)}
        className={field}
      />
      {feedback}
      <button type="submit" disabled={busy} className={primaryButton}>
        {t("account.changePassword")}
      </button>
    </form>
  );
}

function ImportSection() {
  const { importProgress } = useAccount();
  const profile = useActiveProfile();
  const { t } = useT();
  const { busy, submit, feedback } = useAction(importProgress, "account.imported");
  return (
    <section className={card}>
      <h2 className="text-xl font-semibold">{t("account.importHeading")}</h2>
      {profile === null ? (
        <p className="text-muted">{t("account.noLocalProfile")}</p>
      ) : (
        <>
          <p className="text-muted break-words">{t("account.importText", { name: profile.name })}</p>
          {feedback}
          <button onClick={() => void submit()} disabled={busy} className={primaryButton}>
            {t("account.import")}
          </button>
        </>
      )}
    </section>
  );
}

function DeleteSection() {
  const { deleteAccount } = useAccount();
  const { t } = useT();
  const [password, setPassword] = useState("");
  const { busy, submit, feedback } = useAction(async () => {
    const failure = await deleteAccount(password);
    setPassword("");
    return failure;
  }, "account.saved");
  const confirmAndSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (window.confirm(t("account.confirmDelete"))) void submit();
  };
  return (
    <form onSubmit={confirmAndSubmit} className={card}>
      <h2 className="text-xl font-semibold">{t("account.deleteHeading")}</h2>
      <p className="text-muted">{t("account.deleteText")}</p>
      <input
        type="password"
        required
        aria-label={t("auth.password")}
        placeholder={t("auth.password")}
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className={field}
      />
      {feedback}
      <button
        type="submit"
        disabled={busy}
        className="rounded-xl border border-bad px-5 py-2.5 font-semibold text-bad transition-opacity hover:opacity-80 disabled:opacity-60"
      >
        {t("account.delete")}
      </button>
    </form>
  );
}

export default function AccountView() {
  const { session } = useAccount();
  const { t } = useT();
  const router = useRouter();

  useEffect(() => {
    if (session.status === "guest") router.replace("/login");
  }, [session.status, router]);

  if (session.status !== "signedIn") return <p className="text-muted">{t("storage.loading")}</p>;

  return (
    <div className="space-y-6">
      <p className="text-muted break-words">
        {t("account.signedInAs", { name: session.user.displayName, email: session.user.email })}
      </p>
      <NameSection key={session.user.displayName} current={session.user.displayName} />
      <PasswordSection />
      <ImportSection />
      <DeleteSection />
    </div>
  );
}
