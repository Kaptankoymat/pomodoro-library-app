"use client";

import { useEffect, useRef, useState } from "react";
import { LibraryDialog } from "@/components/LibraryDialog";
import { Archive, BookOpen, ChevronRight, Trash2, X } from "lucide-react";
import type { ArchivedBook, LibraryShelf } from "@/types/library";
import { libraryTheme } from "@/lib/libraryTheme";

type ShelfManagerDialogProps = {
  activeShelfId: string;
  archivedBooks: ArchivedBook[];
  shelves: LibraryShelf[];
  onClose: () => void;
  onDeleteShelf: (shelfId: string) => void;
  onRestoreBook: (bookId: string) => void;
  onSelectShelf: (shelfId: string) => void;
};

export const ShelfManagerDialog = ({
  activeShelfId,
  archivedBooks,
  shelves,
  onClose,
  onDeleteShelf,
  onRestoreBook,
  onSelectShelf,
}: ShelfManagerDialogProps) => {
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(null);
  const pendingShelf = shelves.find((shelf) => shelf.id === pendingDeletionId) ?? null;
  const cancelDeletionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (pendingDeletionId) {
      cancelDeletionRef.current?.focus();
    }
  }, [pendingDeletionId]);

  return (
    <LibraryDialog
      aria-labelledby="shelf-manager-title"
      className="fixed inset-0 z-[75] flex items-end bg-[#140f0b]/76 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5"
      onClose={pendingShelf ? () => setPendingDeletionId(null) : onClose}
    >
      <section
        className={`flex max-h-[min(760px,calc(100dvh-1.5rem))] w-full max-w-2xl flex-col overflow-hidden rounded-md border shadow-2xl shadow-black/45 ${libraryTheme.current.panel}`}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#bba88c] px-4 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8a6040]">
              <Archive aria-hidden className="h-4 w-4" />
              Raf düzeni
            </div>
            <h2 id="shelf-manager-title" className="mt-1 text-2xl font-bold text-[#2f251b]">
              Raflar ve Depo
            </h2>
            <p className="mt-1 text-sm text-[#6e5c47]">
              Raflar arasında geç, kullanılmayan rafları kaldır ve kitapları depoda sakla.
            </p>
          </div>
          <button
            aria-label="Raf yönetimini kapat"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] ${libraryTheme.current.secondaryButton} ${libraryTheme.current.focusRing}`}
            type="button"
            onClick={onClose}
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
          <section aria-labelledby="shelf-list-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 id="shelf-list-title" className="font-bold text-[#2f251b]">Raflar</h3>
                <p className="text-sm text-[#6e5c47]">Bir rafa geçmek için satırına tıkla.</p>
              </div>
              <span className="rounded-full bg-[#d2c0a1] px-2.5 py-1 text-xs font-semibold text-[#4a3b2c]">
                {shelves.length} raf
              </span>
            </div>

            <div className="space-y-2">
              {shelves.map((shelf, index) => {
                const isActive = shelf.id === activeShelfId;
                const canDelete = shelves.length > 1;

                return (
                  <div
                    key={shelf.id}
                    className={`flex items-center gap-2 rounded-md border p-2 transition ${
                      isActive
                        ? "border-[#8a6040] bg-[#efe3d0]"
                        : "border-[#d7c6ad] bg-[#fffaf1]/75 hover:border-[#b08a65]"
                    }`}
                  >
                    <button
                      aria-current={isActive ? "true" : undefined}
                      className="min-w-0 flex flex-1 items-center gap-3 rounded-[3px] px-2 py-2 text-left"
                      type="button"
                      onClick={() => {
                        onSelectShelf(shelf.id);
                        onClose();
                      }}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] bg-[#8a6040] text-sm font-bold text-amber-50">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-[#2f251b]">{shelf.title}</span>
                        <span className="mt-0.5 block text-xs text-[#6e5c47]">
                          {isActive ? "Şu an bu raftasın" : "Rafa geç"}
                        </span>
                      </span>
                      <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-[#8a6040]" />
                    </button>
                    <button
                      aria-label={`${shelf.title} rafını sil`}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] border border-[#c88b73] text-[#a3482d] transition hover:bg-[#f9e1d8] disabled:cursor-not-allowed disabled:border-[#d7c6ad] disabled:text-[#b6a894]"
                      disabled={!canDelete}
                      title={canDelete ? "Rafı sil" : "Son raf silinemez"}
                      type="button"
                      onClick={() => setPendingDeletionId(shelf.id)}
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {pendingShelf ? (
              <div className="mt-3 rounded-md border border-[#d69b87] bg-[#f9e1d8] p-3 text-sm text-[#6a3727]" role="alert">
                <p>
                  <strong>{pendingShelf.title}</strong> silinsin mi? İçindeki kitaplar Depo’ya taşınır;
                  saat ve dekor öğeleri kaldırılır.
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    ref={cancelDeletionRef}
                    className={`h-9 rounded-[4px] px-3 text-sm font-semibold ${libraryTheme.current.secondaryButton} ${libraryTheme.current.focusRing}`}
                    type="button"
                    onClick={() => setPendingDeletionId(null)}
                  >
                    Vazgeç
                  </button>
                  <button
                    className="h-9 rounded-[4px] bg-[#a3482d] px-3 text-sm font-semibold text-white transition hover:bg-[#883a24] disabled:opacity-50"
                    disabled={shelves.length <= 1}
                    type="button"
                    onClick={() => {
                      onDeleteShelf(pendingShelf.id);
                      setPendingDeletionId(null);
                    }}
                  >
                    Rafı sil
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section aria-labelledby="archive-title" className="border-t border-[#d7c6ad] pt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 id="archive-title" className="font-bold text-[#2f251b]">Kitap Deposu</h3>
                <p className="text-sm text-[#6e5c47]">Depodaki kitaplar silinmez; istediğin zaman aktif rafa döner.</p>
              </div>
              <span className="rounded-full bg-[#d2c0a1] px-2.5 py-1 text-xs font-semibold text-[#4a3b2c]">
                {archivedBooks.length} kitap
              </span>
            </div>

            {archivedBooks.length ? (
              <div className="space-y-2">
                {archivedBooks.map((book) => (
                  <div
                    key={book.id}
                    className="flex items-center gap-3 rounded-md border border-[#d7c6ad] bg-[#fffaf1]/75 p-3"
                  >
                    <span className="flex h-9 w-7 shrink-0 items-center justify-center rounded-[2px] bg-[#6f3f22] text-amber-50">
                      <BookOpen aria-hidden className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-[#2f251b]">{book.title}</span>
                      <span className="block text-xs text-[#6e5c47]">Lv {book.level} · {book.xp} XP</span>
                    </span>
                    <button
                      className={`h-9 shrink-0 rounded-[4px] px-3 text-sm font-semibold ${libraryTheme.current.primaryButton} ${libraryTheme.current.focusRing}`}
                      type="button"
                      onClick={() => onRestoreBook(book.id)}
                    >
                      Aktif rafa al
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-[#c7b49a] bg-[#fffaf1]/60 px-4 py-6 text-center text-sm text-[#6e5c47]">
                Depoda kitap yok. Bir kitabı açıp “Kaydet ve Depoya Kaldır” seçeneğini kullanabilirsin.
              </div>
            )}
          </section>
        </div>
      </section>
    </LibraryDialog>
  );
};
