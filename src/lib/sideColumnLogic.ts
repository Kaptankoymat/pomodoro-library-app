import type {
  DecorItem,
  LibraryItem,
  SideColumnPlacement,
} from "@/types/library";

export type SideColumnTarget = {
  placement: SideColumnPlacement;
  sideSlot: number;
};

export type SideColumnDropResolution<TItem extends LibraryItem = LibraryItem> =
  | {
      type: "move";
      items: TItem[];
      movedItemId: string;
      target: SideColumnTarget;
    }
  | {
      type: "swap";
      items: TItem[];
      movedItemId: string;
      swappedItemId: string;
      target: SideColumnTarget;
    }
  | {
      type: "snap-back";
      items: TItem[];
      movedItemId: string;
      reason: "missing-item" | "unsupported-item" | "out-of-bounds";
    };

export const isSideColumnPlacement = (
  placement: string | null | undefined,
): placement is SideColumnPlacement =>
  placement === "left-column" || placement === "right-column";

export const isSideColumnEligibleKind = (
  kind: LibraryItem["kind"],
): kind is "painting" | "sticky" => kind === "painting" || kind === "sticky";

export const isSideColumnEligibleItem = (
  item: LibraryItem,
): item is DecorItem & { kind: "painting" | "sticky" } =>
  isSideColumnEligibleKind(item.kind);

export const getDefaultSideColumnPlacement = (
  kind: LibraryItem["kind"],
): SideColumnPlacement | null => {
  if (kind === "sticky") {
    return "left-column";
  }

  if (kind === "painting") {
    return "right-column";
  }

  return null;
};

export const isShelfPlacedItem = (item: LibraryItem): boolean =>
  !isSideColumnEligibleItem(item) || (item.placement ?? "shelf") === "shelf";

export const isSideColumnPlacedItem = (
  item: LibraryItem,
): item is DecorItem & {
  kind: "painting" | "sticky";
  placement: SideColumnPlacement;
  sideSlot: number;
} =>
  isSideColumnEligibleItem(item) &&
  isSideColumnPlacement(item.placement) &&
  Number.isInteger(item.sideSlot);

export const getSideColumnOccupant = <TItem extends LibraryItem>(
  items: TItem[],
  shelfId: string,
  target: SideColumnTarget,
  ignoreItemId?: string,
): TItem | undefined =>
  items.find(
    (item) =>
      item.id !== ignoreItemId &&
      item.shelfId === shelfId &&
      isSideColumnPlacedItem(item) &&
      item.placement === target.placement &&
      item.sideSlot === target.sideSlot,
  );

export const findAvailableSideSlot = <TItem extends LibraryItem>(
  items: TItem[],
  shelfId: string,
  placement: SideColumnPlacement,
  slotCount: number,
  ignoreItemId?: string,
): number | null => {
  for (let sideSlot = 0; sideSlot < slotCount; sideSlot += 1) {
    const occupant = getSideColumnOccupant(
      items,
      shelfId,
      {
        placement,
        sideSlot,
      },
      ignoreItemId,
    );

    if (!occupant) {
      return sideSlot;
    }
  }

  return null;
};

const isValidSideSlot = (sideSlot: number, slotCount: number): boolean =>
  Number.isInteger(sideSlot) && sideSlot >= 0 && sideSlot < slotCount;

export const normalizeSideColumnPlacements = <TItem extends LibraryItem>(
  items: TItem[],
  slotCount: number,
): TItem[] => {
  let changed = false;
  const placedItems: TItem[] = [];

  for (const item of items) {
    if (!isSideColumnEligibleItem(item)) {
      placedItems.push(item);
      continue;
    }

    const explicitPlacement = item.placement ?? getDefaultSideColumnPlacement(item.kind);

    if (explicitPlacement === "shelf" || !isSideColumnPlacement(explicitPlacement)) {
      const nextItem =
        item.placement === "shelf" && item.sideSlot === undefined
          ? item
          : ({
              ...item,
              placement: "shelf",
              sideSlot: undefined,
            } as TItem);

      changed = changed || nextItem !== item;
      placedItems.push(nextItem);
      continue;
    }

    const requestedSlot =
      typeof item.sideSlot === "number" && isValidSideSlot(item.sideSlot, slotCount)
      ? item.sideSlot
      : null;
    const sideSlot =
      requestedSlot !== null &&
      !getSideColumnOccupant(
        placedItems,
        item.shelfId,
        {
          placement: explicitPlacement,
          sideSlot: requestedSlot,
        },
        item.id,
      )
        ? requestedSlot
        : findAvailableSideSlot(
            placedItems,
            item.shelfId,
            explicitPlacement,
            slotCount,
            item.id,
          );

    if (sideSlot === null) {
      changed = true;
      placedItems.push({
        ...item,
        placement: "shelf",
        sideSlot: undefined,
      } as TItem);
      continue;
    }

    if (item.placement === explicitPlacement && item.sideSlot === sideSlot) {
      placedItems.push(item);
      continue;
    }

    changed = true;
    placedItems.push({
      ...item,
      placement: explicitPlacement,
      sideSlot,
    } as TItem);
  }

  return changed ? placedItems : items;
};

