"use client";

import { useEffect, useId, useState } from "react";
import { Archive, BookOpen, Clock, Save, Timer, X } from "lucide-react";
import {
  formatFocusDuration,
  formatRelativeStudyDate,
  type BookStudyStats,
} from "@/lib/libraryStats";
import { libraryTheme } from "@/lib/libraryTheme";

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
  onClose: () => void;
  onArchive: (bookId: string, data: { title: string; note: string }) => void;
  onSave: (bookId: string, data: { title: string; note: string }) => void;
};

export const BookNoteDialog = ({
  book,
  stats,
  onClose,
  onArchive,
  onSave,
}: BookNoteDialogProps) => {
  const titleInputId = useId();
  const noteInputId = useId();
  const [draftTitle, setDraftTitle] = useState(book.title);
  const [draftNote, setDraftNote] = useState(book.note ?? "");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const noteUpdatedText = book.noteUpdatedAt
    ? formatRelativeStudyDate(book.noteUpdatedAt)
    : "Not henuz kaydedilmedi";

  return (
    <div
      aria-labelledby={titleInputId}
      aria-modal="true"
      className="fixed inset-0 z-[80] overflow-y-auto bg-[#140f0b]/88 px-3 py-3 backdrop-blur-md sm:px-5 sm:py-5"
      role="dialog"
    >
      <form
        className={`mx-auto grid min-h-[calc(100dvh-1.5rem)] w-full max-w-6xl grid-rows-[auto_1fr_auto] rounded-md border shadow-2xl shadow-black/45 sm:min-h-[calc(100dvh-2.5rem)] ${libraryTheme.current.panel}`}
        onSubmit={(event) => {
          event.preventDefault();
          onSave(book.id, {
            title: draftTitle.trim() || "Untitled Book",
            note: draftNote.trim(),
          });
        }}
      >
        <header className="flex flex-col gap-4 border-b border-[#bba88c] px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8a6040]">
              <BookOpen aria-hidden className="h-4 w-4" />
              Calisma defteri
            </div>
            <label className="block" htmlFor={titleInputId}>
              <span className="sr-only">Kitap adi</span>
              <input
                id={titleInputId}
                className="w-full border-0 bg-transparent p-0 text-3xl font-bold leading-tight text-[#2f251b] outline-none placeholder:text-[#8b7965] sm:text-5xl"
                maxLength={64}
                type="text"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
              />
            </label>
            <p className="mt-2 text-sm text-[#6e5c47]">
              Tek ana not alani. Konu, proje veya okuma izlerini burada tut.
            </p>
          </div>

          <button
            aria-label="Kapat"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] ${libraryTheme.current.secondaryButton} ${libraryTheme.current.focusRing}`}
            title="Kapat"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </header>

        <main className="grid gap-5 px-4 py-5 lg:grid-cols-[280px_1fr] lg:px-6">
          <aside className="grid content-start gap-3">
            <div className="rounded-md border border-[#bba88c] bg-[#efe3d0] p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[#6e5c47]">Level</span>
                <span className="font-bold text-[#2f251b]">Lv {book.level}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#d2c0a1]">
                <div
                  className="h-full rounded-full bg-[#8a6040]"
                  style={{ width: `${book.xp % 100}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-[#6e5c47]">{book.xp % 100}/100 XP</div>
            </div>

            <div className="grid gap-2 rounded-md border border-[#bba88c] bg-[#efe3d0] p-4 text-sm text-[#4a3b2c]">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <Timer aria-hidden className="h-4 w-4 text-[#8a6040]" />
                  Seans
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
              <div className="font-semibold text-[#2f251b]">Son calisma</div>
              <div className="mt-1">
                {formatRelativeStudyDate(stats.lastStudiedAt ?? book.lastStudiedAt)}
              </div>
              <div className="mt-3 font-semibold text-[#2f251b]">Not durumu</div>
              <div className="mt-1">{noteUpdatedText}</div>
            </div>
          </aside>

          <label className="grid min-h-[46dvh] gap-2 lg:min-h-0" htmlFor={noteInputId}>
            <span className="text-sm font-semibold text-[#6e5c47]">Ana not</span>
            <textarea
              id={noteInputId}
              className="min-h-[52dvh] resize-none rounded-md border border-[#bba88c] bg-[#fffaf1] px-4 py-4 text-base leading-8 text-[#2f251b] outline-none transition placeholder:text-[#9c8975] focus:border-[#8a6040] lg:min-h-full"
              placeholder="Bu kitap/proje icin calisma notlarini yaz..."
              value={draftNote}
              onChange={(event) => setDraftNote(event.target.value)}
            />
          </label>
        </main>

        <footer className="flex flex-col-reverse gap-2 border-t border-[#bba88c] px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            className={`flex h-11 items-center justify-center gap-2 rounded-[4px] px-4 text-sm font-semibold ${libraryTheme.current.secondaryButton} ${libraryTheme.current.focusRing}`}
            type="button"
            onClick={onClose}
          >
            <X aria-hidden className="h-4 w-4" />
            Vazgec
          </button>
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-[4px] border border-[#9b704d] bg-[#efe3d0] px-4 text-sm font-semibold text-[#5a3b25] transition hover:bg-[#e5d2b3]"
            type="button"
            onClick={() =>
              onArchive(book.id, {
                title: draftTitle.trim() || "Untitled Book",
                note: draftNote.trim(),
              })
            }
          >
            <Archive aria-hidden className="h-4 w-4" />
            Kaydet ve Depoya Kaldır
          </button>
          <button
            className={`flex h-11 items-center justify-center gap-2 rounded-[4px] px-4 text-sm font-semibold ${libraryTheme.current.primaryButton} ${libraryTheme.current.focusRing}`}
            type="submit"
          >
            <Save aria-hidden className="h-4 w-4" />
            Kaydet
          </button>
        </footer>
      </form>
    </div>
  );
};
