import type {
  GridMetrics,
  GridPosition,
  GridSize,
  PixelPoint,
} from "@/lib/gridLogic";
import type { LibraryItem } from "@/types/library";

export const SHELF_VISUAL_CLEARANCE = 14;
export const SHELF_VISUAL_ROW_GAP = 18;
export const SHELF_BOARD_OFFSET = 16;
export const SHELF_TIMER_WIDTH = 490;
export const SHELF_TIMER_HEIGHT = 118;
const TIMER_LEDGE_CLEARANCE = 36;

type PresentedItem = GridPosition & GridSize & Pick<LibraryItem, "id" | "kind">;
export type ShelfVisualRect = PixelPoint & { width: number; height: number };
export type ShelfPresentation = {
  metrics: GridMetrics;
  rowOffsets: number[];
  boardTops: number[];
  height: number;
  timer: null | {
    id: string;
    row: number;
    col: number;
    rect: ShelfVisualRect;
    ledgeAfterRow: number | null;
    ledgeBoardTop: number | null;
  };
};

const rawSize = (item: GridSize, metrics: GridMetrics) => ({
  width:
    item.widthUnits * metrics.cellWidth + (item.widthUnits - 1) * metrics.gap,
  height:
    item.heightUnits * metrics.cellHeight +
    (item.heightUnits - 1) * metrics.gap,
});
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const lastRow = (item: GridPosition & GridSize) =>
  item.row + Math.ceil(item.heightUnits) - 1;

/** A view of the saved grid; never enlarges, moves, or writes an inventory item. */
export function createShelfPresentation(
  items: readonly PresentedItem[],
  metrics: GridMetrics,
): ShelfPresentation {
  const timerItem = items.find((item) => item.kind === "timer");
  const rowOffsets = Array.from(
    { length: metrics.rowCount },
    (_, row) => row * SHELF_VISUAL_ROW_GAP,
  );
  let ledgeAfterRow: number | null = null;
  let timerWidth = 0;
  let timerHeight = 0;
  let timerX = 0;
  let addedHeight = 0;

  if (timerItem) {
    const size = rawSize(timerItem, metrics);
    timerWidth = Math.min(SHELF_TIMER_WIDTH, metrics.width);
    timerHeight = Math.max(SHELF_TIMER_HEIGHT, size.height);
    const slotX = timerItem.col * (metrics.cellWidth + metrics.gap);
    const slotRight = slotX + size.width;
    let left = 0;
    let right = metrics.width;
    for (const other of items) {
      if (
        other.id === timerItem.id ||
        other.row > lastRow(timerItem) ||
        lastRow(other) < timerItem.row
      )
        continue;
      const otherX = other.col * (metrics.cellWidth + metrics.gap);
      const otherRight = otherX + rawSize(other, metrics).width;
      if (otherRight <= slotX) left = Math.max(left, otherRight + metrics.gap);
      if (otherX >= slotRight) right = Math.min(right, otherX - metrics.gap);
    }
    if (right - left >= timerWidth) {
      timerX = clamp(slotX, left, right - timerWidth);
      addedHeight = Math.max(0, timerHeight - metrics.cellHeight);
      for (let row = timerItem.row; row < metrics.rowCount; row += 1)
        rowOffsets[row] += addedHeight;
    } else {
      // Insert between complete objects. A tall note can span the next logical
      // row, so extend the same ledge past that span instead of covering it.
      ledgeAfterRow = lastRow(timerItem);
      let boundaryChanged = true;
      while (boundaryChanged) {
        boundaryChanged = false;
        for (const other of items) {
          if (
            other.id !== timerItem.id &&
            other.row <= ledgeAfterRow &&
            lastRow(other) > ledgeAfterRow
          ) {
            ledgeAfterRow = lastRow(other);
            boundaryChanged = true;
          }
        }
      }
      ledgeAfterRow = Math.min(metrics.rowCount - 1, ledgeAfterRow);
      timerX = clamp(slotX, 0, metrics.width - timerWidth);
      addedHeight = timerHeight + TIMER_LEDGE_CLEARANCE;
      for (let row = ledgeAfterRow + 1; row < metrics.rowCount; row += 1)
        rowOffsets[row] += addedHeight;
    }
  }

  const boardTops = rowOffsets.map(
    (offset, row) =>
      row * (metrics.cellHeight + metrics.gap) +
      metrics.cellHeight -
      SHELF_BOARD_OFFSET +
      SHELF_VISUAL_CLEARANCE +
      offset,
  );
  const ledgeBoardTop =
    ledgeAfterRow === null
      ? null
      : boardTops[ledgeAfterRow] + TIMER_LEDGE_CLEARANCE + timerHeight;
  return {
    metrics,
    rowOffsets,
    boardTops,
    height:
      metrics.height +
      SHELF_VISUAL_CLEARANCE +
      Math.max(0, metrics.rowCount - 1) * SHELF_VISUAL_ROW_GAP +
      addedHeight,
    timer: timerItem
      ? {
          id: timerItem.id,
          row: timerItem.row,
          col: timerItem.col,
          rect: {
            x: timerX,
            y: (ledgeBoardTop ?? boardTops[timerItem.row]) - timerHeight,
            width: timerWidth,
            height: timerHeight,
          },
          ledgeAfterRow,
          ledgeBoardTop,
        }
      : null,
  };
}

