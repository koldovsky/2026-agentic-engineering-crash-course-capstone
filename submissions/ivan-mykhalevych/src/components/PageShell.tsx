"use client";

import type { ReactNode } from "react";
import type { MessageKey } from "@/lib/translate";
import { useT } from "@/lib/useLanguage";

export default function PageShell({ titleKey, children }: { titleKey: MessageKey; children: ReactNode }) {
  const { t } = useT();
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:py-16">
      <h1 className="mb-6 text-3xl font-bold">
        <span className="text-accent">{t(titleKey)}</span>
      </h1>
      {children}
    </main>
  );
}
