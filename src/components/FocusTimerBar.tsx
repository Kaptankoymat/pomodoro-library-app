"use client";

import {
  BookOpen,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { DAILY_XP_LIMIT } from "@/lib/libraryProgression";
import type { BookItem, FocusRewardSummary } from "@/types/library";

type FocusTimerBarProps = {
  dailyXp: number;
  isRunning: boolean;
  isSelectingBook: boolean;
  rewardSummary: FocusRewardSummary | null;
  selectedBook: BookItem | null;
  timerText: string;
  onClearReward: () => void;
  onClearTarget: () => void;
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

export const FocusTimerBar = ({
  dailyXp,
  isRunning,
  isSelectingBook,
  rewardSummary,
  selectedBook,
  timerText,
  onClearReward,
  onClearTarget,
  onFinish,
  onPause,
  onRequestBookSelection,
  onReset,
  onStart,
}: FocusTimerBarProps) => {
  const dailyProgress = Math.round(
    (Math.min(Math.max(dailyXp, 0), DAILY_XP_LIMIT) / DAILY_XP_LIMIT) * 100,
  );
  const rewardMessage = getRewardMessage(rewardSummary);

  return (
    <section
      aria-label="Odak sayaci"
      className="fixed left-1/2 top-2 z-50 flex w-[min(680px,calc(100vw-1.5rem))] -translate-x-1/2 flex-col gap-3 rounded-lg border-x-2 border-t-2 border-b-[4px] border-[#25150a] bg-[#3b2312] p-3 shadow-[0_12px_24px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.1)] sm:top-[112px] sm:flex-row sm:items-center"
      style={{ backgroundImage: 'url(/lofi_shelf_wood.png)', backgroundSize: '100% 100%', backgroundBlendMode: 'luminosity' }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 bg-[#2a170a]/40 p-2 rounded-md border border-[#25150a]/50 shadow-[inset_0_2px_6px_rgba(0,0,0,0.4)]">
        {/* Retro LED Clock Display */}
        <div className="flex h-14 w-28 shrink-0 items-center justify-center rounded-[4px] border-[2px] border-[#140c08] bg-[#0c0704] px-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)]">
          <span className="font-mono text-3xl font-black tracking-widest text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">
            {timerText}
          </span>
        </div>

        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <div className="flex min-w-0 items-center gap-2">
            <BookOpen aria-hidden className="h-4 w-4 shrink-0 text-[#e6cdb3]" />
            <span className="truncate text-sm font-bold uppercase tracking-wider text-[#e6cdb3] drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
              {selectedBook ? selectedBook.title : "Yeni kitap kazan"}
            </span>
            {selectedBook ? (
              <button
                aria-label="Odak hedefini temizle"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] text-[#e6cdb3]/60 transition hover:bg-[#5c3826] hover:text-[#e6cdb3] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                type="button"
                onClick={onClearTarget}
              >
                <X aria-hidden className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#140c08] border border-[#25150a] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]">
            <div
              className="h-full rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] transition-all duration-500 ease-out"
              style={{ width: `${dailyProgress}%` }}
            />
          </div>
          <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-[#a67b5b]">
            {isSelectingBook
              ? "Kitapliktan bir kitap sec."
              : `${dailyXp}/${DAILY_XP_LIMIT} gunluk XP`}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
        {/* Play/Pause Button */}
        <button
          aria-label={isRunning ? "Duraklat" : "Baslat"}
          className="flex h-11 w-11 items-center justify-center rounded-[4px] border-b-[3px] border-[#925f2b] bg-[#c28442] text-[#2a170a] shadow-[0_4px_6px_rgba(0,0,0,0.3)] transition-all hover:bg-[#d99b59] hover:brightness-110 active:translate-y-[3px] active:border-b-0 active:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          type="button"
          onClick={isRunning ? onPause : onStart}
        >
          {isRunning ? (
            <Pause aria-hidden className="h-6 w-6 fill-current" />
          ) : (
            <Play aria-hidden className="h-6 w-6 fill-current ml-1" />
          )}
        </button>
        
        {/* Reset Button */}
        <button
          aria-label="Sifirla"
          className="flex h-11 w-11 items-center justify-center rounded-[4px] border border-[#25150a] border-b-[3px] bg-[#5c3826] text-[#e6cdb3] shadow-[0_4px_6px_rgba(0,0,0,0.3)] transition-all hover:bg-[#6b4226] hover:brightness-110 active:translate-y-[2px] active:border-b border-[#25150a] active:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          type="button"
          onClick={onReset}
        >
          <RotateCcw aria-hidden className="h-5 w-5" />
        </button>
        
        {/* Finish Button */}
        <button
          className="flex h-11 items-center gap-2 rounded-[4px] border border-[#25150a] border-b-[3px] bg-[#5c3826] px-3 text-sm font-bold uppercase tracking-wider text-[#10b981] shadow-[0_4px_6px_rgba(0,0,0,0.3)] transition-all hover:bg-[#6b4226] hover:brightness-110 active:translate-y-[2px] active:border-b border-[#25150a] active:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          type="button"
          onClick={onFinish}
        >
          <Sparkles aria-hidden className="h-4 w-4" />
          Bitir
        </button>

        {/* Select Book Button */}
        <button
          aria-pressed={isSelectingBook}
          className={`flex h-11 items-center gap-2 rounded-[4px] border border-[#25150a] border-b-[3px] px-3 text-sm font-bold uppercase tracking-wider text-[#e6cdb3] shadow-[0_4px_6px_rgba(0,0,0,0.3)] transition-all hover:brightness-110 active:translate-y-[2px] active:border-b border-[#25150a] active:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
            isSelectingBook ? "bg-[#7a4a24] translate-y-[2px] border-b border-[#25150a] shadow-none" : "bg-[#5c3826] hover:bg-[#6b4226]"
          }`}
          type="button"
          onClick={onRequestBookSelection}
        >
          <BookOpen aria-hidden className="h-4 w-4" />
          Kitap sec
        </button>
      </div>

      {rewardMessage ? (
        <button
          aria-label="Odak odulunu kapat"
          className="absolute left-0 right-0 top-[calc(100%+8px)] rounded-md border-2 border-[#25150a] bg-[#3b2312] px-4 py-3 text-left text-sm font-bold tracking-wider text-[#e6cdb3] shadow-[0_8px_16px_rgba(0,0,0,0.6)] transition hover:bg-[#4a2e1b]"
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
  );
};
