import { describe, expect, it } from "vitest";
import {
  getFocusElapsedSeconds,
  getFocusCompletionTimestamp,
  getFocusRemainingSeconds,
  normalizeFocusSession,
  pauseFocusSession,
  startOrResumeFocusSession,
} from "@/lib/focusSession";
import type { ActiveFocusSession } from "@/types/library";

const runningSession: ActiveFocusSession = {
  id: "focus-test",
  targetBookId: "book-1",
  startedAt: 1_000,
  durationSeconds: 1500,
  status: "running",
  accumulatedSeconds: 0,
  resumedAt: 1_000,
};

describe("focus session timekeeping", () => {
  it("uses wall-clock time and excludes paused time", () => {
    const running = startOrResumeFocusSession({
      current: null,
      durationSeconds: 1500,
      id: "focus-1",
      now: 1_000,
      targetBookId: null,
    });

    const paused = pauseFocusSession(running, 601_000);
    expect(getFocusElapsedSeconds(paused, 901_000)).toBe(600);
    expect(getFocusRemainingSeconds(paused, 1500, 901_000)).toBe(900);

    const resumed = startOrResumeFocusSession({
      current: paused,
      durationSeconds: 1500,
      id: "ignored",
      now: 901_000,
      targetBookId: null,
    });
    expect(getFocusElapsedSeconds(resumed, 1_201_000)).toBe(900);
  });

  it("does not infer elapsed time from a legacy active session", () => {
    const restarted = startOrResumeFocusSession({
      current: {
        id: "legacy",
        targetBookId: null,
        startedAt: 1,
        durationSeconds: 1500,
      },
      durationSeconds: 1500,
      id: "focus-new",
      now: 50_000,
      targetBookId: null,
    });

    expect(restarted.id).toBe("focus-new");
    expect(restarted.accumulatedSeconds).toBe(0);
  });

  it("never creates negative elapsed time when the wall clock moves backward", () => {
    const running = startOrResumeFocusSession({
      current: null,
      durationSeconds: 1500,
      id: "focus-clock",
      now: 10_000,
      targetBookId: null,
    });

    expect(getFocusElapsedSeconds(running, 5_000)).toBe(0);
    expect(getFocusRemainingSeconds(running, 1500, 5_000)).toBe(1500);
    expect(getFocusCompletionTimestamp(running)).toBe(1_510_000);
  });

  it.each([
    { accumulatedSeconds: Number.NaN },
    { accumulatedSeconds: Number.POSITIVE_INFINITY },
    { resumedAt: undefined },
    { resumedAt: Number.NaN },
    { startedAt: Number.POSITIVE_INFINITY },
    { durationSeconds: 0 },
    { durationSeconds: -1 },
    { durationSeconds: Number.NaN },
    { durationSeconds: Number.POSITIVE_INFINITY },
    { needsRestart: true },
  ])("safely pauses invalid timing data: %j", (invalidFields) => {
    const invalidSession = { ...runningSession, ...invalidFields };
    const normalized = normalizeFocusSession(invalidSession);

    expect(normalized).toMatchObject({
      status: "paused",
      accumulatedSeconds: 0,
      resumedAt: undefined,
      needsRestart: true,
    });
    expect(getFocusRemainingSeconds(invalidSession, 1500, 2_000_000)).toBe(1500);
    expect(getFocusCompletionTimestamp(invalidSession)).toBeNull();
    expect(normalizeFocusSession(normalized)).toBe(normalized);
  });

  it("leaves a finished timer running so a pause click cannot suppress completion", () => {
    const result = pauseFocusSession(runningSession, 1_501_000);

    expect(result.status).toBe("running");
    expect(getFocusRemainingSeconds(result, 1500, 1_501_000)).toBe(0);
    expect(getFocusCompletionTimestamp(result)).toBe(1_501_000);
  });

  it("preserves normalized session references and fractional active time", () => {
    expect(normalizeFocusSession(runningSession)).toBe(runningSession);
    const paused = pauseFocusSession(runningSession, 1_750);
    const resumed = startOrResumeFocusSession({
      current: paused,
      durationSeconds: 1500,
      id: "ignored",
      now: 10_000,
      targetBookId: "book-1",
    });

    expect(getFocusCompletionTimestamp(resumed)).toBe(1_509_250);
    expect(getFocusRemainingSeconds(resumed, 1500, 10_250)).toBe(1499);
  });

  it("does not leak invalid observation times into elapsed values", () => {
    expect(getFocusElapsedSeconds(runningSession, Number.NaN)).toBe(0);
    expect(getFocusElapsedSeconds(runningSession, Number.POSITIVE_INFINITY)).toBe(0);
  });
});