export const scaleSideColumnSlots = <TItem extends LibraryItem>(
  items: TItem[],
  oldSlotCount: number,
  nextSlotCount: number,
): TItem[] => {
  if (oldSlotCount === nextSlotCount) {
    return items;
  }

  let changed = false;
  const placedItems: TItem[] = [];
  const safeOldSlotCount = Math.max(1, oldSlotCount);

  for (const item of items) {
    if (!isSideColumnPlacedItem(item)) {
      placedItems.push(item);
      continue;
    }

    const scaledSlot = Math.min(
      nextSlotCount - 1,
      Math.max(
        0,
        Math.round(
          ((item.sideSlot + 0.5) / safeOldSlotCount) * nextSlotCount - 0.5,
        ),
      ),
    );
    const sideSlot = !getSideColumnOccupant(
      placedItems,
      item.shelfId,
      {
        placement: item.placement,
        sideSlot: scaledSlot,
      },
      item.id,
    )
      ? scaledSlot
      : findAvailableSideSlot(
          placedItems,
          item.shelfId,
          item.placement,
          nextSlotCount,
          item.id,
        );

    if (sideSlot === null) {
      changed = true;
      placedItems.push({
        ...item,
        placement: "shelf",
        sideSlot: undefined,
      } as TItem);
      continue;
    }

    changed = changed || sideSlot !== item.sideSlot;
    placedItems.push({
      ...item,
      sideSlot,
    } as TItem);
  }

  return changed ? placedItems : items;
};

export const resolveSideColumnDrop = <TItem extends LibraryItem>(
  itemId: string,
  target: SideColumnTarget,
  items: TItem[],
  slotCount: number,
): SideColumnDropResolution<TItem> => {
  const draggedItem = items.find((item) => item.id === itemId);

  if (!draggedItem) {
    return {
      type: "snap-back",
      items,
      movedItemId: itemId,
      reason: "missing-item",
    };
  }

  if (!isSideColumnEligibleItem(draggedItem)) {
    return {
      type: "snap-back",
      items,
      movedItemId: itemId,
      reason: "unsupported-item",
    };
  }

  if (!isValidSideSlot(target.sideSlot, slotCount)) {
    return {
      type: "snap-back",
      items,
      movedItemId: itemId,
      reason: "out-of-bounds",
    };
  }

  const previousSideTarget = isSideColumnPlacedItem(draggedItem)
    ? {
        placement: draggedItem.placement,
        sideSlot: draggedItem.sideSlot,
      }
    : null;
  const targetOccupant = getSideColumnOccupant(
    items,
    draggedItem.shelfId,
    target,
    draggedItem.id,
  );

  if (!targetOccupant) {
    return {
      type: "move",
      movedItemId: itemId,
      target,
      items: items.map((item) =>
        item.id === draggedItem.id
          ? ({
              ...item,
              placement: target.placement,
              sideSlot: target.sideSlot,
            } as TItem)
          : item,
      ),
    };
  }

  return {
    type: "swap",
    movedItemId: itemId,
    swappedItemId: targetOccupant.id,
    target,
    items: items.map((item) => {
      if (item.id === draggedItem.id) {
        return {
          ...item,
          placement: target.placement,
          sideSlot: target.sideSlot,
        } as TItem;
      }

      if (item.id !== targetOccupant.id) {
        return item;
      }

      if (previousSideTarget) {
        return {
          ...item,
          placement: previousSideTarget.placement,
          sideSlot: previousSideTarget.sideSlot,
        } as TItem;
      }

      return {
        ...item,
        placement: "shelf",
        sideSlot: undefined,
        row: draggedItem.row,
        col: draggedItem.col,
      } as TItem;
    }),
  };
};
