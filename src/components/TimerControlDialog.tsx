"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { LibraryDialog } from "@/components/LibraryDialog";
import {
  BookOpen,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { DAILY_XP_LIMIT, XP_PER_LEVEL, getXpIntoLevel } from "@/lib/libraryProgression";
import type { BookItem, FocusRewardSummary } from "@/types/library";

type TimerControlDialogProps = {
  canFinish: boolean;
  dailyXp: number;
  isRunning: boolean;
  isSelectingBook: boolean;
  rewardSummary: FocusRewardSummary | null;
  recoveryMessage?: string;
  errorMessage?: string;
  recoveryActions?: ReactNode;
  selectedBook: BookItem | null;
  timerText: string;
  onClearReward: () => void;
  onClearTarget: () => Promise<boolean>;
  onClose: () => void;
  onFinish: () => Promise<boolean>;
  onPause: () => Promise<boolean>;
  onRequestBookSelection: () => void;
  onReset: () => Promise<boolean>;
  onStart: () => Promise<boolean>;
};

const getRewardMessage = (rewardSummary: FocusRewardSummary | null): string | null => {
  if (!rewardSummary) {
    return null;
  }

  return [
    rewardSummary.awardedXp > 0 ? `+${rewardSummary.awardedXp} XP` : null,
    rewardSummary.leveledUpItemTitle
      ? `${rewardSummary.leveledUpItemTitle} seviye atladı`
      : null,
    rewardSummary.addedBookTitle
      ? `${rewardSummary.addedBookTitle} rafa düştü`
      : null,
    rewardSummary.droppedCostumeName
      ? `${rewardSummary.droppedCostumeName} kostümü açıldı`
      : null,
    rewardSummary.capped
      ? rewardSummary.awardedXp > 0
        ? "Günlük limit tamamlandı"
        : "Günlük XP limiti doldu"
      : null,
  ]
    .filter(Boolean)
    .join(" - ");
};

export const TimerControlDialog = ({
  canFinish,
  dailyXp,
  isRunning,
  isSelectingBook,
  rewardSummary,
  recoveryMessage,
  errorMessage,
  recoveryActions,
  selectedBook,
  timerText,
  onClearReward,
  onClearTarget,
  onClose,
  onFinish,
  onPause,
  onRequestBookSelection,
  onReset,
  onStart,
}: TimerControlDialogProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const actionInFlightRef = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const visibleError = actionError || errorMessage;

  const saveChange = async (action: () => Promise<boolean>) => {
    if (actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    setIsSaving(true);
    setActionError("");
    try {
      if (!await action()) {
        setActionError("Saatteki değişiklik kaydedilemedi. Yeniden deneyebilirsin.");
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Saatteki değişiklik kaydedilemedi. Yeniden deneyebilirsin.");
    } finally {
      actionInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (visibleError) errorRef.current?.focus();
  }, [visibleError]);

  const dailyProgress = Math.round(
    (Math.min(Math.max(dailyXp, 0), DAILY_XP_LIMIT) / DAILY_XP_LIMIT) * 100,
  );
  const selectedBookXp = selectedBook ? getXpIntoLevel(selectedBook.xp) : 0;
  const selectedBookProgress = selectedBook
    ? Math.round((selectedBookXp / XP_PER_LEVEL) * 100)
    : 0;
  const rewardMessage = getRewardMessage(rewardSummary);
  const [minutes = "25", seconds = "00"] = timerText.split(":");

  return (
    <LibraryDialog
      aria-label="Odak saati"
      className="library-dialog--timer"
      dismissOnBackdrop
      onClose={onClose}
    >
      <section aria-busy={isSaving} className="library-panel library-dialog-panel library-timer-panel">
        <header className="library-dialog-header">
          <div className="library-dialog-heading">
            <p className="library-eyebrow">Odak saati</p>
            <h2 className="library-dialog-title">
              {selectedBook ? selectedBook.title : "Yeni kitap kazan"}
            </h2>
          </div>
          <button
            aria-label="Kapat"
            className="library-button library-button--quiet library-dialog-close"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </header>

        <div className="library-dialog-body library-timer-body">
          {recoveryMessage ? <p role="status" className="library-dialog-alert">{recoveryMessage}</p> : null}
          {recoveryActions}
          {visibleError ? (
            <p ref={errorRef} role="alert" tabIndex={-1} className="library-dialog-alert library-dialog-alert--danger">
              {visibleError}
            </p>
          ) : null}

          <div className="library-timer-face" data-running={isRunning}>
            <span className="library-timer-ornament" aria-hidden="true">✦</span>
            <p className="library-timer-phase">{isRunning ? "Odak zamanı" : canFinish ? "Odak duraklatıldı" : "Bir sayfa daha"}</p>
            <div
              aria-label={`Kalan süre: ${minutes} dakika ${seconds} saniye`}
              role="timer"
              className="library-timer-digits"
            >
              <span aria-hidden="true">{minutes}<span className="library-timer-colon">:</span>{seconds}</span>
            </div>
            <p className="library-timer-caption">Pomodoro · 25 dakika</p>
          </div>

          <div className="library-timer-controls">
            <button
              aria-label="Sıfırla"
              disabled={isSaving}
              className="library-button library-button--quiet library-timer-small-control"
              type="button"
              onClick={() => void saveChange(onReset)}
            >
              <RotateCcw aria-hidden className="h-5 w-5" />
            </button>
            <button
              aria-label={isRunning ? "Duraklat" : "Başlat"}
              disabled={isSaving}
              className="library-button library-timer-play"
              type="button"
              onClick={() => void saveChange(isRunning ? onPause : onStart)}
            >
              {isRunning ? <Pause aria-hidden className="h-7 w-7 fill-current" /> : <Play aria-hidden className="ml-1 h-7 w-7 fill-current" />}
            </button>
            <button
              className="library-button library-button--quiet library-timer-finish"
              disabled={!canFinish || isSaving}
              type="button"
              onClick={() => void saveChange(onFinish)}
            >
              <Sparkles aria-hidden className="h-4 w-4" />Bitir
            </button>
          </div>

          <div className="library-dialog-inset library-timer-progress">
            <div className="library-stat-row">
              <span>{isSelectingBook ? "Kütüphaneden bir kitap seçiliyor" : "Günlük XP"}</span>
              <strong>{dailyXp}/{DAILY_XP_LIMIT}</strong>
            </div>
            <div className="library-meter" aria-hidden="true">
              <div className="library-meter-fill library-meter-fill--emerald" style={{ width: `${dailyProgress}%` }} />
            </div>
            {selectedBook ? (
              <div className="library-timer-book-progress">
                <div className="library-stat-row">
                  <span className="library-timer-book-title">Lv {selectedBook.level} · {selectedBook.title}</span>
                  <strong>{selectedBookXp}/{XP_PER_LEVEL} XP</strong>
                </div>
                <div className="library-meter" aria-hidden="true">
                  <div className="library-meter-fill" style={{ width: `${selectedBookProgress}%` }} />
                </div>
              </div>
            ) : null}
          </div>

          <button
            aria-pressed={isSelectingBook}
            disabled={isSaving}
            className="library-button library-button--quiet library-timer-select"
            type="button"
            onClick={onRequestBookSelection}
          >
            <BookOpen aria-hidden className="h-4 w-4" />Kitap seç
          </button>
          {selectedBook ? (
            <button
              className="library-button library-button--quiet library-timer-select"
              type="button"
              disabled={isSaving}
              onClick={() => void saveChange(onClearTarget)}
            >
              Yeni kitap kazan
            </button>
          ) : null}

          {rewardMessage ? (
            <button
              aria-label="Odak ödülünü kapat"
              className="library-button library-timer-reward"
              type="button"
              onClick={onClearReward}
            >
              <span role="status"><Sparkles aria-hidden className="h-5 w-5" />{rewardMessage}</span>
            </button>
          ) : null}
        </div>
      </section>
    </LibraryDialog>
  );
};
