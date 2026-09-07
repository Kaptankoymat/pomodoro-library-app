import { describe, expect, it } from "vitest";
import {
  createItemWithCostume,
  validateDefaultCostumeApplication,
  validateItemCostumeApplication,
} from "@/lib/costumeApplication";
import { validateGridLayout } from "@/lib/gridLogic";
import { parseLibraryBackup, readLibraryState } from "@/lib/libraryBackup";
import { getCostumeDefinition, normalizeWardrobeState } from "@/lib/libraryCostumeDefinitions";
import { resolveLibraryShelfDrop } from "@/lib/libraryDrop";
import { createBookItem, getInitialLibraryState } from "@/lib/libraryInventory";
import { normalizeLibraryStateForRuntime } from "@/lib/libraryStateMigration";
import { isShelfPlacedItem, resolveSideColumnDrop } from "@/lib/sideColumnLogic";
import { type LibraryState, type LibraryTask } from "@/types/library";

const metrics = { columnCount: 28, rowCount: 4 };
const tasks: LibraryTask[] = Array.from({ length: 7 }, (_, index) => ({
  id: `task-${index}`, title: `Task ${index}`, done: false, createdAt: 1,
}));

const expectValidShelves = (state: LibraryState) => {
  expect(new Set(state.items.map((item) => item.id)).size).toBe(state.items.length);
  for (const shelf of state.shelves) {
    const items = state.items.filter((item) => item.shelfId === shelf.id);
    expect(items.filter((item) => item.kind === "timer")).toHaveLength(1);
    expect(validateGridLayout(items.filter(isShelfPlacedItem), metrics).violations).toEqual([]);
  }
};

describe("inventory recovery", () => {
  it.each([false, true])("repairs a full shelf once with a late timer: %s", (hasTimer) => {
    const initial = getInitialLibraryState();
    const books = Array.from({ length: 112 }, (_, index) => createBookItem({
      id: `full-book-${index}`,
      shelfId: initial.shelves[0].id,
      title: `Book ${index}`,
      position: { row: Math.floor(index / 28), col: index % 28 },
      createdAt: 1,
    }));
    const state: LibraryState = {
      ...initial,
      items: [...books, ...(hasTimer ? initial.items.filter((item) => item.kind === "timer") : [])],
      wardrobe: normalizeWardrobeState({
        ...initial.wardrobe!,
        defaultCostumeByKind: { ...initial.wardrobe!.defaultCostumeByKind, timer: "timer:arcane" },
      }),
    };
    const repaired = normalizeLibraryStateForRuntime(state, 1_000);

    expect(repaired.shelves).toHaveLength(2);
    expect(repaired.items.filter((item) => item.kind === "book").map((book) => book.id)).toEqual(books.map((book) => book.id));
    expectValidShelves(repaired);
    expect(normalizeLibraryStateForRuntime(repaired, 2_000)).toBe(repaired);
  });

  it("reserves IDs held by active and archived books when restoring a missing timer", () => {
    const initial = getInitialLibraryState();
    const book = createBookItem({
      id: "timer-shelf-1", shelfId: "shelf-1", title: "Keep me",
      position: { row: 0, col: 0 }, createdAt: 1,
    });
    const repaired = normalizeLibraryStateForRuntime({
      ...initial,
      items: [book],
      archivedBooks: [{ ...book, id: "timer-shelf-1-2", archivedAt: 1 }],
    });

    expect(repaired.items.find((item) => item.id === book.id)).toMatchObject(book);
    expect(repaired.items.find((item) => item.kind === "timer")?.id).toBe("timer-shelf-1-3");
    expectValidShelves(repaired);
  });

  it("repairs legacy duplicate timers whose progress fields are missing", () => {
    const initial = getInitialLibraryState();
    const timer = initial.items.find((item) => item.kind === "timer")!;
    const legacyTimer = { ...timer, id: "legacy-timer", xp: undefined, level: undefined };
    const repaired = readLibraryState({ ...initial, items: [...initial.items, legacyTimer] });

    expect(repaired.items.find((item) => item.kind === "timer")).toMatchObject({ xp: 0, level: 1 });
    expectValidShelves(repaired);
  });
});

