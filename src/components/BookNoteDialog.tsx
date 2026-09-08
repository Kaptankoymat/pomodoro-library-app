"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Archive, BookOpen, Clock, Save, Timer, X } from "lucide-react";
import { LibraryDialog } from "@/components/LibraryDialog";
import {
  formatFocusDuration,
  formatRelativeStudyDate,
  type BookStudyStats,
} from "@/lib/libraryStats";
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
      className="library-dialog--notebook"
      onClose={confirmDiscard ? cancelDiscard : requestClose}
    >
      <form
        className="library-panel library-dialog-panel library-notebook"
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
        <header className="library-dialog-header">
          <div className="library-dialog-heading">
            <div className="library-eyebrow">
              <BookOpen aria-hidden className="h-4 w-4" />
              Çalışma defteri
            </div>
            <label className="library-notebook-title-label" htmlFor={titleInputId}>
              <span className="sr-only">Kitap adı</span>
              <input
                id={titleInputId}
                className="library-notebook-title"
                maxLength={64}
                disabled={pendingAction !== null}
                placeholder="Kitap adı"
                type="text"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
              />
            </label>
            <p className="library-dialog-description">
              Konu, proje veya okuma notlarını burada tut.
            </p>
          </div>
          <button
            aria-label="Kapat"
            className="library-button library-button--quiet library-dialog-close"
            title="Kapat"
            type="button"
            disabled={pendingAction !== null}
            onClick={requestClose}
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </header>

        <main className="library-notebook-body">
          <aside className="library-notebook-stats">
            <div className="library-dialog-inset library-notebook-level">
              <BookOpen aria-hidden className="library-notebook-emblem" />
              <div className="library-stat-row">
                <span>Seviye</span>
                <strong>Lv {book.level}</strong>
              </div>
              <div className="library-meter" aria-hidden="true">
                <div className="library-meter-fill" style={{ width: `${(bookXp / XP_PER_LEVEL) * 100}%` }} />
              </div>
              <p className="library-stat-caption">{bookXp}/{XP_PER_LEVEL} XP</p>
            </div>

            <div className="library-dialog-inset library-notebook-summary">
              <div className="library-stat-row">
                <span><Timer aria-hidden className="h-4 w-4" />Tamamlanan seans</span>
                <strong>{stats.totalSessions}</strong>
              </div>
              <div className="library-stat-row">
                <span><Clock aria-hidden className="h-4 w-4" />Odak</span>
                <strong>{formatFocusDuration(stats.totalFocusSeconds)}</strong>
              </div>
              <div className="library-stat-row">
                <span>Toplam XP</span>
                <strong>{stats.totalAwardedXp}</strong>
              </div>
            </div>

            <div className="library-dialog-inset library-notebook-history">
              <p className="library-stat-label">Son çalışma</p>
              <p>{formatRelativeStudyDate(stats.lastStudiedAt ?? book.lastStudiedAt)}</p>
              <p className="library-stat-label">Not durumu</p>
              <p>{noteUpdatedText}</p>
            </div>
          </aside>

          <label className="library-notebook-page" htmlFor={noteInputId}>
            <span className="library-field-label">Ana not</span>
            <textarea
              id={noteInputId}
              className="library-notebook-editor"
              disabled={pendingAction !== null}
              placeholder="Bu kitap veya proje için çalışma notlarını yaz..."
              value={draftNote}
              onChange={(event) => setDraftNote(event.target.value)}
            />
          </label>
        </main>

        <footer className="library-dialog-footer">
          {recoveryActions}
          {saveError ? (
            <p ref={saveErrorRef} role="alert" tabIndex={-1} className="library-dialog-alert library-dialog-alert--danger">{saveError}</p>
          ) : null}
          {confirmDiscard ? (
            <div role="alert" className="library-dialog-alert library-dialog-alert--danger">
              <p>Kaydedilmemiş değişikliklerin var. Kaydetmeden kapatmak istiyor musun?</p>
              <div className="library-dialog-actions">
                <button
                  ref={cancelDiscardRef}
                  className="library-button library-button--quiet"
                  disabled={pendingAction !== null}
                  type="button"
                  onClick={cancelDiscard}
                >
                  Düzenlemeye devam et
                </button>
                <button
                  className="library-button library-dialog-danger-button"
                  disabled={pendingAction !== null}
                  type="button"
                  onClick={onClose}
                >
                  Kaydetmeden kapat
                </button>
              </div>
            </div>
          ) : null}
          <div className="library-dialog-actions library-notebook-actions">
            <button
              className="library-button library-button--quiet"
              type="button"
              disabled={pendingAction !== null}
              onClick={requestClose}
            >
              <X aria-hidden className="h-4 w-4" />Vazgeç
            </button>
            <button
              className="library-button library-button--quiet"
              type="button"
              disabled={pendingAction !== null}
              onClick={() => void saveDraft("archive")}
            >
              <Archive aria-hidden className="h-4 w-4" />
              {pendingAction === "archive" ? "Kaydediliyor…" : "Kaydet ve Depoya Kaldır"}
            </button>
            <button
              className="library-button library-button--primary"
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
