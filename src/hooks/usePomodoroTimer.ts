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
  onComplete: (sessionId: string) => void;
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
      setNow((currentNow) => Math.max(currentNow + 1, Date.now()));
    };
    const intervalId = window.setInterval(refreshNow, 250);
    document.addEventListener("visibilitychange", refreshNow);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshNow);
    };
  }, [isRunning, session?.id]);

  const remainingSeconds = getFocusRemainingSeconds(session, durationSeconds, now);

  useEffect(() => {
    if (!session || !isRunning || remainingSeconds > 0) {
      return;
    }

    if (completionRequestedRef.current === session.id) {
      return;
    }

    completionRequestedRef.current = session.id;
    completeRef.current(session.id);
  }, [isRunning, remainingSeconds, session]);

  useEffect(() => {
    if (!session || session.id !== completionRequestedRef.current) {
      completionRequestedRef.current = null;
    }
  }, [session]);

  return {
    remainingSeconds,
    isRunning,
  };
};
