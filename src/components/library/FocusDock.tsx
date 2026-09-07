"use client";

import { useId, useRef, useState } from "react";
import { ArrowUpRight, Pause, Play, Sparkles } from "lucide-react";

type FocusDockProps = {
  timerText: string;
  isRunning: boolean;
  targetTitle: string | null;
  completedSessions: number;
  dailyXp: number;
  onOpen: () => void;
  onToggle: () => Promise<boolean>;
};

export function FocusDock({
  timerText,
  isRunning,
  targetTitle,
  completedSessions,
  dailyXp,
  onOpen,
  onToggle,
}: FocusDockProps) {
  const timeId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const pendingRef = useRef(false);
  return (
    <section
      className="library-focus-dock"
      aria-label="Odak alanı"
      data-running={isRunning}
    >
      <div className="library-focus-intro">
        <span className="library-eyebrow">BİR AN KENDİNE</span>
        <p>
          Küçük adımlar.
          <br />
          <em>Büyük hikâyeler.</em>
        </p>
      </div>
      <div className="library-focus-console">
        <span className="library-console-ornament" aria-hidden="true">
          ✦
        </span>
        <button
          className="library-focus-display"
          onClick={onOpen}
          aria-label="Odak saatini aç"
          aria-describedby={timeId}
          type="button"
        >
          <span id={timeId} className="library-focus-time">
            {timerText}
          </span>
          <span className="library-focus-caption">
            {isRunning ? "ODAKLANIYORSUN" : "SENİN ZAMANIN"}
          </span>
        </button>
        <div className="library-focus-details">
          <span className="library-eyebrow">ODAK OTURUMU</span>
          <strong>{targetTitle ?? "Yeni bir hikâye"}</strong>
          <button
            className="library-text-button"
            type="button"
            onClick={onOpen}
          >
            Pomodoro <ArrowUpRight aria-hidden size={13} />
          </button>
        </div>
        <button
          type="button"
          className="library-play-button"
          aria-label={isRunning ? "Odağı duraklat" : "Odağı başlat"}
          disabled={pending}
          onClick={async () => {
            if (pendingRef.current) return;
            pendingRef.current = true;
            setPending(true);
            setError(false);
            try {
              setError(!(await onToggle()));
            } catch {
              setError(true);
            } finally {
              pendingRef.current = false;
              setPending(false);
            }
          }}
        >
          {isRunning ? (
            <Pause aria-hidden size={22} fill="currentColor" />
          ) : (
            <Play aria-hidden size={23} fill="currentColor" />
          )}
        </button>
        {error ? (
          <span className="library-focus-error" role="alert">
            Saat kaydedilemedi. Yeniden deneyebilirsin.
          </span>
        ) : null}
      </div>
      <div className="library-focus-progress">
        <Sparkles aria-hidden size={19} />
        <strong>
          {dailyXp}
          <small> XP bugün</small>
        </strong>
        <span>{completedSessions} tamamlanan oturum</span>
      </div>
    </section>
  );
}
