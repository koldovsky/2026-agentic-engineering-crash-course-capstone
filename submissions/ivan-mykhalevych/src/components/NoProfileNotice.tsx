"use client";

import { useSyncExternalStore } from "react";
import { storageAvailable, subscribeToStore } from "@/lib/profileStore";
import { useT } from "@/lib/useLanguage";

export default function NoProfileNotice() {
  const available = useSyncExternalStore(subscribeToStore, storageAvailable, () => true);
  const { t } = useT();
  return <p className="text-muted">{available ? t("storage.loading") : t("storage.blocked")}</p>;
}
