"use client";

import Link from "next/link";
import ProfileSwitcher from "./ProfileSwitcher";
import { useAccount } from "@/lib/account/AccountProvider";
import { useT } from "@/lib/useLanguage";

const control = "rounded-xl border border-line bg-surface px-3 py-1.5 text-sm backdrop-blur";
const action = `${control} transition-colors hover:border-accent hover:text-accent`;

export default function HeaderAccount() {
  const { session, signOut } = useAccount();
  const { t } = useT();

  if (session.status === "loading") return null;

  if (session.status === "guest") {
    return (
      <>
        <ProfileSwitcher />
        <Link href="/login" className={action}>
          {t("auth.signIn")}
        </Link>
        <Link href="/register" className={action}>
          {t("auth.register")}
        </Link>
      </>
    );
  }

  return (
    <>
      <span className={`${control} max-w-40 truncate`}>{session.user.displayName}</span>
      <Link href="/account" className={action}>
        {t("auth.account")}
      </Link>
      <button onClick={() => void signOut()} className={action}>
        {t("auth.signOut")}
      </button>
    </>
  );
}
