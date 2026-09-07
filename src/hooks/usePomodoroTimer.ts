"use client";

import { useEffect, useRef, useState } from "react";
import {
  getFocusRemainingSeconds,
  normalizeFocusSession,
} from "@/lib/focusSession";
import type { ActiveFocusSession } from "@/types/library";

type UsePomodoroTimerParams = {
  durationSeconds: number;
  session: ActiveFocusSession | null | undefined;
  onComplete: (sessionId: string) => void | boolean | Promise<void | boolean>;
};

export const usePomodoroTimer = ({
  durationSeconds,
  session,
  onComplete,
}: UsePomodoroTimerParams) => {
  const [now, setNow] = useState(() => Date.now());
  const completeRef = useRef(onComplete);
  const completionRequestedRef = useRef<string | null>(null);
  const normalizedSession = session ? normalizeFocusSession(session) : null;
  const isRunning = normalizedSession?.status === "running";

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const refreshNow = () => {
      const nextNow = Date.now();
      setNow((currentNow) =>
        getFocusRemainingSeconds(session, durationSeconds, currentNow) ===
        getFocusRemainingSeconds(session, durationSeconds, nextNow)
          ? currentNow
          : nextNow,
      );
    };
    const intervalId = window.setInterval(refreshNow, 250);
    document.addEventListener("visibilitychange", refreshNow);
    window.addEventListener("focus", refreshNow);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshNow);
      window.removeEventListener("focus", refreshNow);
    };
  }, [durationSeconds, isRunning, session]);

  const remainingSeconds = getFocusRemainingSeconds(session, durationSeconds, now);
  const sessionId = session?.id;

  useEffect(() => {
    if (!sessionId || !isRunning || remainingSeconds > 0) {
      return;
    }

    if (completionRequestedRef.current === sessionId) {
      return;
    }

    let cancelled = false;
    let retryTimeoutId: number | undefined;
    const requestCompletion = async () => {
      completionRequestedRef.current = sessionId;
      try {
        const completed = await completeRef.current(sessionId);
        if (completed !== false) {
          return;
        }
      } catch {
        // Persistence reports the error; retry without losing the completed session.
      }

      if (!cancelled) {
        retryTimeoutId = window.setTimeout(() => void requestCompletion(), 1_000);
      }
    };
    void requestCompletion();

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimeoutId);
      if (completionRequestedRef.current === sessionId) {
        completionRequestedRef.current = null;
      }
    };
  }, [isRunning, remainingSeconds, sessionId]);

  return {
    remainingSeconds,
    isRunning,
  };
};
