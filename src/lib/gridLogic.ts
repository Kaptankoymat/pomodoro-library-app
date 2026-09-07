export type GridUnit = number;

export type GridPosition = {
  row: GridUnit;
  col: GridUnit;
};

export type GridSize = {
  widthUnits: GridUnit;
  heightUnits: GridUnit;
};

export type GridItem<TKind extends string = string> = GridPosition &
  GridSize & {
    id: string;
    kind: TKind;
  };

export type GridMetrics = {
  columnCount: number;
  rowCount: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
  width: number;
  height: number;
};

export type PixelPoint = {
  x: number;
  y: number;
};

export type GridPixelTarget = {
  position: GridPosition;
  clampedPosition: GridPosition;
  isOutOfBounds: boolean;
};

export type PlacementResult =
  | {
      valid: true;
      position: GridPosition;
    }
  | {
      valid: false;
      reason: "out-of-bounds" | "collision";
    };

export type DropResolution<TItem extends GridItem> =
  | {
      type: "move";
      items: TItem[];
      movedItemId: string;
      position: GridPosition;
    }
  | {
      type: "swap";
      items: TItem[];
      movedItemId: string;
      swappedItemId: string;
    }
  | {
      type: "snap-back";
      items: TItem[];
      movedItemId: string;
      reason: "missing-item" | "out-of-bounds" | "blocked";
    };

export type DropOptions<TItem extends GridItem> = {
  canSwap?: (draggedItem: TItem, targetItem: TItem) => boolean;
};

export type GridLayoutViolationReason = "out-of-bounds" | "collision";

export type GridLayoutViolation = {
  itemId: string;
  reason: GridLayoutViolationReason;
  collidingItemId?: string;
};

