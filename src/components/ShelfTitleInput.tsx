"use client";

import { useId, useRef, useState } from "react";

type ShelfTitleInputProps = {
  title: string;
  onRename: (title: string) => Promise<boolean>;
};

export const ShelfTitleInput = ({ title, onRename }: ShelfTitleInputProps) => {
  const [draft, setDraft] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const savingRef = useRef(false);
  const skipBlurRef = useRef(false);
  const helpId = useId();
  const errorId = useId();

  const saveDraft = async () => {
    if (skipBlurRef.current) {
      skipBlurRef.current = false;
      return;
    }
    if (savingRef.current) return;
    if (draft === null || draft === title) {
      setDraft(null);
      setSaveFailed(false);
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setSaveFailed(false);
    try {
      if (await onRename(draft)) {
        setDraft(null);
      } else {
        setSaveFailed(true);
      }
    } catch {
      setSaveFailed(true);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <label className="relative min-w-0 flex-1">
      <span className="sr-only">Raf adı</span>
      <input
        aria-label="Raf adı"
        aria-busy={isSaving}
        aria-describedby={saveFailed ? `${helpId} ${errorId}` : helpId}
        aria-invalid={saveFailed || undefined}
        className="h-8 w-full rounded-[2px] border border-[#8b5d37]/55 bg-[#f2dfc3] px-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-[#3b281b] outline-none focus:border-[#6f3f22]"
        disabled={isSaving}
        value={draft ?? title}
        onChange={(event) => {
          setDraft(event.target.value);
          setSaveFailed(false);
        }}
        onBlur={() => void saveDraft()}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            skipBlurRef.current = true;
            setDraft(null);
            setSaveFailed(false);
            event.currentTarget.blur();
          }
        }}
      />
      <span id={helpId} className="sr-only">Enter ile kaydet, Escape ile vazgeç.</span>
      {saveFailed ? (
        <span
          id={errorId}
          role="alert"
          className="absolute left-0 right-0 top-full z-10 mt-1 rounded-[2px] border border-[#6a3b20] bg-[#f2dfc3] px-2 py-1 text-xs text-[#6a3727]"
        >
          Raf adı kaydedilemedi. Taslağın korunuyor.
        </span>
      ) : null}
    </label>
  );
};
