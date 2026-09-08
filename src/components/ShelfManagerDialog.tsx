"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { LibraryDialog } from "@/components/LibraryDialog";
import { Archive, BookOpen, ChevronRight, Trash2, X } from "lucide-react";
import type { ArchivedBook, LibraryShelf } from "@/types/library";

type ShelfManagerDialogProps = {
  activeShelfId: string;
  archivedBooks: ArchivedBook[];
  shelves: LibraryShelf[];
  recoveryActions?: ReactNode;
  onClose: () => void;
  onDeleteShelf: (shelfId: string) => Promise<boolean>;
  onRestoreBook: (bookId: string) => Promise<boolean>;
  onSelectShelf: (shelfId: string) => Promise<boolean>;
};

export const ShelfManagerDialog = ({
  activeShelfId,
  archivedBooks,
  shelves,
  recoveryActions,
  onClose,
  onDeleteShelf,
  onRestoreBook,
  onSelectShelf,
}: ShelfManagerDialogProps) => {
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const pendingShelf = shelves.find((shelf) => shelf.id === pendingDeletionId) ?? null;
  const cancelDeletionRef = useRef<HTMLButtonElement>(null);
  const deletionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const shelfHeadingRef = useRef<HTMLHeadingElement>(null);
  const archiveHeadingRef = useRef<HTMLHeadingElement>(null);
  const saveErrorRef = useRef<HTMLParagraphElement>(null);
  const actionInFlightRef = useRef(false);

  const cancelDeletion = () => {
    setPendingDeletionId(null);
    deletionTriggerRef.current?.focus();
  };

  const requestClose = () => {
    if (actionInFlightRef.current) return;
    if (pendingShelf) cancelDeletion();
    else onClose();
  };

  const saveChange = async (action: () => Promise<boolean>, onSuccess: () => void) => {
    if (actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    setIsSaving(true);
    setSaveError("");
    try {
      if (await action()) {
        onSuccess();
      } else {
        setSaveError("Değişiklik kaydedilemedi. Yeniden deneyebilirsin.");
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Değişiklik kaydedilemedi. Yeniden deneyebilirsin.");
    } finally {
      actionInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (pendingDeletionId) {
      cancelDeletionRef.current?.focus();
    }
  }, [pendingDeletionId]);

  useEffect(() => {
    if (saveError) saveErrorRef.current?.focus();
  }, [saveError]);

  return (
    <LibraryDialog
      aria-labelledby="shelf-manager-title"
      className="library-dialog--shelves"
      onClose={requestClose}
    >
      <section aria-busy={isSaving} className="library-panel library-dialog-panel library-shelf-manager">
        <header className="library-dialog-header">
          <div className="library-dialog-heading">
            <div className="library-eyebrow"><Archive aria-hidden className="h-4 w-4" />Raf düzeni</div>
            <h2 id="shelf-manager-title" className="library-dialog-title">Raflar ve Depo</h2>
            <p className="library-dialog-description">
              Raflar arasında geç, kullanılmayan rafları kaldır ve kitapları depoda sakla.
            </p>
          </div>
          <button
            aria-label="Raf yönetimini kapat"
            className="library-button library-button--quiet library-dialog-close"
            type="button"
            disabled={isSaving}
            onClick={requestClose}
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </header>

        <div className="library-dialog-body library-shelf-manager-body">
          {recoveryActions}
          {saveError ? (
            <p ref={saveErrorRef} role="alert" tabIndex={-1} className="library-dialog-alert library-dialog-alert--danger">{saveError}</p>
          ) : null}
          <section aria-labelledby="shelf-list-title">
            <div className="library-shelf-section-heading">
              <div>
                <h3 ref={shelfHeadingRef} id="shelf-list-title" tabIndex={-1} className="library-shelf-section-title">Raflar</h3>
                <p className="library-dialog-description">Bir rafa geçmek için satırına tıkla.</p>
              </div>
              <span className="library-count">{shelves.length} raf</span>
            </div>

            <div className="library-shelf-list">
              {shelves.map((shelf, index) => {
                const isActive = shelf.id === activeShelfId;
                const canDelete = shelves.length > 1;

                return (
                  <div key={shelf.id} className="library-shelf-entry" data-active={isActive}>
                    <button
                      aria-current={isActive ? "true" : undefined}
                      className="library-shelf-choice"
                      disabled={isSaving}
                      type="button"
                      onClick={() => {
                        void saveChange(() => onSelectShelf(shelf.id), onClose);
                      }}
                    >
                      <span className="library-shelf-number" aria-hidden="true">{index + 1}</span>
                      <span className="library-shelf-details">
                        <span className="library-shelf-name">{shelf.title}</span>
                        <span className="library-stat-caption">{isActive ? "Şu an bu raftasın" : "Rafa geç"}</span>
                      </span>
                      <ChevronRight aria-hidden className="library-shelf-arrow h-4 w-4" />
                    </button>
                    <button
                      aria-label={`${shelf.title} rafını sil`}
                      className="library-button library-dialog-danger-button library-dialog-close"
                      disabled={!canDelete || isSaving}
                      title={canDelete ? "Rafı sil" : "Son raf silinemez"}
                      type="button"
                      onClick={(event) => {
                        deletionTriggerRef.current = event.currentTarget;
                        setPendingDeletionId(shelf.id);
                      }}
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {pendingShelf ? (
              <div className="library-dialog-alert library-dialog-alert--danger library-shelf-confirmation" role="alert">
                <p>
                  <strong>{pendingShelf.title}</strong> silinsin mi? İçindeki kitaplar Depo’ya taşınır;
                  saat ve dekor öğeleri kaldırılır.
                </p>
                <div className="library-dialog-actions">
                  <button
                    ref={cancelDeletionRef}
                    className="library-button library-button--quiet"
                    disabled={isSaving}
                    type="button"
                    onClick={cancelDeletion}
                  >
                    Vazgeç
                  </button>
                  <button
                    className="library-button library-dialog-danger-button"
                    disabled={shelves.length <= 1 || isSaving}
                    type="button"
                    onClick={() => {
                      void saveChange(() => onDeleteShelf(pendingShelf.id), () => {
                        setPendingDeletionId(null);
                        shelfHeadingRef.current?.focus({ preventScroll: true });
                      });
                    }}
                  >
                    Rafı sil
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section aria-labelledby="archive-title" className="library-archive-section">
            <div className="library-shelf-section-heading">
              <div>
                <h3 ref={archiveHeadingRef} id="archive-title" tabIndex={-1} className="library-shelf-section-title">Kitap Deposu</h3>
                <p className="library-dialog-description">Depodaki kitaplar silinmez; istediğin zaman aktif rafa döner.</p>
              </div>
              <span className="library-count">{archivedBooks.length} kitap</span>
            </div>

            {archivedBooks.length ? (
              <div className="library-shelf-list">
                {archivedBooks.map((book) => (
                  <div key={book.id} className="library-archive-entry">
                    <span className="library-archive-book" aria-hidden="true"><BookOpen className="h-4 w-4" /></span>
                    <span className="library-shelf-details">
                      <span className="library-shelf-name">{book.title}</span>
                      <span className="library-stat-caption">Lv {book.level} · {book.xp} XP</span>
                    </span>
                    <button
                      className="library-button library-button--primary library-archive-restore"
                      disabled={isSaving}
                      type="button"
                      onClick={() => void saveChange(
                        () => onRestoreBook(book.id),
                        () => archiveHeadingRef.current?.focus({ preventScroll: true }),
                      )}
                    >
                      Aktif rafa al
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="library-dialog-empty">
                <Archive aria-hidden className="h-7 w-7" />
                <p>Depoda kitap yok. Bir kitabı açıp “Kaydet ve Depoya Kaldır” seçeneğini kullanabilirsin.</p>
              </div>
            )}
          </section>
        </div>
      </section>
    </LibraryDialog>
  );
};
