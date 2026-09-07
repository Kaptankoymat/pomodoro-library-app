import { describe, expect, it } from "vitest";
import {
  getFocusElapsedSeconds,
  getFocusCompletionTimestamp,
  getFocusRemainingSeconds,
  pauseFocusSession,
  startOrResumeFocusSession,
} from "@/lib/focusSession";

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
});
