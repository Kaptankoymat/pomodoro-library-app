import { describe, expect, it } from "vitest";
import {
  completeNaturalFocusSession,
  endFocusSessionEarly,
} from "@/lib/focusCompletion";
import { getInitialLibraryState } from "@/lib/libraryInventory";

describe("focus completion", () => {
  it("rewards a naturally completed session only once", () => {
    const state = {
      ...getInitialLibraryState(),
      activeFocusSession: {
        id: "focus-1",
        targetBookId: "book-1",
        startedAt: 1_000,
        durationSeconds: 1500,
        status: "running" as const,
        accumulatedSeconds: 0,
        resumedAt: 1_000,
      },
    };
    const first = completeNaturalFocusSession({
      completedAt: 1_501_000,
      random: () => 0.99,
      sessionId: "focus-1",
      state,
    });
    const second = completeNaturalFocusSession({
      completedAt: 1_501_000,
      random: () => 0.99,
      sessionId: "focus-1",
      state: first.state,
    });

    expect(first.state.focusSessions).toHaveLength(1);
    expect(first.state.dailyFocus.xp).toBe(25);
    expect(second.state).toBe(first.state);
    expect(second.summary).toBeNull();
  });

  it("records real elapsed time without reward when ended early", () => {
    const state = {
      ...getInitialLibraryState(),
      activeFocusSession: {
        id: "focus-early",
        targetBookId: "book-1",
        startedAt: 1_000,
        durationSeconds: 1500,
        status: "running" as const,
        accumulatedSeconds: 0,
        resumedAt: 1_000,
      },
    };
    const result = endFocusSessionEarly(state, 301_000);

    expect(result.focusSessions?.[0]).toMatchObject({
      id: "focus-early",
      durationSeconds: 300,
      awardedXp: 0,
      completion: "ended-early",
    });
    expect(result.dailyFocus.xp).toBe(0);
  });

  it("does nothing when no session was started", () => {
    const state = getInitialLibraryState();
    expect(endFocusSessionEarly(state, Date.now())).toBe(state);
  });

  it("updates the last study date when the daily XP limit is full", () => {
    const completedAt = new Date(2026, 8, 7, 20).getTime();
    const state = {
      ...getInitialLibraryState(),
      dailyFocus: { dateKey: "2026-09-07", xp: 200 },
      activeFocusSession: {
        id: "focus-capped",
        targetBookId: "book-1",
        startedAt: completedAt - 1_500_000,
        durationSeconds: 1500,
        status: "running" as const,
        accumulatedSeconds: 0,
        resumedAt: completedAt - 1_500_000,
      },
    };
    const result = completeNaturalFocusSession({
      completedAt,
      random: () => 0.99,
      sessionId: "focus-capped",
      state,
    });
    const book = result.state.items.find((item) => item.id === "book-1");

    expect(book && "lastStudiedAt" in book ? book.lastStudiedAt : undefined).toBe(
      completedAt,
    );
    expect(result.state.dailyFocus.xp).toBe(200);
  });

  it("records the real finish boundary when a completed timer is reopened later", () => {
    const resumedAt = new Date(2026, 8, 6, 23, 50).getTime();
    const expectedCompletion = new Date(2026, 8, 7, 0, 5).getTime();
    const reopenedAt = new Date(2026, 8, 7, 8).getTime();
    const state = {
      ...getInitialLibraryState(),
      dailyFocus: { dateKey: "2026-09-06", xp: 175 },
      activeFocusSession: {
        id: "focus-reopened",
        targetBookId: "book-1",
        startedAt: resumedAt,
        durationSeconds: 900,
        status: "running" as const,
        accumulatedSeconds: 0,
        resumedAt,
      },
    };

    const result = completeNaturalFocusSession({
      completedAt: reopenedAt,
      random: () => 0.99,
      sessionId: "focus-reopened",
      state,
    });

    expect(result.state.focusSessions?.[0].completedAt).toBe(expectedCompletion);
    expect(result.state.dailyFocus).toEqual({ dateKey: "2026-09-07", xp: 25 });
  });
});
