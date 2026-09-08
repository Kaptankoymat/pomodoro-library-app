"use client";
import { useRef, useState, type ReactNode } from "react";
import { Check, Feather, Plus, X } from "lucide-react";
import { LibraryDialog } from "@/components/LibraryDialog";
import type { LibraryTask } from "@/types/library";

type TaskModalProps = {
  tasks: LibraryTask[];
  onAddTask: (title: string) => Promise<boolean>;
  onClose: () => void;
  onToggleTask: (taskId: string) => void;
  recoveryActions?: ReactNode;
};

export const TaskModal = ({
  tasks,
  onAddTask,
  onClose,
  onToggleTask,
  recoveryActions,
}: TaskModalProps) => {
  const [draftTask, setDraftTask] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const completed = tasks.filter((task) => task.done).length;

  return (
    <LibraryDialog
      aria-labelledby="task-dialog-title"
      onClose={onClose}
      dismissOnBackdrop
    >
      <section className="library-dialog-panel library-task-panel">
        <header className="library-dialog-header">
          <div>
            <span className="library-eyebrow">
              <Feather aria-hidden size={14} /> BUGÜNÜN SAYFASI
            </span>
            <h2 className="library-dialog-title" id="task-dialog-title">
              Görevler
            </h2>
            <p className="library-dialog-description">
              Zihnini boşalt. Bir sonraki küçük adımı yaz.
            </p>
          </div>
          <button
            aria-label="Kapat"
            className="library-button library-button--icon library-dialog-close"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden size={20} />
          </button>
        </header>
        <div className="library-task-summary">
          <span>{tasks.length - completed} görev seni bekliyor</span>
          <span>{completed} tamamlandı</span>
        </div>
        <div className="library-dialog-body library-task-body">
          <form
            className="library-task-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const title = draftTask.trim();
              if (!title || savingRef.current) return;
              savingRef.current = true;
              setIsSaving(true);
              setSaveError(null);
              try {
                if (await onAddTask(title)) setDraftTask("");
                else
                  setSaveError(
                    "Görev kaydedilemedi. Taslağın korunuyor; tekrar deneyebilirsin.",
                  );
              } catch {
                setSaveError(
                  "Görev kaydedilemedi. Taslağın korunuyor; tekrar deneyebilirsin.",
                );
              } finally {
                savingRef.current = false;
                setIsSaving(false);
              }
            }}
          >
            <input
              autoFocus
              aria-label="Yeni görev"
              className="library-field"
              placeholder="Bugün neye odaklanacaksın?"
              maxLength={300}
              disabled={isSaving}
              value={draftTask}
              onChange={(event) => setDraftTask(event.target.value)}
            />
            <button
              aria-label="Görev ekle"
              disabled={isSaving || !draftTask.trim()}
              className="library-button library-button--primary library-button--icon"
              type="submit"
            >
              <Plus aria-hidden size={21} />
            </button>
          </form>
          {recoveryActions}
          {saveError ? (
            <p
              role="alert"
              className="library-dialog-alert library-dialog-alert--danger"
            >
              {saveError}
            </p>
          ) : null}
          {tasks.length === 0 ? (
            <div className="library-dialog-empty">
              <Feather aria-hidden size={32} />
              <p>Boş bir sayfa, yeni bir başlangıç.</p>
              <span>İlk görevini ekleyerek başlayabilirsin.</span>
            </div>
          ) : null}
          <div className="library-task-list">
            {tasks.map((task) => (
              <button
                key={task.id}
                aria-pressed={task.done}
                className="library-task-row"
                type="button"
                onClick={() => onToggleTask(task.id)}
              >
                <span className="library-task-check">
                  {task.done ? <Check aria-hidden size={15} /> : null}
                </span>
                <span>{task.title}</span>
              </button>
            ))}
          </div>
        </div>
        <footer className="library-task-footer">
          BİR GÖREV. BİR ODAK. BİR ADIM DAHA.
        </footer>
      </section>
    </LibraryDialog>
  );
};
