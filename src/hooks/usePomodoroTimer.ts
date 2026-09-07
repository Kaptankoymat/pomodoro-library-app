"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UsePomodoroTimerParams = {
  durationSeconds: number;
  onComplete: () => void;
};

export const usePomodoroTimer = ({
  durationSeconds,
  onComplete,
}: UsePomodoroTimerParams) => {
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const completeRef = useRef(onComplete);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((currentSeconds) => {
        const nextSeconds = Math.max(0, currentSeconds - 1);

        if (nextSeconds === 0) {
          window.clearInterval(intervalId);
          window.setTimeout(() => {
            setIsRunning(false);
            completeRef.current();
          }, 0);
        }

        return nextSeconds;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isRunning]);

  const start = useCallback(() => {
    setRemainingSeconds((currentSeconds) =>
      currentSeconds === 0 ? durationSeconds : currentSeconds,
    );
    setIsRunning(true);
  }, [durationSeconds]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setRemainingSeconds(durationSeconds);
  }, [durationSeconds]);

  const completeNow = useCallback(() => {
    setIsRunning(false);
    setRemainingSeconds(durationSeconds);
    completeRef.current();
  }, [durationSeconds]);

  return {
    remainingSeconds,
    isRunning,
    start,
    pause,
    reset,
    completeNow,
  };
};
