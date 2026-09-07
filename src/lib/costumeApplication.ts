import { canPlaceItem, type GridSize } from "@/lib/gridLogic";
import { getItemGridSize } from "@/lib/libraryItemDefinitions";
import {
  getDefaultCostumeId,
  type CostumeDefinition,
} from "@/lib/libraryCostumeDefinitions";
import { isShelfPlacedItem } from "@/lib/sideColumnLogic";
import type {
  CostumeId,
  LibraryItem,
  LibraryItemKind,
  LibraryWardrobeState,
} from "@/types/library";

export type WardrobeScope = "item" | "kind";

export type CostumeApplicationValidation = {
  valid: boolean;
  blockedCount: number;
  blockedItemIds: string[];
  reason?: "collision" | "out-of-bounds";
};

export const getCostumeGridSize = (
  kind: LibraryItemKind,
  costume: CostumeDefinition,
): GridSize => costume.size ?? getItemGridSize(kind);

export const setWardrobeDefaultCostume = (
  wardrobe: LibraryWardrobeState,
  kind: LibraryItemKind,
  costumeId: CostumeId,
): LibraryWardrobeState => ({
  ...wardrobe,
  defaultCostumeByKind: {
    ...wardrobe.defaultCostumeByKind,
    [kind]: costumeId,
  },
});

export const createItemWithCostume = (
  item: LibraryItem,
  costume: CostumeDefinition,
  wardrobe: LibraryWardrobeState,
): LibraryItem => {
  const defaultCostumeId =
    wardrobe.defaultCostumeByKind[item.kind] ?? getDefaultCostumeId(item.kind);
  const size = getCostumeGridSize(item.kind, costume);

  return {
    ...item,
    ...(item.kind === "book" ? { skin: undefined } : {}),
    costumeId: costume.id === defaultCostumeId ? undefined : costume.id,
    widthUnits: size.widthUnits,
    heightUnits: size.heightUnits,
  };
};

export const validateItemCostumeApplication = (params: {
  items: LibraryItem[];
  item: LibraryItem;
  costume: CostumeDefinition;
  wardrobe: LibraryWardrobeState;
  metrics: { columnCount: number; rowCount: number };
}): CostumeApplicationValidation => {
  const candidate = createItemWithCostume(
    params.item,
    params.costume,
    params.wardrobe,
  );

  if (!isShelfPlacedItem(params.item)) {
    return {
      valid: true,
      blockedCount: 0,
      blockedItemIds: [],
    };
  }

  const shelfItems = params.items
    .filter(
      (item) => item.shelfId === params.item.shelfId && isShelfPlacedItem(item),
    )
    .map((item) => (item.id === candidate.id ? candidate : item));
  const placement = canPlaceItem(
    candidate,
    shelfItems,
    params.metrics,
    candidate.id,
  );

  return placement.valid
    ? {
        valid: true,
        blockedCount: 0,
        blockedItemIds: [],
      }
    : {
        valid: false,
        blockedCount: 1,
        blockedItemIds: [params.item.id],
        reason: placement.reason,
      };
};

export const getItemsAfterDefaultCostume = (
  items: LibraryItem[],
  kind: LibraryItemKind,
  costume: CostumeDefinition,
  wardrobe: LibraryWardrobeState,
): LibraryItem[] =>
  items.map((item) => {
    if (item.kind !== kind) {
      return item;
    }

    if (item.costumeId && item.costumeId !== costume.id) {
      return item;
    }

    return createItemWithCostume(item, costume, wardrobe);
  });

export const validateDefaultCostumeApplication = (params: {
  items: LibraryItem[];
  kind: LibraryItemKind;
  costume: CostumeDefinition;
  wardrobe: LibraryWardrobeState;
  metrics: { columnCount: number; rowCount: number };
}): CostumeApplicationValidation => {
  const nextWardrobe = setWardrobeDefaultCostume(
    params.wardrobe,
    params.kind,
    params.costume.id,
  );
  const nextItems = getItemsAfterDefaultCostume(
    params.items,
    params.kind,
    params.costume,
    nextWardrobe,
  );
  const blockedItemIds = new Set<string>();
  let reason: CostumeApplicationValidation["reason"];

  for (const item of nextItems) {
    if (item.kind !== params.kind || item.costumeId) {
      continue;
    }

    if (!isShelfPlacedItem(item)) {
      continue;
    }

    const shelfItems = nextItems.filter(
      (candidate) =>
        candidate.shelfId === item.shelfId && isShelfPlacedItem(candidate),
    );
    const placement = canPlaceItem(item, shelfItems, params.metrics, item.id);

    if (!placement.valid) {
      blockedItemIds.add(item.id);
      reason = reason ?? placement.reason;
    }
  }

  return {
    valid: blockedItemIds.size === 0,
    blockedCount: blockedItemIds.size,
    blockedItemIds: [...blockedItemIds],
    reason,
  };
};
