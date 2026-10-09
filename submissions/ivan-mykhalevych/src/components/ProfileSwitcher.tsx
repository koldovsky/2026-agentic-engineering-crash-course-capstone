"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { MAX_NAME_LENGTH, MAX_PROFILES, addProfile, switchProfile } from "@/lib/profiles";
import type { ProfileError } from "@/lib/profiles";
import { ensureStoredProfile, newId, readProfiles, removeStoredProfile, saveProfiles } from "@/lib/profileStore";
import type { MessageKey } from "@/lib/translate";
import { useT } from "@/lib/useLanguage";
import { useProfiles } from "@/lib/useProfiles";

const control = "rounded-xl border border-line bg-surface px-3 py-1.5 text-sm backdrop-blur";
const smallButton = `${control} transition-colors hover:border-accent hover:text-accent`;

const ERROR_KEYS: Record<ProfileError, MessageKey> = {
  empty: "profile.error.empty",
  "too-long": "profile.error.too-long",
  duplicate: "profile.error.duplicate",
  "too-many": "profile.error.too-many",
};

export default function ProfileSwitcher() {
  const { profiles, activeId } = useProfiles();
  const { t } = useT();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<ProfileError | null>(null);

  useEffect(() => {
    ensureStoredProfile();
  }, [profiles.length]);

  const active = profiles.find((profile) => profile.id === activeId);
  if (!active) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = addProfile(readProfiles(), name, newId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    saveProfiles(result.state);
    setName("");
    setError(null);
    setAdding(false);
  };

  const remove = () => {
    const current = readProfiles();
    const target = current.profiles.find((profile) => profile.id === current.activeId);
    if (!target || !window.confirm(t("profile.confirmRemove", { name: target.name }))) return;
    removeStoredProfile(target.id);
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <select
        aria-label={t("profile.label")}
        value={active.id}
        onChange={(event) => saveProfiles(switchProfile(readProfiles(), event.target.value))}
        className={`${control} max-w-40 truncate`}
      >
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.name}
          </option>
        ))}
      </select>
      <button onClick={() => setAdding(!adding)} className={smallButton}>
        {t("profile.add")}
      </button>
      <button onClick={remove} className={smallButton}>
        {t("profile.remove")}
      </button>
      {adding && (
        <form onSubmit={submit} className="flex w-full flex-wrap items-center justify-end gap-2">
          <input
            aria-label={t("profile.nameLabel")}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("profile.namePlaceholder")}
            autoFocus
            className={`${control} min-w-0 max-w-full`}
          />
          <button type="submit" className={smallButton}>
            {t("profile.create")}
          </button>
          {error && (
            <p className="w-full text-right text-sm text-bad">
              {t(ERROR_KEYS[error], { max: error === "too-many" ? MAX_PROFILES : MAX_NAME_LENGTH })}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
