import { describe, expect, it } from "vitest";
import { getInitialLibraryState } from "@/lib/libraryInventory";
import { getBookStudyStats } from "@/lib/libraryStats";
import { isBookItem, type LibraryFocusSessionRecord } from "@/types/library";

describe("book study statistics", () => {
  it("counts completed Pomodoros separately from early finishes while retaining all studied time", () => {
    const book = getInitialLibraryState().items.find(isBookItem)!;
    const sessions: LibraryFocusSessionRecord[] = [
      {
        id: "completed",
        targetBookId: book.id,
        startedAt: 0,
        completedAt: 1_500_000,
        durationSeconds: 1500,
        awardedXp: 25,
        completion: "completed",
      },
      {
        id: "legacy-completed",
        targetBookId: book.id,
        startedAt: 2_000_000,
        completedAt: 3_500_000,
        durationSeconds: 1500,
        awardedXp: 25,
      },
      {
        id: "early",
        targetBookId: book.id,
        startedAt: 4_000_000,
        completedAt: 4_300_000,
        durationSeconds: 300,
        awardedXp: 0,
        completion: "ended-early",
      },
      {
        id: "other-book",
        targetBookId: "another-book",
        startedAt: 5_000_000,
        completedAt: 6_500_000,
        durationSeconds: 1500,
        awardedXp: 25,
        completion: "completed",
      },
    ];

    expect(getBookStudyStats(book, sessions)).toEqual({
      totalSessions: 2,
      totalFocusSeconds: 3300,
      totalAwardedXp: 50,
      lastStudiedAt: 4_300_000,
    });
  });
});
