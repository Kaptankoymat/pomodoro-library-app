import { resolveResizeLayout, validateGridLayout } from "@/lib/gridLogic";
import {
  DEFAULT_SHELF_ROWS,
  GRID_COLUMN_COUNT,
  LIBRARY_SCHEMA_VERSION,
  SIDE_COLUMN_SLOT_COUNT,
} from "@/lib/libraryInventory";
import {
  ITEM_DESIGN_VERSION,
  normalizeLibraryItemDesigns,
} from "@/lib/libraryItemDefinitions";
import {
  areWardrobeStatesEqual,
  normalizeItemsForCostumes,
  normalizeWardrobeState,
} from "@/lib/libraryCostumeDefinitions";
import {
  isShelfPlacedItem,
  normalizeSideColumnPlacements,
  scaleSideColumnSlots,
} from "@/lib/sideColumnLogic";
import { applyStickyTaskSize } from "@/lib/stickyTaskLayout";
import { isBookItem, type LibraryItem, type LibraryState } from "@/types/library";

const LEGACY_SHELF_COLUMN_COUNT = 24;
const LEGACY_SIDE_COLUMN_SLOT_COUNT = 5;

const getShelfMetrics = () => ({
  columnCount: GRID_COLUMN_COUNT,
  rowCount: DEFAULT_SHELF_ROWS,
});

const haveGridPositionsChanged = (
  currentItems: LibraryItem[],
  nextItems: LibraryItem[],
): boolean => {
  if (currentItems.length !== nextItems.length) {
    return true;
  }

  const currentById = new Map(currentItems.map((item) => [item.id, item] as const));

  return nextItems.some((nextItem) => {
    const currentItem = currentById.get(nextItem.id);

    return (
      !currentItem ||
      currentItem.row !== nextItem.row ||
      currentItem.col !== nextItem.col
    );
  });
};

const scaleShelfColumns = (
  items: LibraryItem[],
  previousColumnCount: number,
  nextColumnCount: number,
): LibraryItem[] => {
  if (previousColumnCount === nextColumnCount) {
    return items;
  }

  return items.map((item) => {
    if (!isShelfPlacedItem(item)) {
      return item;
    }

    const previousMaxCol = Math.max(0, previousColumnCount - item.widthUnits);
    const nextMaxCol = Math.max(0, nextColumnCount - item.widthUnits);
    const scale = previousMaxCol > 0 ? nextMaxCol / previousMaxCol : 1;
    const nextCol = Math.min(
      nextMaxCol,
      Math.max(0, Math.round(item.col * scale)),
    );

    return nextCol === item.col
      ? item
      : {
          ...item,
          col: nextCol,
        };
  });
};