const rowOffset = (row: number, presentation: ShelfPresentation) => {
  const index = clamp(row, 0, presentation.metrics.rowCount - 1);
  return presentation.rowOffsets[index] + (row - index) * SHELF_VISUAL_ROW_GAP;
};

export function getShelfItemRect(
  item: PresentedItem,
  presentation: ShelfPresentation,
): ShelfVisualRect {
  const { metrics, timer } = presentation;
  if (timer?.id === item.id && timer.row === item.row && timer.col === item.col)
    return timer.rect;
  const size = rawSize(item, metrics);
  const occupiedRows = Math.ceil(item.heightUnits);
  const fullHeight =
    occupiedRows * metrics.cellHeight + (occupiedRows - 1) * metrics.gap;
  const extraHeight =
    rowOffset(lastRow(item), presentation) -
    rowOffset(item.row, presentation) -
    (occupiedRows - 1) * SHELF_VISUAL_ROW_GAP;
  return {
    x: item.col * (metrics.cellWidth + metrics.gap),
    y:
      item.row * (metrics.cellHeight + metrics.gap) +
      rowOffset(item.row, presentation) -
      SHELF_BOARD_OFFSET +
      SHELF_VISUAL_CLEARANCE +
      fullHeight -
      size.height,
    width: size.width,
    height: size.height + extraHeight,
  };
}

/** Candidate rectangles share the real shelf's row offsets, including a ledge. */
export function getShelfPreviewRect(
  item: PresentedItem,
  presentation: ShelfPresentation,
): ShelfVisualRect {
  if (item.kind !== "timer") return getShelfItemRect(item, presentation);
  const { metrics, timer } = presentation;
  const width = Math.min(SHELF_TIMER_WIDTH, metrics.width);
  const height = Math.max(SHELF_TIMER_HEIGHT, rawSize(item, metrics).height);
  const currentRow = timer?.id === item.id && timer.row === item.row;
  const boardTop =
    currentRow && timer.ledgeBoardTop !== null
      ? timer.ledgeBoardTop
      : item.row * (metrics.cellHeight + metrics.gap) +
        rowOffset(item.row, presentation) +
        metrics.cellHeight -
        SHELF_BOARD_OFFSET +
        SHELF_VISUAL_CLEARANCE;
  return {
    x:
      currentRow && timer.col === item.col
        ? timer.rect.x
        : clamp(
            item.col * (metrics.cellWidth + metrics.gap),
            0,
            metrics.width - width,
          ),
    y: boardTop - height,
    width,
    height,
  };
}

/** Map a dragged visual top-left back to the unchanged logical drop grid. */
export function getShelfDropPosition(
  visualOrigin: PixelPoint,
  item: PresentedItem,
  presentation: ShelfPresentation,
  logicalOffsetX = 0,
): GridPosition {
  const { metrics } = presentation;
  let nearestRow = item.row;
  let nearestDistance = Infinity;
  for (let row = -1; row <= metrics.rowCount; row += 1) {
    const candidate = { ...item, row };
    // Avoid the current timer's special ledge while comparing normal rows.
    const candidatePresentation =
      item.kind === "timer" ? { ...presentation, timer: null } : presentation;
    const rect =
      item.kind === "timer"
        ? getShelfPreviewRect(candidate, candidatePresentation)
        : getShelfItemRect(candidate, candidatePresentation);
    const distance = Math.abs(visualOrigin.y - rect.y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestRow = row;
    }
  }
  if (
    item.kind === "timer" &&
    presentation.timer?.ledgeAfterRow !== null &&
    presentation.timer?.id === item.id
  ) {
    const distance = Math.abs(visualOrigin.y - presentation.timer.rect.y);
    if (distance <= nearestDistance) nearestRow = presentation.timer.row;
  }
  return {
    col: Math.round(
      (visualOrigin.x + logicalOffsetX) / (metrics.cellWidth + metrics.gap),
    ),
    row: nearestRow,
  };
}

export const visualRectsOverlap = (
  left: ShelfVisualRect,
  right: ShelfVisualRect,
) =>
  left.x < right.x + right.width &&
  left.x + left.width > right.x &&
  left.y < right.y + right.height &&
  left.y + left.height > right.y;
