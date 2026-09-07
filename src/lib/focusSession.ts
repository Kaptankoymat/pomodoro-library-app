import type { ActiveFocusSession } from "@/types/library";

export type NormalizedFocusSession = ActiveFocusSession & {
  status: "running" | "paused";
  accumulatedSeconds: number;
};

const clampElapsed = (seconds: number, durationSeconds: number): number =>
  Math.min(durationSeconds, Math.max(0, seconds));

const isValidTimestamp = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 8_640_000_000_000_000;

export const normalizeFocusSession = (
  session: ActiveFocusSession,
): NormalizedFocusSession => {
  const isCurrentFormat =
    (session.status === "running" || session.status === "paused") &&
    typeof session.accumulatedSeconds === "number" &&
    Number.isFinite(session.accumulatedSeconds) &&
    Number.isFinite(session.durationSeconds) &&
    session.durationSeconds > 0 &&
    isValidTimestamp(session.startedAt) &&
    (session.status !== "running" || isValidTimestamp(session.resumedAt));

  if (!isCurrentFormat || session.needsRestart) {
    if (
      isCurrentFormat &&
      session.status === "paused" &&
      session.accumulatedSeconds === 0 &&
      session.resumedAt === undefined
    ) {
      return session as NormalizedFocusSession;
    }

    return {
      ...session,
      startedAt: isValidTimestamp(session.startedAt) ? session.startedAt : 0,
      durationSeconds:
        Number.isFinite(session.durationSeconds) && session.durationSeconds > 0
          ? session.durationSeconds
          : 25 * 60,
      status: "paused",
      accumulatedSeconds: 0,
      resumedAt: undefined,
      pausedAt: session.pausedAt,
      needsRestart: true,
    };
  }

  const accumulatedSeconds = clampElapsed(
    session.accumulatedSeconds ?? 0,
    session.durationSeconds,
  );
  if (accumulatedSeconds === session.accumulatedSeconds) {
    return session as NormalizedFocusSession;
  }

  return {
    ...session,
    status: session.status!,
    accumulatedSeconds,
  };
};

export const getFocusElapsedSeconds = (
  session: ActiveFocusSession | null | undefined,
  now = Date.now(),
): number => {
  if (!session) {
    return 0;
  }

  const normalized = normalizeFocusSession(session);
  const runningSeconds =
    normalized.status === "running" &&
    typeof normalized.resumedAt === "number" &&
    isValidTimestamp(now)
      ? Math.max(0, (now - normalized.resumedAt) / 1000)
      : 0;

  return clampElapsed(
    normalized.accumulatedSeconds + runningSeconds,
    normalized.durationSeconds,
  );
};

export const getFocusCompletionTimestamp = (
  session: ActiveFocusSession,
): number | null => {
  const normalized = normalizeFocusSession(session);
  if (
    normalized.needsRestart ||
    normalized.status !== "running" ||
    typeof normalized.resumedAt !== "number"
  ) {
    return null;
  }

  const remainingSeconds = Math.max(
    0,
    normalized.durationSeconds - normalized.accumulatedSeconds,
  );
  const completedAt = normalized.resumedAt + remainingSeconds * 1_000;
  return isValidTimestamp(completedAt) ? completedAt : null;
};

export const getFocusRemainingSeconds = (
  session: ActiveFocusSession | null | undefined,
  defaultDurationSeconds: number,
  now = Date.now(),
): number => {
  if (!session) {
    return Number.isFinite(defaultDurationSeconds)
      ? Math.max(0, Math.ceil(defaultDurationSeconds))
      : 25 * 60;
  }

  const normalized = normalizeFocusSession(session);
  return Math.max(
    0,
    Math.ceil(normalized.durationSeconds - getFocusElapsedSeconds(normalized, now)),
  );
};

export const startOrResumeFocusSession = (params: {
  current: ActiveFocusSession | null | undefined;
  durationSeconds: number;
  id: string;
  now: number;
  targetBookId: string | null;
}): NormalizedFocusSession => {
  const current = params.current ? normalizeFocusSession(params.current) : null;

  if (current && !current.needsRestart) {
    if (current.status === "running") {
      return current;
    }

    return normalizeFocusSession({
      ...current,
      status: "running",
      resumedAt: params.now,
      pausedAt: undefined,
      targetBookId: params.targetBookId,
    });
  }

  return normalizeFocusSession({
    id: params.id,
    targetBookId: params.targetBookId,
    startedAt: params.now,
    durationSeconds: params.durationSeconds,
    status: "running",
    accumulatedSeconds: 0,
    resumedAt: params.now,
    pausedAt: undefined,
    needsRestart: false,
  });
};

export const pauseFocusSession = (
  session: ActiveFocusSession,
  now = Date.now(),
): NormalizedFocusSession => {
  const normalized = normalizeFocusSession(session);

  if (normalized.status === "paused") {
    return normalized;
  }

  const accumulatedSeconds = getFocusElapsedSeconds(normalized, now);
  // A click at the finish boundary must not prevent the timer from awarding completion.
  if (accumulatedSeconds >= normalized.durationSeconds) {
    return normalized;
  }

  return {
    ...normalized,
    status: "paused",
    accumulatedSeconds,
    resumedAt: undefined,
    pausedAt: now,
  };
};
