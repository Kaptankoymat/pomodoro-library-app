"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Archive, BookOpen, Clock, Save, Timer, X } from "lucide-react";
import { LibraryDialog } from "@/components/LibraryDialog";
import {
  formatFocusDuration,
  formatRelativeStudyDate,
  type BookStudyStats,
} from "@/lib/libraryStats";
import { libraryTheme } from "@/lib/libraryTheme";
import { getXpIntoLevel, XP_PER_LEVEL } from "@/lib/libraryProgression";

export type EditableBook = {
  id: string;
  title: string;
  note?: string;
  level: number;
  xp: number;
  noteUpdatedAt?: number;
  lastStudiedAt?: number;
};

type BookNoteDialogProps = {
  book: EditableBook;
  stats: BookStudyStats;
  recoveryActions?: ReactNode;
  onClose: () => void;
  onArchive: (bookId: string, data: { title: string; note: string }) => Promise<boolean>;
  onSave: (bookId: string, data: { title: string; note: string }) => Promise<boolean>;
};

export const BookNoteDialog = ({
  book,
  stats,
  recoveryActions,
  onClose,
  onArchive,
  onSave,
}: BookNoteDialogProps) => {
  const titleInputId = useId();
  const noteInputId = useId();
  const [openedFields] = useState({ title: book.title, note: book.note ?? "" });
  const [draftTitle, setDraftTitle] = useState(book.title);
  const [draftNote, setDraftNote] = useState(book.note ?? "");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [pendingAction, setPendingAction] = useState<"save" | "archive" | null>(null);
  const [saveError, setSaveError] = useState("");
  const cancelDiscardRef = useRef<HTMLButtonElement>(null);
  const discardTriggerRef = useRef<HTMLElement | null>(null);
  const saveErrorRef = useRef<HTMLParagraphElement>(null);
  const actionInFlightRef = useRef(false);
  const isDirty = draftTitle !== openedFields.title || draftNote !== openedFields.note;
  const bookXp = getXpIntoLevel(book.xp);

  const requestClose = () => {
    if (actionInFlightRef.current) return;
    if (isDirty) {
      if (!confirmDiscard) {
        discardTriggerRef.current = document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      }
      setConfirmDiscard(true);
    } else {
      onClose();
    }
  };

  const cancelDiscard = () => {
    setConfirmDiscard(false);
    discardTriggerRef.current?.focus();
  };

  const saveDraft = async (action: "save" | "archive") => {
    if (actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    setPendingAction(action);
    setSaveError("");
    try {
      const saved = await (action === "archive" ? onArchive : onSave)(book.id, {
        title: draftTitle.trim() || "İsimsiz kitap",
        note: draftNote,
      });
      if (!saved) {
        setSaveError("Kaydedilemedi. Notların burada korunuyor; yeniden deneyebilirsin.");
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Not kaydedilemedi. Yeniden deneyebilirsin.");
    } finally {
      actionInFlightRef.current = false;
      setPendingAction(null);
    }
  };

  useEffect(() => {
    if (!isDirty) return;
    const preventUnsavedNavigation = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", preventUnsavedNavigation);
    return () => window.removeEventListener("beforeunload", preventUnsavedNavigation);
  }, [isDirty]);

  useEffect(() => {
    if (confirmDiscard) cancelDiscardRef.current?.focus();
  }, [confirmDiscard]);

  useEffect(() => {
    if (saveError) saveErrorRef.current?.focus();
  }, [saveError]);

  const noteUpdatedText = book.noteUpdatedAt
    ? formatRelativeStudyDate(book.noteUpdatedAt)
    : "Not henüz kaydedilmedi";

  return (
    <LibraryDialog
      aria-label={`${book.title} çalışma defteri`}
      className="fixed inset-0 z-[80] overflow-y-auto bg-[#140f0b]/88 px-3 py-3 backdrop-blur-md sm:px-5 sm:py-5"
      onClose={confirmDiscard ? cancelDiscard : requestClose}
    >
      <form
        className={`mx-auto grid min-h-[calc(100dvh-1.5rem)] w-full max-w-6xl grid-rows-[auto_1fr_auto] rounded-md border shadow-2xl shadow-black/45 sm:min-h-[calc(100dvh-2.5rem)] ${libraryTheme.current.panel}`}
        aria-busy={pendingAction !== null}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            void saveDraft("save");
          }
        }}
        onSubmit={(event) => {
          event.preventDefault();
          void saveDraft("save");
        }}
      >
        <header className="flex flex-col gap-4 border-b border-[#bba88c] px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8a6040]">
              <BookOpen aria-hidden className="h-4 w-4" />
              Çalışma defteri
            </div>
            <label className="block" htmlFor={titleInputId}>
              <span className="sr-only">Kitap adı</span>
              <input
                id={titleInputId}
                className="w-full border-0 bg-transparent p-0 text-3xl font-bold leading-tight text-[#2f251b] outline-none placeholder:text-[#8b7965] sm:text-5xl"
                maxLength={64}
                disabled={pendingAction !== null}
                placeholder="Kitap adı"
                type="text"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
              />
            </label>
            <p className="mt-2 text-sm text-[#6e5c47]">
              Konu, proje veya okuma notlarını burada tut.
            </p>
          </div>

          <button
            aria-label="Kapat"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] ${libraryTheme.current.secondaryButton} ${libraryTheme.current.focusRing}`}
            title="Kapat"
            type="button"
            disabled={pendingAction !== null}
            onClick={requestClose}
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </header>

        <main className="grid min-w-0 gap-5 px-4 py-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6">
          <aside className="grid min-w-0 content-start gap-3">
            <div className="rounded-md border border-[#bba88c] bg-[#efe3d0] p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[#6e5c47]">Seviye</span>
                <span className="font-bold text-[#2f251b]">Lv {book.level}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#d2c0a1]">
                <div
                  className="h-full rounded-full bg-[#8a6040]"
                  style={{ width: `${(bookXp / XP_PER_LEVEL) * 100}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-[#6e5c47]">{bookXp}/{XP_PER_LEVEL} XP</div>
            </div>

            <div className="grid gap-2 rounded-md border border-[#bba88c] bg-[#efe3d0] p-4 text-sm text-[#4a3b2c]">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <Timer aria-hidden className="h-4 w-4 text-[#8a6040]" />
                  Tamamlanan seans
                </span>
                <strong>{stats.totalSessions}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <Clock aria-hidden className="h-4 w-4 text-[#8a6040]" />
                  Odak
                </span>
                <strong>{formatFocusDuration(stats.totalFocusSeconds)}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Toplam XP</span>
                <strong>{stats.totalAwardedXp}</strong>
              </div>
            </div>

            <div className="rounded-md border border-[#bba88c] bg-[#efe3d0] p-4 text-sm text-[#6e5c47]">
              <div className="font-semibold text-[#2f251b]">Son çalışma</div>
              <div className="mt-1">
                {formatRelativeStudyDate(stats.lastStudiedAt ?? book.lastStudiedAt)}
              </div>
              <div className="mt-3 font-semibold text-[#2f251b]">Not durumu</div>
              <div className="mt-1">{noteUpdatedText}</div>
            </div>
          </aside>

          <label className="grid min-h-[46dvh] min-w-0 gap-2 lg:min-h-0" htmlFor={noteInputId}>
            <span className="text-sm font-semibold text-[#6e5c47]">Ana not</span>
            <textarea
              id={noteInputId}
              className="min-h-[52dvh] w-full min-w-0 resize-none rounded-md border border-[#bba88c] bg-[#fffaf1] px-4 py-4 text-base leading-8 text-[#2f251b] outline-none transition placeholder:text-[#9c8975] focus:border-[#8a6040] lg:min-h-full"
              disabled={pendingAction !== null}
              placeholder="Bu kitap veya proje için çalışma notlarını yaz..."
              value={draftNote}
              onChange={(event) => setDraftNote(event.target.value)}
            />
          </label>
        </main>

        <footer className="border-t border-[#bba88c] px-4 py-4 sm:px-6">
          {recoveryActions}
          {saveError ? (
            <p ref={saveErrorRef} role="alert" tabIndex={-1} className="mb-3 break-words rounded-md border border-[#d69b87] bg-[#f9e1d8] p-3 text-sm text-[#6a3727]">{saveError}</p>
          ) : null}
          {confirmDiscard ? (
            <div role="alert" className="mb-3 rounded-md border border-[#d69b87] bg-[#f9e1d8] p-3 text-sm text-[#6a3727]">
              <p>Kaydedilmemiş değişikliklerin var. Kaydetmeden kapatmak istiyor musun?</p>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button
                  ref={cancelDiscardRef}
                  className={`min-h-10 rounded-[4px] px-3 font-semibold ${libraryTheme.current.secondaryButton} ${libraryTheme.current.focusRing}`}
                  disabled={pendingAction !== null}
                  type="button"
                  onClick={cancelDiscard}
                >
                  Düzenlemeye devam et
                </button>
                <button
                  className={`min-h-10 rounded-[4px] bg-[#a3482d] px-3 font-semibold text-white hover:bg-[#883a24] ${libraryTheme.current.focusRing}`}
                  disabled={pendingAction !== null}
                  type="button"
                  onClick={onClose}
                >
                  Kaydetmeden kapat
                </button>
              </div>
            </div>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className={`flex h-11 items-center justify-center gap-2 rounded-[4px] px-4 text-sm font-semibold ${libraryTheme.current.secondaryButton} ${libraryTheme.current.focusRing}`}
            type="button"
            disabled={pendingAction !== null}
            onClick={requestClose}
          >
            <X aria-hidden className="h-4 w-4" />
            Vazgeç
          </button>
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-[4px] border border-[#9b704d] bg-[#efe3d0] px-4 text-sm font-semibold text-[#5a3b25] transition hover:bg-[#e5d2b3]"
            type="button"
            disabled={pendingAction !== null}
            onClick={() => void saveDraft("archive")}
          >
            <Archive aria-hidden className="h-4 w-4" />
            {pendingAction === "archive" ? "Kaydediliyor…" : "Kaydet ve Depoya Kaldır"}
          </button>
          <button
            className={`flex h-11 items-center justify-center gap-2 rounded-[4px] px-4 text-sm font-semibold ${libraryTheme.current.primaryButton} ${libraryTheme.current.focusRing}`}
            type="submit"
            disabled={pendingAction !== null}
          >
            <Save aria-hidden className="h-4 w-4" />
            {pendingAction === "save" ? "Kaydediliyor…" : "Kaydet"}
          </button>
          </div>
        </footer>
      </form>
    </LibraryDialog>
  );
};
