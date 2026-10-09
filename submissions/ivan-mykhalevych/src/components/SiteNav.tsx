"use client";

import Link from "next/link";
import { useT } from "@/lib/useLanguage";

export default function SiteNav() {
  const { t } = useT();
  return (
    <nav className="flex items-center gap-4 font-mono text-sm">
      <Link href="/" className="text-muted hover:text-accent">
        {t("nav.home")}
      </Link>
      <Link href="/dashboard" className="text-muted hover:text-accent">
        {t("nav.dashboard")}
      </Link>
      <Link href="/logs" className="text-muted hover:text-accent">
        {t("nav.logs")}
      </Link>
    </nav>
  );
}
