"use client";

import { useEffect } from "react";
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
  dailyXp: number;
  isRunning: boolean;
  isSelectingBook: boolean;
  rewardSummary: FocusRewardSummary | null;
  selectedBook: BookItem | null;
  timerText: string;
  onClearReward: () => void;
  onClearTarget: () => void;
  onClose: () => void;
  onFinish: () => void;
  onPause: () => void;
  onRequestBookSelection: () => void;
  onReset: () => void;
  onStart: () => void;
};

const getRewardMessage = (rewardSummary: FocusRewardSummary | null): string | null => {
  if (!rewardSummary) {
    return null;
  }

  return [
    rewardSummary.awardedXp > 0 ? `+${rewardSummary.awardedXp} XP` : null,
    rewardSummary.leveledUpItemTitle
      ? `${rewardSummary.leveledUpItemTitle} level atladi`
      : null,
    rewardSummary.addedBookTitle
      ? `${rewardSummary.addedBookTitle} rafa dustu`
      : null,
    rewardSummary.droppedCostumeName
      ? `${rewardSummary.droppedCostumeName} kostumu acildi`
      : null,
    rewardSummary.capped
      ? rewardSummary.awardedXp > 0
        ? "Gunluk limit tamamlandi"
        : "Gunluk XP limiti doldu"
      : null,
  ]
    .filter(Boolean)
    .join(" - ");
};

