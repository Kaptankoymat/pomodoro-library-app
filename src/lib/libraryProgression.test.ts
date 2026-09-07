import { describe, expect, it } from "vitest";
import { getInitialLibraryState } from "@/lib/libraryInventory";
import { completeFocusSession, getDailyFocusXp } from "@/lib/libraryProgression";

describe("daily focus XP", () => {
  const date = new Date(2026, 8, 7, 20);
  const state = {
    ...getInitialLibraryState(),
    dailyFocus: { dateKey: "2026-09-07", xp: 175 },
    focusSessions: [
      {
        id: "today",
        targetBookId: "book-1",
        startedAt: date.getTime() - 1_500_000,
        completedAt: date.getTime(),
        durationSeconds: 1500,
        awardedXp: 25,
      },
      {
        id: "yesterday",
        targetBookId: "book-1",
        startedAt: new Date(2026, 8, 6, 19, 35).getTime(),
        completedAt: new Date(2026, 8, 6, 20).getTime(),
        durationSeconds: 1500,
        awardedXp: 25,
      },
    ],
  };

  it("preserves legacy daily XP without counting matching history twice", () => {
    expect(getDailyFocusXp(state, date)).toBe(175);
    const result = completeFocusSession(state, "book-1", () => 0.99, date);

    expect(result.summary).toMatchObject({ awardedXp: 25, capped: true });
    expect(result.state.dailyFocus).toEqual({ dateKey: "2026-09-07", xp: 200 });
  });

  it("recovers another local day's XP without including adjacent days", () => {
    expect(getDailyFocusXp(state, new Date(2026, 8, 6, 23, 59))).toBe(25);
    expect(getDailyFocusXp(state, new Date(2026, 8, 8, 0, 1))).toBe(0);
  });

  it("only awards the XP left before the daily limit", () => {
    const result = completeFocusSession(
      { ...state, dailyFocus: { dateKey: "2026-09-07", xp: 190 } },
      "book-1",
      () => 0.99,
      date,
    );

    expect(result.summary).toMatchObject({ awardedXp: 10, capped: true });
    expect(result.state.dailyFocus.xp).toBe(200);
    expect(result.state.items.find((item) => item.id === "book-1")?.xp).toBe(10);
  });
});