export const normalizeLibraryStateForRuntime = (
  state: LibraryState,
  now = Date.now(),
): LibraryState => {
  let changed = false;
  let shelvesChanged = false;
  const normalizedShelves = state.shelves.map((shelf) => {
    if (shelf.rowCount === DEFAULT_SHELF_ROWS) {
      return shelf;
    }

    shelvesChanged = true;
    return {
      ...shelf,
      rowCount: DEFAULT_SHELF_ROWS,
    };
  });
  const shelves = shelvesChanged ? normalizedShelves : state.shelves;

  const slotScaledItems =
    state.sideColumnSlotCount !== SIDE_COLUMN_SLOT_COUNT
      ? scaleSideColumnSlots(
          state.items,
          state.sideColumnSlotCount ?? LEGACY_SIDE_COLUMN_SLOT_COUNT,
          SIDE_COLUMN_SLOT_COUNT,
        )
      : state.items;
  const columnScaledItems =
    state.shelfColumnCount !== GRID_COLUMN_COUNT
      ? scaleShelfColumns(
          slotScaledItems,
          state.shelfColumnCount ?? LEGACY_SHELF_COLUMN_COUNT,
          GRID_COLUMN_COUNT,
        )
      : slotScaledItems;
  const designNormalizedItems = normalizeLibraryItemDesigns(columnScaledItems);
  const normalizedWardrobe = normalizeWardrobeState(state.wardrobe);
  const costumeNormalized = normalizeItemsForCostumes(
    designNormalizedItems,
    normalizedWardrobe,
  );
  let items = normalizeSideColumnPlacements(
    costumeNormalized.items,
    SIDE_COLUMN_SLOT_COUNT,
  );
  items = applyStickyTaskSize(items, state.tasks);
  const itemsBeforeMetadata = items;
  let itemMetadataChanged = false;
  const metadataNormalizedItems = items.map((item) => {
    if (isBookItem(item)) {
      if (item.createdAt && (item.note ? item.noteUpdatedAt : true)) {
        return item;
      }

      itemMetadataChanged = true;
      return {
        ...item,
        createdAt: item.createdAt ?? now,
        noteUpdatedAt: item.note ? item.noteUpdatedAt ?? now : item.noteUpdatedAt,
      };
    }

    return item;
  });
  items = itemMetadataChanged ? metadataNormalizedItems : itemsBeforeMetadata;

  for (const shelf of shelves) {
    const shelfItems = items.filter(
      (item) => item.shelfId === shelf.id && isShelfPlacedItem(item),
    );
    const validation = validateGridLayout(shelfItems, getShelfMetrics());

    if (validation.valid) {
      continue;
    }

    const repairedItems = resolveResizeLayout(shelfItems, getShelfMetrics());

    if (!haveGridPositionsChanged(shelfItems, repairedItems)) {
      continue;
    }

    const repairedItemsById = new Map(
      repairedItems.map((item) => [item.id, item] as const),
    );

    items = items.map((item) => repairedItemsById.get(item.id) ?? item);
    changed = true;
  }

  const selectedFocusItem = state.selectedFocusItemId
    ? items.find((item) => item.id === state.selectedFocusItemId)
    : null;
  const selectedBook = state.selectedBookId
    ? items.find((item) => item.id === state.selectedBookId)
    : null;
  const selectedFocusItemId = selectedFocusItem
    ? isBookItem(selectedFocusItem)
      ? selectedFocusItem.id
      : null
    : selectedBook && isBookItem(selectedBook)
      ? selectedBook.id
      : null;
  let tasksChanged = false;
  const normalizedTasks = state.tasks.map((task) => {
    if (task.updatedAt) {
      return task;
    }

    tasksChanged = true;
    return {
      ...task,
      updatedAt: task.createdAt || now,
    };
  });
  const tasks = tasksChanged ? normalizedTasks : state.tasks;
  const activeFocusSession =
    state.activeFocusSession === undefined ? null : state.activeFocusSession;
  const focusSessions = state.focusSessions ?? [];
  const archivedBooks = state.archivedBooks ?? [];

  changed =
    changed ||
    shelvesChanged ||
    slotScaledItems !== state.items ||
    designNormalizedItems !== slotScaledItems ||
    costumeNormalized.items !== designNormalizedItems ||
    items !== costumeNormalized.items ||
    itemMetadataChanged ||
    tasksChanged ||
    selectedFocusItemId !== state.selectedFocusItemId ||
    !areWardrobeStatesEqual(state.wardrobe, costumeNormalized.wardrobe) ||
    state.schemaVersion !== LIBRARY_SCHEMA_VERSION ||
    state.itemDesignVersion !== ITEM_DESIGN_VERSION ||
    state.shelfColumnCount !== GRID_COLUMN_COUNT ||
    state.sideColumnSlotCount !== SIDE_COLUMN_SLOT_COUNT ||
    state.activeFocusSession === undefined ||
    state.focusSessions === undefined ||
    state.archivedBooks === undefined;

  if (!changed) {
    return state;
  }

  return {
    ...state,
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    shelves,
    items,
    tasks,
    archivedBooks,
    activeFocusSession,
    focusSessions,
    selectedFocusItemId,
    wardrobe: costumeNormalized.wardrobe,
    itemDesignVersion: ITEM_DESIGN_VERSION,
    shelfColumnCount: GRID_COLUMN_COUNT,
    sideColumnSlotCount: SIDE_COLUMN_SLOT_COUNT,
  };
};