export const TimerControlDialog = ({
  dailyXp,
  isRunning,
  isSelectingBook,
  rewardSummary,
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
  const dailyProgress = Math.round(
    (Math.min(Math.max(dailyXp, 0), DAILY_XP_LIMIT) / DAILY_XP_LIMIT) * 100,
  );
  const selectedBookXp = selectedBook ? getXpIntoLevel(selectedBook.xp) : 0;
  const selectedBookProgress = selectedBook
    ? Math.round((selectedBookXp / XP_PER_LEVEL) * 100)
    : 0;
  const rewardMessage = getRewardMessage(rewardSummary);
  const [minutes = "25", seconds = "00"] = timerText.split(":");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f120b]/80 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        aria-label="Odak saati"
        className="relative grid w-full max-w-xl gap-5 rounded-lg border-x-2 border-t-2 border-b-[4px] border-[#6a3b20] bg-[#8a5a35] p-5 shadow-[0_16px_32px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.1)] sm:p-6"
        style={{ backgroundImage: 'url(/lofi_shelf_wood.png)', backgroundSize: '100% 100%', backgroundBlendMode: 'luminosity' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-100/70">
              Odak saati
            </p>
            <h2 className="mt-1.5 truncate text-xl font-bold uppercase tracking-wider text-amber-50 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
              {selectedBook ? selectedBook.title : "Yeni kitap kazan"}
            </h2>
          </div>
          <button
            aria-label="Kapat"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[#6a3b20] border-b-[3px] bg-[#6f3f22] text-amber-50 shadow-[0_4px_6px_rgba(0,0,0,0.3)] transition-all hover:bg-[#83502c] hover:brightness-110 active:translate-y-[2px] active:border-b border-[#6a3b20] active:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>

        {/* Timer Box */}
        <div className="relative overflow-hidden rounded-md border border-[#6a3b20] bg-[#6f3f22]/50 p-3 sm:p-4 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]">
          <div className="relative z-10 flex items-center justify-center gap-3">
            <div className="flex h-24 sm:h-32 w-full flex-1 items-center justify-center rounded-[4px] border-[2px] border-[#140c08] bg-[#0c0704] shadow-[inset_0_2px_12px_rgba(0,0,0,0.9)]">
              <span className="font-mono text-[clamp(4rem,15vw,6rem)] font-black tracking-widest text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]">
                {minutes}
              </span>
            </div>
            <div className="flex h-24 sm:h-32 flex-col items-center justify-center gap-4 px-2">
              <span className="h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
              <span className="h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
            </div>
            <div className="flex h-24 sm:h-32 w-full flex-1 items-center justify-center rounded-[4px] border-[2px] border-[#140c08] bg-[#0c0704] shadow-[inset_0_2px_12px_rgba(0,0,0,0.9)]">
              <span className="font-mono text-[clamp(4rem,15vw,6rem)] font-black tracking-widest text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]">
                {seconds}
              </span>
            </div>
          </div>
        </div>

        {/* XP Section */}
        <div className="grid gap-3 rounded-md border border-[#6a3b20] bg-[#6f3f22]/50 p-4 shadow-[inset_0_2px_6px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between gap-3 text-xs uppercase font-bold tracking-wider">
            <span className="text-amber-100/70">
              {isSelectingBook ? "Kitapliktan bir kitap seciliyor" : "Gunluk XP"}
            </span>
            <span className="text-amber-50">
              {dailyXp}/{DAILY_XP_LIMIT}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#140c08] border border-[#6a3b20] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]">
            <div
              className="h-full rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] transition-all duration-500 ease-out"
              style={{ width: `${dailyProgress}%` }}
            />
          </div>
          {selectedBook ? (
            <div className="grid gap-2 mt-2">
              <div className="flex items-center justify-between gap-3 text-[10px] uppercase font-bold tracking-wider text-amber-100/70">
                <span className="truncate text-amber-50">
                  Lv {selectedBook.level} - {selectedBook.title}
                </span>
                <span>
                  {selectedBookXp}/{XP_PER_LEVEL} XP
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#140c08] border border-[#6a3b20] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]">
                <div
                  className="h-full rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] transition-all duration-500 ease-out"
                  style={{ width: `${selectedBookProgress}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-[auto_auto_1fr] gap-3 sm:grid-cols-[auto_auto_auto_1fr]">
          <button
            aria-label={isRunning ? "Duraklat" : "Baslat"}
            className="flex h-12 w-12 items-center justify-center rounded-[4px] border-b-[3px] border-[#925f2b] bg-[#c28442] text-[#2a170a] shadow-[0_4px_6px_rgba(0,0,0,0.3)] transition-all hover:bg-[#d99b59] hover:brightness-110 active:translate-y-[3px] active:border-b-0 active:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            type="button"
            onClick={isRunning ? onPause : onStart}
          >
            {isRunning ? (
              <Pause aria-hidden className="h-6 w-6 fill-current" />
            ) : (
              <Play aria-hidden className="h-6 w-6 fill-current ml-1" />
            )}
          </button>
          <button
            aria-label="Sifirla"
            className="flex h-12 w-12 items-center justify-center rounded-[4px] border border-[#6a3b20] border-b-[3px] bg-[#6f3f22] text-amber-50 shadow-[0_4px_6px_rgba(0,0,0,0.3)] transition-all hover:bg-[#83502c] hover:brightness-110 active:translate-y-[2px] active:border-b border-[#6a3b20] active:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            type="button"
            onClick={onReset}
          >
            <RotateCcw aria-hidden className="h-5 w-5" />
          </button>
          <button
            className="flex h-12 items-center justify-center gap-2 rounded-[4px] border border-[#6a3b20] border-b-[3px] bg-[#6f3f22] px-4 text-sm font-bold uppercase tracking-wider text-[#10b981] shadow-[0_4px_6px_rgba(0,0,0,0.3)] transition-all hover:bg-[#83502c] hover:brightness-110 active:translate-y-[2px] active:border-b border-[#6a3b20] active:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            type="button"
            onClick={onFinish}
          >
            <Sparkles aria-hidden className="h-4 w-4" />
            Bitir
          </button>
          <button
            aria-pressed={isSelectingBook}
            className={`col-span-3 flex h-12 items-center justify-center gap-2 rounded-[4px] border border-[#6a3b20] border-b-[3px] px-4 text-sm font-bold uppercase tracking-wider text-amber-50 shadow-[0_4px_6px_rgba(0,0,0,0.3)] transition-all sm:col-span-1 hover:brightness-110 active:translate-y-[2px] active:border-b border-[#6a3b20] active:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              isSelectingBook ? "bg-[#83502c] translate-y-[2px] border-b border-[#6a3b20] shadow-none" : "bg-[#6f3f22] hover:bg-[#83502c]"
            }`}
            type="button"
            onClick={onRequestBookSelection}
          >
            <BookOpen aria-hidden className="h-4 w-4" />
            Kitap sec
          </button>
        </div>

        {selectedBook ? (
          <button
            className="h-10 rounded-[4px] border border-[#6a3b20] border-b-[3px] bg-[#8a5a35] text-sm font-bold uppercase tracking-wider text-amber-50 shadow-[0_4px_6px_rgba(0,0,0,0.3)] transition-all hover:bg-[#6f3f22] active:translate-y-[2px] active:border-b border-[#6a3b20] active:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            type="button"
            onClick={onClearTarget}
          >
            Yeni kitap kazan
          </button>
        ) : null}

        {rewardMessage ? (
          <button
            aria-label="Odak odulunu kapat"
            className="rounded-md border-2 border-[#6a3b20] bg-[#8a5a35] px-4 py-3 text-left text-sm font-bold tracking-wider text-amber-50 shadow-[0_8px_16px_rgba(0,0,0,0.6)] transition hover:bg-[#6f3f22]"
            type="button"
            onClick={onClearReward}
            style={{ backgroundImage: 'url(/lofi_shelf_wood.png)', backgroundSize: '100% 100%', backgroundBlendMode: 'luminosity' }}
          >
            <div className="flex items-center gap-2">
              <Sparkles aria-hidden className="h-4 w-4 text-amber-400" />
              {rewardMessage}
            </div>
          </button>
        ) : null}
      </section>
    </div>
  );
};