describe("task note placement", () => {
  it("uses the expanded task note size before accepting a side-to-shelf drop", () => {
    const state = getInitialLibraryState();
    const shelf = state.shelves[0];
    const rejected = resolveLibraryShelfDrop({
      items: state.items, shelf, itemId: "sticky", metrics, tasks,
      position: { row: 2, col: 10 },
    });
    expect(rejected.type).toBe("snap-back");

    const accepted = resolveLibraryShelfDrop({
      items: state.items, shelf, itemId: "sticky", metrics, tasks,
      position: { row: 0, col: 10 },
    });
    expect(accepted.type).toBe("move");
    expect(accepted.items.find((item) => item.id === "sticky")).toMatchObject({
      placement: "shelf", widthUnits: 2, heightUnits: 3, row: 0, col: 10,
    });
    expect(validateGridLayout(accepted.items, metrics).valid).toBe(true);
  });

  it("allows costumes on shelf notes without changing their task-driven footprint", () => {
    const state = getInitialLibraryState();
    const note = {
      ...state.items.find((item) => item.kind === "sticky")!,
      placement: "shelf" as const, row: 0, col: 0, widthUnits: 2, heightUnits: 3,
    };
    const neighbor = createBookItem({
      id: "neighbor", shelfId: note.shelfId, title: "Neighbor", position: { row: 0, col: 2 },
    });
    const costume = getCostumeDefinition("sticky:arcane")!;
    const wardrobe = state.wardrobe!;
    const params = { item: note, items: [note, neighbor], costume, wardrobe, metrics };

    expect(validateItemCostumeApplication(params).valid).toBe(true);
    expect(validateDefaultCostumeApplication({ ...params, kind: "sticky" }).valid).toBe(true);
    expect(createItemWithCostume(note, costume, wardrobe)).toMatchObject({ widthUnits: 2, heightUnits: 3 });
  });

  it("blocks side swaps when the incoming note would overlap another shelf item", () => {
    const state = getInitialLibraryState();
    const painting = { ...state.items.find((item) => item.kind === "painting")!, placement: "shelf" as const, row: 0, col: 10 };
    const blocker = createBookItem({
      id: "blocker", shelfId: painting.shelfId, title: "Blocker", position: { row: 2, col: 10 },
    });
    const items = state.items.map((item) => item.id === painting.id ? painting : item).concat(blocker);
    const rejected = resolveSideColumnDrop(painting.id, {
      placement: "left-column", sideSlot: 6,
    }, items, 8, { metrics, tasks });

    expect(rejected.type).toBe("snap-back");
    expect(rejected.items).toBe(items);
    const accepted = resolveSideColumnDrop(painting.id, {
      placement: "left-column", sideSlot: 6,
    }, items.filter((item) => item.id !== blocker.id), 8, { metrics, tasks });
    expect(accepted.type).toBe("swap");
    expect(accepted.items.find((item) => item.id === "sticky")).toMatchObject({
      placement: "shelf", row: 0, col: 10, widthUnits: 2, heightUnits: 3,
    });
  });
});

describe("backup integrity", () => {
  it.each([undefined, 0, 2, "1", null])("rejects unsupported backup envelope version %s", (version) => {
    expect(() => parseLibraryBackup(JSON.stringify({
      app: "pomodoro-library", version, data: getInitialLibraryState(),
    }))).toThrow("desteklenmeyen bir dosya sürümüne");
  });

  it("rejects duplicate IDs shared between the shelf and archive", () => {
    const initial = getInitialLibraryState();
    expect(() => readLibraryState({
      ...initial, archivedBooks: [{ ...initial.items.find((item) => item.kind === "book"), archivedAt: 1 }],
    })).toThrow("kimlikleri eksik veya yinelenmiş");
  });

  it("rejects malformed legacy skin entries without throwing a raw conversion error", () => {
    const initial = getInitialLibraryState();
    expect(() => readLibraryState({
      ...initial, items: initial.items.map((item) => item.kind === "book"
        ? { ...item, unlockedSkins: [{ toString: null }] } : item),
    })).toThrow("kitap kostümleri listesi geçersiz");
  });

  it("normalizes archived book dimensions and preserves its unlocked costume", () => {
    const initial = getInitialLibraryState();
    const book = initial.items.find((item) => item.kind === "book")!;
    const repaired = readLibraryState({
      ...initial,
      archivedBooks: [{
        ...book, id: "archived", costumeId: "book:secret", archivedAt: 1,
        widthUnits: undefined, heightUnits: -2, xp: undefined, level: undefined,
      }],
    });

    expect(repaired.archivedBooks?.[0]).toMatchObject({
      id: "archived", widthUnits: 1, heightUnits: 0.95, xp: 0, level: 1, costumeId: "book:secret",
    });
    expect(repaired.wardrobe?.unlockedCostumeIds).toContain("book:secret");
    expect(normalizeLibraryStateForRuntime(repaired)).toBe(repaired);
  });

  it("ignores unknown legacy skin names without polluting the wardrobe", () => {
    const initial = getInitialLibraryState();
    const repaired = readLibraryState({
      ...initial, items: initial.items.map((item) => item.kind === "book"
        ? { ...item, skin: "__proto__", unlockedSkins: ["__proto__", "constructor", "moonlit"] } : item),
    });
    expect(repaired.wardrobe?.unlockedCostumeIds.every((id) => typeof id === "string")).toBe(true);
    expect(repaired.wardrobe?.unlockedCostumeIds).toContain("book:secret");
  });
});