export type GridLayoutValidation = {
  valid: boolean;
  violations: GridLayoutViolation[];
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const createGridMetrics = (params: {
  containerWidth: number;
  containerHeight?: number;
  columnCount?: number;
  rowCount?: number;
  minCellWidth?: number;
  maxCellWidth?: number;
  cellAspectRatio?: number;
  gap?: number;
}): GridMetrics => {
  const {
    containerWidth,
    containerHeight,
    columnCount = 12,
    rowCount = 4,
    minCellWidth = 38,
    maxCellWidth = 72,
    cellAspectRatio = 1.32,
    gap = 8,
  } = params;

  const safeWidth = Math.max(containerWidth, 1);
  const safeHeight =
    containerHeight === undefined ? undefined : Math.max(containerHeight, 1);
  const widthLimitedCellWidth = Math.max(
    1,
    (safeWidth - gap * (columnCount - 1)) / columnCount,
  );
  const heightLimitedCellWidth =
    safeHeight === undefined
      ? widthLimitedCellWidth
      : Math.max(
          1,
          (safeHeight - gap * (rowCount - 1)) / rowCount / cellAspectRatio,
        );
  const rawCellWidth = Math.min(widthLimitedCellWidth, heightLimitedCellWidth);
  const minFittingCellWidth = Math.min(minCellWidth, rawCellWidth);
  const cellWidth = clamp(rawCellWidth, minFittingCellWidth, maxCellWidth);
  const cellHeight = Math.max(1, Math.floor(cellWidth * cellAspectRatio));
  const width = cellWidth * columnCount + gap * (columnCount - 1);
  const height = cellHeight * rowCount + gap * (rowCount - 1);

  return {
    columnCount,
    rowCount,
    cellWidth,
    cellHeight,
    gap,
    width,
    height,
  };
};

export const gridToPixel = (
  position: GridPosition,
  metrics: GridMetrics,
): PixelPoint => ({
  x: position.col * (metrics.cellWidth + metrics.gap),
  y: position.row * (metrics.cellHeight + metrics.gap),
});

export const pixelToGrid = (
  point: PixelPoint,
  size: GridSize,
  metrics: GridMetrics,
): GridPosition => {
  const col = Math.round(point.x / (metrics.cellWidth + metrics.gap));
  const row = Math.round(point.y / (metrics.cellHeight + metrics.gap));

  return {
    col: clamp(col, 0, metrics.columnCount - size.widthUnits),
    row: clamp(row, 0, metrics.rowCount - size.heightUnits),
  };
};

export const pixelToGridTarget = (
  point: PixelPoint,
  size: GridSize,
  metrics: GridMetrics,
): GridPixelTarget => {
  const col = Math.round(point.x / (metrics.cellWidth + metrics.gap));
  const row = Math.round(point.y / (metrics.cellHeight + metrics.gap));
  const position = { col, row };
  const clampedPosition = {
    col: clamp(col, 0, metrics.columnCount - size.widthUnits),
    row: clamp(row, 0, metrics.rowCount - size.heightUnits),
  };

  return {
    position,
    clampedPosition,
    isOutOfBounds: !doesItemFit(position, size, metrics),
  };
};

export const doesItemFit = (
  position: GridPosition,
  size: GridSize,
  metrics: Pick<GridMetrics, "columnCount" | "rowCount">,
): boolean =>
  position.col >= 0 &&
  position.row >= 0 &&
  position.col + size.widthUnits <= metrics.columnCount &&
  position.row + size.heightUnits <= metrics.rowCount;

export const doRectsOverlap = (
  a: GridPosition & GridSize,
  b: GridPosition & GridSize,
): boolean =>
  a.col < b.col + b.widthUnits &&
  a.col + a.widthUnits > b.col &&
  a.row < b.row + b.heightUnits &&
  a.row + a.heightUnits > b.row;

export const canPlaceItem = <TItem extends GridItem>(
  candidate: GridPosition & GridSize,
  items: TItem[],
  metrics: Pick<GridMetrics, "columnCount" | "rowCount">,
  ignoreItemId?: string,
): PlacementResult => {
  if (!doesItemFit(candidate, candidate, metrics)) {
    return { valid: false, reason: "out-of-bounds" };
  }

  const hasCollision = items.some(
    (item) => item.id !== ignoreItemId && doRectsOverlap(candidate, item),
  );

  if (hasCollision) {
    return { valid: false, reason: "collision" };
  }

  return {
    valid: true,
    position: {
      row: candidate.row,
      col: candidate.col,
    },
  };
};

export const getCollidingItems = <TItem extends GridItem>(
  candidate: GridPosition & GridSize,
  items: TItem[],
  ignoreItemId?: string,
): TItem[] =>
  items.filter(
    (item) => item.id !== ignoreItemId && doRectsOverlap(candidate, item),
  );

export const findNearestValidSlot = <TItem extends GridItem>(
  desired: GridPosition,
  size: GridSize,
  items: TItem[],
  metrics: Pick<GridMetrics, "columnCount" | "rowCount">,
  ignoreItemId?: string,
): GridPosition | null => {
  const candidates: GridPosition[] = [];

  for (let row = 0; row <= metrics.rowCount - size.heightUnits; row += 1) {
    for (let col = 0; col <= metrics.columnCount - size.widthUnits; col += 1) {
      candidates.push({ row, col });
    }
  }

  candidates.sort((a, b) => {
    const distanceA = Math.abs(a.row - desired.row) + Math.abs(a.col - desired.col);
    const distanceB = Math.abs(b.row - desired.row) + Math.abs(b.col - desired.col);
    return distanceA - distanceB;
  });

  const match = candidates.find((position) => {
    const result = canPlaceItem(
      {
        row: position.row,
        col: position.col,
        widthUnits: size.widthUnits,
        heightUnits: size.heightUnits,
      },
      items,
      metrics,
      ignoreItemId,
    );
    return result.valid;
  });

  return match ?? null;
};

export const resolveDrop = <TItem extends GridItem>(
  itemId: string,
  desiredPosition: GridPosition,
  items: TItem[],
  metrics: Pick<GridMetrics, "columnCount" | "rowCount">,
  options: DropOptions<TItem> = {},
): DropResolution<TItem> => {
  const draggedItem = items.find((item) => item.id === itemId);

  if (!draggedItem) {
    return {
      type: "snap-back",
      items,
      movedItemId: itemId,
      reason: "missing-item",
    };
  }

  const candidate = {
    ...draggedItem,
    ...desiredPosition,
  };

  if (!doesItemFit(candidate, candidate, metrics)) {
    return {
      type: "snap-back",
      items,
      movedItemId: itemId,
      reason: "out-of-bounds",
    };
  }

  const collidingItems = getCollidingItems(candidate, items, draggedItem.id);

  if (collidingItems.length === 0) {
    return {
      type: "move",
      movedItemId: itemId,
      position: desiredPosition,
      items: items.map((item) =>
        item.id === draggedItem.id ? { ...item, ...desiredPosition } : item,
      ),
    };
  }

  if (collidingItems.length === 1) {
    const swappedItem = collidingItems[0];
    const canSwapItems =
      options.canSwap?.(draggedItem, swappedItem) ??
      (draggedItem.widthUnits === swappedItem.widthUnits &&
        draggedItem.heightUnits === swappedItem.heightUnits);

    if (!canSwapItems) {
      return {
        type: "snap-back",
        items,
        movedItemId: draggedItem.id,
        reason: "blocked",
      };
    }

    const otherItems = items.filter(
      (item) => item.id !== draggedItem.id && item.id !== swappedItem.id,
    );
    const swappedCandidate = {
      ...swappedItem,
      row: draggedItem.row,
      col: draggedItem.col,
    };

    const canMoveDragged =
      canPlaceItem(candidate, otherItems, metrics, draggedItem.id).valid;
    const canMoveSwapped =
      canPlaceItem(swappedCandidate, [...otherItems, candidate], metrics).valid &&
      !doRectsOverlap(candidate, swappedCandidate);

    if (canMoveDragged && canMoveSwapped) {
      return {
        type: "swap",
        movedItemId: draggedItem.id,
        swappedItemId: swappedItem.id,
        items: items.map((item) => {
          if (item.id === draggedItem.id) {
            return {
              ...item,
              row: desiredPosition.row,
              col: desiredPosition.col,
            };
          }

          if (item.id === swappedItem.id) {
            return {
              ...item,
              row: draggedItem.row,
              col: draggedItem.col,
            };
          }

          return item;
        }),
      };
    }
  }

  return {
    type: "snap-back",
    items,
    movedItemId: draggedItem.id,
    reason: "blocked",
  };
};

export const getResolvedItemPosition = <TItem extends GridItem>(
  itemId: string,
  resolution: DropResolution<TItem>,
): GridPosition | null => {
  const item = resolution.items.find((candidate) => candidate.id === itemId);

  if (!item) {
    return null;
  }

  return {
    row: item.row,
    col: item.col,
  };
};

export const validateGridLayout = <TItem extends GridItem>(
  items: TItem[],
  metrics: Pick<GridMetrics, "columnCount" | "rowCount">,
): GridLayoutValidation => {
  const violations: GridLayoutViolation[] = [];
  const seen = new Set<string>();

  const addViolation = (violation: GridLayoutViolation) => {
    const key = `${violation.itemId}:${violation.reason}:${
      violation.collidingItemId ?? ""
    }`;

    if (!seen.has(key)) {
      seen.add(key);
      violations.push(violation);
    }
  };

  for (const item of items) {
    if (!doesItemFit(item, item, metrics)) {
      addViolation({
        itemId: item.id,
        reason: "out-of-bounds",
      });
    }
  }

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    for (let nextIndex = index + 1; nextIndex < items.length; nextIndex += 1) {
      const nextItem = items[nextIndex];

      if (doRectsOverlap(item, nextItem)) {
        addViolation({
          itemId: item.id,
          reason: "collision",
          collidingItemId: nextItem.id,
        });
        addViolation({
          itemId: nextItem.id,
          reason: "collision",
          collidingItemId: item.id,
        });
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
};

export const resolveResizeLayout = <TItem extends GridItem>(
  items: TItem[],
  metrics: Pick<GridMetrics, "columnCount" | "rowCount">,
): TItem[] => {
  const placed: TItem[] = [];

  for (const item of items) {
    const clampedPosition = {
      row: clamp(item.row, 0, Math.max(0, metrics.rowCount - item.heightUnits)),
      col: clamp(item.col, 0, Math.max(0, metrics.columnCount - item.widthUnits)),
    };

    const candidate = {
      ...item,
      ...clampedPosition,
    };

    const validSlot =
      canPlaceItem(candidate, placed, metrics, item.id).valid
        ? clampedPosition
        : findNearestValidSlot(clampedPosition, item, placed, metrics, item.id);

    placed.push({
      ...item,
      ...(validSlot ?? clampedPosition),
    });
  }

  return placed;
};
