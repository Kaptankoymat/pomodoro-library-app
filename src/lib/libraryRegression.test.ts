import { describe, expect, it } from "vitest";
import { createItemWithCostume } from "@/lib/costumeApplication";
import {
  getCostumeDefinition,
  getResolvedCostume,
  normalizeItemsForCostumes,
  normalizeWardrobeState,
} from "@/lib/libraryCostumeDefinitions";
import { resolveLibraryShelfDrop } from "@/lib/libraryDrop";
import { getInitialLibraryState } from "@/lib/libraryInventory";
import { normalizeLibraryStateForRuntime } from "@/lib/libraryStateMigration";
import { formatRelativeStudyDate, getBookStudyStats } from "@/lib/libraryStats";
import { isBookItem, type BookItem } from "@/types/library";

describe("reported regressions", () => {
  it("keeps an explicit Classic costume under an Arcane type default", () => {
    const initial = getInitialLibraryState();
    const wardrobe = normalizeWardrobeState({
      ...initial.wardrobe!,
      defaultCostumeByKind: {
        ...initial.wardrobe!.defaultCostumeByKind,
        book: "book:arcane",
      },
      unlockedCostumeIds: [
        ...initial.wardrobe!.unlockedCostumeIds,
        "book:arcane",
      ],
    });
    const book = initial.items.find((item) => item.id === "book-1")!;
    const classic = getCostumeDefinition("book:classic")!;
    const explicitClassic = createItemWithCostume(book, classic, wardrobe);
    const normalized = normalizeItemsForCostumes([explicitClassic], wardrobe);

    expect(getResolvedCostume(normalized.items[0], wardrobe).id).toBe("book:classic");
  });

  it("keeps a side item unchanged after an invalid shelf drop", () => {
    const state = getInitialLibraryState();
    const shelf = state.shelves[0];
    const sticky = state.items.find((item) => item.id === "sticky")!;
    const resolution = resolveLibraryShelfDrop({
      itemId: sticky.id,
      items: state.items,
      metrics: { columnCount: 28, rowCount: 4 },
      position: { row: 99, col: 99 },
      shelf,
    });

    expect(resolution.type).toBe("snap-back");
    expect(sticky).toMatchObject({ placement: "left-column", sideSlot: 6 });
  });

  it("adds exactly one persistent timer to a legacy timerless shelf", () => {
    const state = getInitialLibraryState();
    const timerless = {
      ...state,
      schemaVersion: 5,
      items: state.items.filter((item) => item.kind !== "timer"),
    };
    const once = normalizeLibraryStateForRuntime(timerless, 1_000);
    const twice = normalizeLibraryStateForRuntime(once, 2_000);

    expect(once.items.filter((item) => item.kind === "timer")).toHaveLength(1);
    expect(twice.items.filter((item) => item.kind === "timer")).toHaveLength(1);
  });

  it("repairs duplicate shelf timers without losing earned progress or costume", () => {
    const state = getInitialLibraryState();
    const timer = state.items.find((item) => item.kind === "timer")!;
    const duplicate = {
      ...timer,
      id: "duplicate-timer",
      xp: 80,
      level: 3,
      costumeId: "timer:arcane" as const,
    };
    const repaired = normalizeLibraryStateForRuntime(
      { ...state, items: [...state.items, duplicate] },
      1_000,
    );
    const timers = repaired.items.filter((item) => item.kind === "timer");

    expect(timers).toHaveLength(1);
    expect(timers[0]).toMatchObject({
      xp: 80,
      level: 3,
      costumeId: "timer:arcane",
    });
  });

  it("uses the latest session date and local calendar days", () => {
    const state = getInitialLibraryState();
    const book = state.items.find(
      (item): item is BookItem => item.id === "book-1" && isBookItem(item),
    )!;
    const older = new Date(2026, 8, 6, 20).getTime();
    const newer = new Date(2026, 8, 7, 0, 5).getTime();
    const stats = getBookStudyStats(
      { ...book, lastStudiedAt: older },
      [
        {
          id: "session-new",
          targetBookId: book.id,
          startedAt: newer - 1500_000,
          completedAt: newer,
          durationSeconds: 1500,
          awardedXp: 0,
        },
      ],
    );

    expect(stats.lastStudiedAt).toBe(newer);
    expect(
      formatRelativeStudyDate(
        new Date(2026, 8, 6, 23, 55).getTime(),
        new Date(2026, 8, 7, 0, 5).getTime(),
      ),
    ).toBe("Dün");
  });
});
