import { describe, expect, it } from "vitest";
import { createGridMetrics } from "@/lib/gridLogic";
import { getInitialLibraryState } from "@/lib/libraryInventory";
import type { LibraryItem } from "@/types/library";
import {
  createShelfPresentation,
  getShelfDropPosition,
  getShelfItemRect,
  getShelfPreviewRect,
  SHELF_TIMER_HEIGHT,
  SHELF_TIMER_WIDTH,
  visualRectsOverlap,
} from "./shelfPresentation";

const metrics = createGridMetrics({
  containerWidth: 1120,
  columnCount: 28,
  rowCount: 4,
  gap: 8,
  cellAspectRatio: 3.36,
});
const initial = getInitialLibraryState();
const timer = initial.items.find((item) => item.kind === "timer")!;
const book = initial.items.find((item) => item.kind === "book")!;
const note = initial.items.find((item) => item.kind === "sticky")!;
const onShelf = <T extends LibraryItem>(
  item: T,
  changes: Partial<T> = {},
): T => ({ ...item, placement: "shelf", sideSlot: undefined, ...changes });

describe("shelf presentation preserves the saved grid", () => {
  it("expands the actual timer in free space without modifying any inventory fields", () => {
    const items = [onShelf(timer), onShelf(book, { row: 0, col: 0 })];
    const saved = structuredClone(items);
    items.forEach(Object.freeze);
    const presentation = createShelfPresentation(items, metrics);
    expect(presentation.timer?.rect.width).toBe(SHELF_TIMER_WIDTH);
    expect(presentation.timer?.rect.height).toBe(SHELF_TIMER_HEIGHT);
    expect(presentation.timer?.ledgeAfterRow).toBeNull();
    expect(items).toEqual(saved);
    expect(
      visualRectsOverlap(
        presentation.timer!.rect,
        getShelfItemRect(items[1], presentation),
      ),
    ).toBe(false);
  });

  it("inserts a full-sized ledge in a packed row and leaves every saved coordinate intact", () => {
    const items = [
      onShelf(timer),
      onShelf(book, { id: "left", row: 1, col: 3 }),
      onShelf(book, { id: "right", row: 1, col: 8 }),
      onShelf(book, { id: "below", row: 2, col: 4 }),
    ];
    const saved = structuredClone(items);
    const presentation = createShelfPresentation(items, metrics);
    expect(presentation.timer?.ledgeAfterRow).toBe(1);
    expect(presentation.timer?.rect.width).toBe(SHELF_TIMER_WIDTH);
    expect(presentation.timer?.rect.height).toBe(SHELF_TIMER_HEIGHT);
    expect(presentation.timer?.rect.y).toBeGreaterThan(
      presentation.boardTops[1],
    );
    for (const item of items.slice(1))
      expect(
        visualRectsOverlap(
          presentation.timer!.rect,
          getShelfItemRect(item, presentation),
        ),
      ).toBe(false);
    expect(getShelfItemRect(items[3], presentation).y).toBeGreaterThan(
      presentation.timer!.ledgeBoardTop!,
    );
    expect(items).toEqual(saved);
  });

  it("places a crowded ledge after a spanning note rather than cutting through it", () => {
    const items = [
      onShelf(timer),
      onShelf(book, { row: 1, col: 3 }),
      onShelf(note, { row: 1, col: 8, heightUnits: 2 }),
    ];
    const presentation = createShelfPresentation(items, metrics);
    expect(presentation.timer?.ledgeAfterRow).toBe(2);
    for (const item of items.slice(1))
      expect(
        visualRectsOverlap(
          presentation.timer!.rect,
          getShelfItemRect(item, presentation),
        ),
      ).toBe(false);
    expect(presentation.timer!.ledgeBoardTop!).toBeLessThan(
      presentation.height,
    );
  });

  it.each([0, 4, 24])(
    "keeps timer column %s stable when its visual body is wider than its logical footprint",
    (col) => {
      const item = onShelf(timer, { col });
      const presentation = createShelfPresentation([item], metrics);
      const rect = getShelfItemRect(item, presentation);
      const logicalOffsetX = col * (metrics.cellWidth + metrics.gap) - rect.x;
      expect(
        getShelfDropPosition(rect, item, presentation, logicalOffsetX),
      ).toEqual({ row: item.row, col });
      expect(
        getShelfDropPosition(
          { x: rect.x + metrics.cellWidth + metrics.gap, y: rect.y },
          item,
          presentation,
          logicalOffsetX,
        ),
      ).toEqual({ row: item.row, col: col + 1 });
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(metrics.width);
    },
  );

  it("maps a ledge timer back to its own row and can move it onto another shelf", () => {
    const items = [
      onShelf(timer),
      onShelf(book, { row: 1, col: 3 }),
      onShelf(book, { id: "right", row: 1, col: 8 }),
    ];
    const presentation = createShelfPresentation(items, metrics);
    const rect = getShelfItemRect(items[0], presentation);
    const offset = items[0].col * (metrics.cellWidth + metrics.gap) - rect.x;
    expect(getShelfDropPosition(rect, items[0], presentation, offset)).toEqual({
      row: 1,
      col: 4,
    });
    const target = getShelfPreviewRect({ ...items[0], row: 3 }, presentation);
    expect(
      getShelfDropPosition(target, items[0], presentation, offset),
    ).toEqual({ row: 3, col: 4 });
  });

  it("keeps fractional books and notes aligned with their drop targets below a ledge", () => {
    const items = [
      onShelf(timer),
      onShelf(book, { row: 1, col: 3 }),
      onShelf(book, { id: "right", row: 1, col: 8 }),
      onShelf(book, { id: "below", row: 2, col: 12 }),
      onShelf(note, { row: 2, col: 16, heightUnits: 1.7 }),
    ];
    const presentation = createShelfPresentation(items, metrics);
    for (const item of items.slice(1)) {
      const rect = getShelfItemRect(item, presentation);
      expect(getShelfDropPosition(rect, item, presentation)).toEqual({
        row: item.row,
        col: item.col,
      });
    }
    const outside = getShelfPreviewRect({ ...items[3], row: 4 }, presentation);
    expect(getShelfDropPosition(outside, items[3], presentation).row).toBe(4);
  });

  it("clamps the device only when the shelf itself is narrower and keeps the bottom ledge within the scene", () => {
    const narrow = createGridMetrics({
      containerWidth: 450,
      columnCount: 28,
      rowCount: 4,
      gap: 8,
      cellAspectRatio: 3.36,
    });
    const items = [
      onShelf(timer, { row: 3 }),
      onShelf(book, { row: 3, col: 3 }),
      onShelf(book, { id: "right", row: 3, col: 8 }),
    ];
    const presentation = createShelfPresentation(items, narrow);
    expect(presentation.timer?.rect.width).toBe(narrow.width);
    expect(presentation.timer?.rect.x).toBe(0);
    expect(presentation.timer!.ledgeBoardTop!).toBeLessThan(
      presentation.height,
    );
  });
});
