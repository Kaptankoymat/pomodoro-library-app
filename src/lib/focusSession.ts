import type { ActiveFocusSession } from "@/types/library";

export type NormalizedFocusSession = ActiveFocusSession & {
  status: "running" | "paused";
  accumulatedSeconds: number;
};

const clampElapsed = (seconds: number, durationSeconds: number): number =>
  Math.min(durationSeconds, Math.max(0, seconds));

export const normalizeFocusSession = (
  session: ActiveFocusSession,
): NormalizedFocusSession => {
  const isCurrentFormat =
    (session.status === "running" || session.status === "paused") &&
    typeof session.accumulatedSeconds === "number";

  if (!isCurrentFormat) {
    return {
      ...session,
      status: "paused",
      accumulatedSeconds: 0,
      resumedAt: undefined,
      pausedAt: session.pausedAt,
      needsRestart: true,
    };
  }

  return {
    ...session,
    status: session.status!,
    accumulatedSeconds: clampElapsed(
      session.accumulatedSeconds ?? 0,
      session.durationSeconds,
    ),
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
    normalized.status === "running" && typeof normalized.resumedAt === "number"
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
  return normalized.resumedAt + remainingSeconds * 1_000;
};

export const getFocusRemainingSeconds = (
  session: ActiveFocusSession | null | undefined,
  defaultDurationSeconds: number,
  now = Date.now(),
): number => {
  if (!session) {
    return defaultDurationSeconds;
  }

  return Math.max(
    0,
    Math.ceil(session.durationSeconds - getFocusElapsedSeconds(session, now)),
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

    return {
      ...current,
      status: "running",
      resumedAt: params.now,
      pausedAt: undefined,
      targetBookId: params.targetBookId,
    };
  }

  return {
    id: params.id,
    targetBookId: params.targetBookId,
    startedAt: params.now,
    durationSeconds: params.durationSeconds,
    status: "running",
    accumulatedSeconds: 0,
    resumedAt: params.now,
    pausedAt: undefined,
    needsRestart: false,
  };
};

export const pauseFocusSession = (
  session: ActiveFocusSession,
  now = Date.now(),
): NormalizedFocusSession => {
  const normalized = normalizeFocusSession(session);

  if (normalized.status === "paused") {
    return normalized;
  }

  return {
    ...normalized,
    status: "paused",
    accumulatedSeconds: getFocusElapsedSeconds(normalized, now),
    resumedAt: undefined,
    pausedAt: now,
  };
};
