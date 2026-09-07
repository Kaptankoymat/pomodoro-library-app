import { canPlaceItem, findNearestValidSlot, validateGridLayout } from "@/lib/gridLogic";
import { normalizeFocusSession } from "@/lib/focusSession";
import {
  DEFAULT_SHELF_ROWS,
  createShelfWithTimer,
  ensureShelfTimers,
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
import { isBookItem, type ArchivedBook, type LibraryItem, type LibraryState } from "@/types/library";

const LEGACY_SHELF_COLUMN_COUNT = 24;
const LEGACY_SIDE_COLUMN_SLOT_COUNT = 5;

const getShelfMetrics = () => ({
  columnCount: GRID_COLUMN_COUNT,
  rowCount: DEFAULT_SHELF_ROWS,
});

const haveSameFields = (left: object, right: object): boolean => {
  const leftFields = left as Record<string, unknown>;
  const rightFields = right as Record<string, unknown>;
  return Array.from(new Set([...Object.keys(left), ...Object.keys(right)]))
    .every((key) => Object.is(leftFields[key], rightFields[key]));
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
  let shelves = shelvesChanged ? normalizedShelves : state.shelves;

  const archivedItemIds = (state.archivedBooks ?? []).map((book) => book.id);
  const itemsWithTimers = ensureShelfTimers(shelves, state.items, archivedItemIds);
  const slotScaledItems =
    state.sideColumnSlotCount !== SIDE_COLUMN_SLOT_COUNT
      ? scaleSideColumnSlots(
          itemsWithTimers,
          state.sideColumnSlotCount ?? LEGACY_SIDE_COLUMN_SLOT_COUNT,
          SIDE_COLUMN_SLOT_COUNT,
        )
      : itemsWithTimers;
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

  const overflowItems: LibraryItem[] = [];
  for (const shelf of shelves) {
    const shelfItems = items.filter(
      (item) => item.shelfId === shelf.id && isShelfPlacedItem(item),
    );
    const validation = validateGridLayout(shelfItems, getShelfMetrics());

    if (validation.valid) {
      continue;
    }

    const repairedItems: LibraryItem[] = [];
    // Every shelf must retain its timer. Repair it before books, including
    // legacy timers that were just appended to an already full shelf.
    const repairOrder = [...shelfItems].sort(
      (left, right) => Number(right.kind === "timer") - Number(left.kind === "timer"),
    );
    for (const item of repairOrder) {
      const position = canPlaceItem(item, repairedItems, getShelfMetrics()).valid
        ? { row: item.row, col: item.col }
        : findNearestValidSlot(item, item, repairedItems, getShelfMetrics());
      if (position) {
        repairedItems.push({ ...item, ...position });
      } else {
        overflowItems.push(item);
      }
    }

    const repairedItemsById = new Map(
      repairedItems.map((item) => [item.id, item] as const),
    );

    items = items.map((item) => repairedItemsById.get(item.id) ?? item);
  }

  // A larger costume, growing task note, or legacy timer can fill a shelf.
  // Keep every item reachable by moving overflow onto additional shelves.
  let overflowShelf: ReturnType<typeof createShelfWithTimer> | undefined;
  const movedItems = new Map<string, LibraryItem>();
  const createdTimers: LibraryItem[] = [];
  for (const item of overflowItems) {
    let position = overflowShelf
      ? findNearestValidSlot(
          { row: 0, col: 0 }, item,
          [overflowShelf.timer, ...movedItems.values()].filter(
            (candidate) => candidate.shelfId === overflowShelf!.shelf.id,
          ), getShelfMetrics(),
        )
      : null;
    if (!position) {
      let suffix = shelves.length + 1;
      while (shelves.some((shelf) => shelf.id === `recovered-shelf-${suffix}`) ||
        items.some((candidate) => candidate.id === `timer-recovered-shelf-${suffix}`) ||
        archivedItemIds.includes(`timer-recovered-shelf-${suffix}`)) {
        suffix += 1;
      }
      const recovered = createShelfWithTimer({ id: `recovered-shelf-${suffix}`, index: shelves.length });
      overflowShelf = {
        ...recovered,
        timer: normalizeItemsForCostumes(
          [recovered.timer], costumeNormalized.wardrobe,
        ).items[0] as typeof recovered.timer,
      };
      shelves = [...shelves, overflowShelf.shelf];
      createdTimers.push(overflowShelf.timer);
      position = findNearestValidSlot({ row: 0, col: 0 }, item, [overflowShelf.timer], getShelfMetrics());
    }
    if (position && overflowShelf) {
      movedItems.set(item.id, { ...item, shelfId: overflowShelf.shelf.id, ...position });
    }
  }
  if (movedItems.size > 0) {
    items = [...items.map((item) => movedItems.get(item.id) ?? item), ...createdTimers];
  }

  // Intermediate design/costume passes may allocate identical objects. Reuse
  // the final unchanged state so the migration effect cannot keep saving it.
  const originalItemsById = new Map(state.items.map((item) => [item.id, item]));
  items = items.map((item) => {
    const original = originalItemsById.get(item.id);
    return original && haveSameFields(original, item) ? original : item;
  });
  if (items.length === state.items.length && items.every((item, index) => item === state.items[index])) {
    items = state.items;
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
  const normalizedSession = state.activeFocusSession
    ? normalizeFocusSession(state.activeFocusSession) : null;
  const activeFocusSession = normalizedSession && state.activeFocusSession &&
    haveSameFields(normalizedSession, state.activeFocusSession)
    ? state.activeFocusSession : normalizedSession;
  const focusSessions = state.focusSessions ?? [];
  const originalArchivedBooks = state.archivedBooks ?? [];
  const normalizedArchive = normalizeItemsForCostumes(
    normalizeLibraryItemDesigns(originalArchivedBooks),
    costumeNormalized.wardrobe,
  );
  let archivedBooks = normalizedArchive.items.map((book, index) => {
    const original = originalArchivedBooks[index];
    return haveSameFields(original, book) ? original : book as ArchivedBook;
  });
  if (archivedBooks.every((book, index) => book === originalArchivedBooks[index])) {
    archivedBooks = originalArchivedBooks;
  }

  const activeShelfId = shelves.some((shelf) => shelf.id === state.activeShelfId)
    ? state.activeShelfId : shelves[0]?.id ?? "";
  const changed =
    shelves !== state.shelves ||
    items !== state.items ||
    tasksChanged ||
    activeShelfId !== state.activeShelfId ||
    selectedFocusItemId !== state.selectedFocusItemId ||
    !areWardrobeStatesEqual(state.wardrobe, normalizedArchive.wardrobe) ||
    state.schemaVersion !== LIBRARY_SCHEMA_VERSION ||
    state.itemDesignVersion !== ITEM_DESIGN_VERSION ||
    state.shelfColumnCount !== GRID_COLUMN_COUNT ||
    state.sideColumnSlotCount !== SIDE_COLUMN_SLOT_COUNT ||
    state.activeFocusSession === undefined ||
    activeFocusSession !== state.activeFocusSession ||
    state.focusSessions === undefined ||
    archivedBooks !== state.archivedBooks;

  if (!changed) {
    return state;
  }

  return {
    ...state,
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    shelves,
    activeShelfId,
    items,
    tasks,
    archivedBooks,
    activeFocusSession,
    focusSessions,
    selectedFocusItemId,
    wardrobe: normalizedArchive.wardrobe,
    itemDesignVersion: ITEM_DESIGN_VERSION,
    shelfColumnCount: GRID_COLUMN_COUNT,
    sideColumnSlotCount: SIDE_COLUMN_SLOT_COUNT,
  };
};
