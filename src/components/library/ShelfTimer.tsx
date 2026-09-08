"use client";

import { useId, useRef, useState, type MouseEvent } from "react";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import type { CostumeDefinition } from "@/lib/libraryCostumeDefinitions";
import type { LibraryItem } from "@/types/library";

type ShelfTimerProps = {
  item: LibraryItem;
  costume: CostumeDefinition;
  timerText: string;
  isRunning: boolean;
  targetTitle: string | null;
  onOpen: () => void;
  onToggle: () => Promise<boolean>;
  isEditing?: boolean;
};

/** The shelf's single clock: its outer scene wrapper owns placement and dragging. */
export function ShelfTimer({
  item,
  costume,
  timerText,
  isRunning,
  targetTitle,
  onOpen,
  onToggle,
  isEditing = false,
}: ShelfTimerProps) {
  const timeId = useId();
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const open = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onOpen();
  };
  const readout = (
    <>
      <span id={timeId} className="library-focus-time">
        {timerText}
      </span>
      <span className="shelf-timer-caption">
        {isRunning ? "ODAKLANIYORSUN" : "SENİN ZAMANIN"}
      </span>
    </>
  );

  return (
    <span
      className={`shelf-timer-device ${costume.className} ${costume.frameClassName ?? ""}`}
      data-running={isRunning}
      data-editing={isEditing}
    >
      {costume.pngSrc ? (
        <span
          className="shelf-timer-costume"
          aria-hidden
          style={{
            backgroundImage: `url("${costume.pngSrc}")`,
            imageRendering: costume.pixelated ? "pixelated" : undefined,
          }}
        />
      ) : null}
      <span
        className="shelf-timer-filigree shelf-timer-filigree--left"
        aria-hidden
      >
        ❧
      </span>
      <span
        className="shelf-timer-filigree shelf-timer-filigree--right"
        aria-hidden
      >
        ❧
      </span>
      <span className="shelf-timer-corner shelf-timer-corner--tl" aria-hidden />
      <span className="shelf-timer-corner shelf-timer-corner--tr" aria-hidden />
      <span className="shelf-timer-corner shelf-timer-corner--bl" aria-hidden />
      <span className="shelf-timer-corner shelf-timer-corner--br" aria-hidden />
      {isEditing ? (
        <span className="shelf-timer-display">{readout}</span>
      ) : (
        <button
          className="shelf-timer-display"
          type="button"
          aria-label="Odak saatini aç"
          aria-describedby={timeId}
          data-focus-key={`timer-${item.id}-open`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={open}
        >
          {readout}
        </button>
      )}
      <span className={`shelf-timer-details ${costume.contentClassName ?? ""}`}>
        <span className="shelf-timer-label">ODAK ZAMANI</span>
        <strong title={targetTitle ?? undefined}>
          {targetTitle ?? "Yeni bir hikâye"}
        </strong>
        {isEditing ? (
          <span className="shelf-timer-mode">Pomodoro</span>
        ) : (
          <button
            className="shelf-timer-mode"
            type="button"
            data-focus-key={`timer-${item.id}-details`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={open}
          >
            <span aria-hidden className="shelf-timer-status-light" />
            Pomodoro <ArrowUpRight aria-hidden size={12} />
          </button>
        )}
      </span>
      {isEditing ? (
        <span className="shelf-timer-play" aria-hidden>
          <Play size={24} fill="currentColor" />
        </span>
      ) : (
        <button
          className="shelf-timer-play"
          type="button"
          aria-label={isRunning ? "Odağı duraklat" : "Odağı başlat"}
          data-focus-key={`timer-${item.id}-play`}
          disabled={pending}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={async (event) => {
            event.stopPropagation();
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
            <Pause size={23} fill="currentColor" aria-hidden />
          ) : (
            <Play size={24} fill="currentColor" aria-hidden />
          )}
        </button>
      )}
      {error ? (
        <span className="shelf-timer-error" role="alert">
          Saat kaydedilemedi. Yeniden deneyebilirsin.
        </span>
      ) : null}
    </span>
  );
}
