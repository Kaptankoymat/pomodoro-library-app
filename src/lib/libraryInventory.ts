import { findNearestValidSlot, type GridPosition, type GridSize } from "@/lib/gridLogic";
import { createInitialWardrobeState } from "@/lib/libraryCostumeDefinitions";
import {
  getLibraryItemDesign,
  ITEM_DESIGN_VERSION,
} from "@/lib/libraryItemDefinitions";
import {
  isShelfPlacedItem,
  type SideColumnTarget,
} from "@/lib/sideColumnLogic";
import {
  type BookItem,
  type BookSkin,
  type DecorItem,
  type LibraryItem,
  type LibraryItemKind,
  type LibraryShelf,
  type LibraryState,
  type TimerItem,
} from "@/types/library";

export const GRID_COLUMN_COUNT = 28;
export const DEFAULT_SHELF_ROWS = 4;
export const SIDE_COLUMN_SLOT_COUNT = DEFAULT_SHELF_ROWS * 2;
export const LIBRARY_SCHEMA_VERSION = 6;

const bookTitles = [
  "Deep Work",
  "Field Notes",
  "Night Study",
  "Margin Ideas",
  "Quiet Pages",
  "Focus Log",
  "Old Essays",
  "Ink Rituals",
];

const bookColors = [
  "from-rose-800 to-rose-950",
  "from-emerald-800 to-emerald-950",
  "from-indigo-800 to-indigo-950",
  "from-cyan-800 to-cyan-950",
  "from-stone-700 to-stone-950",
  "from-fuchsia-800 to-fuchsia-950",
];

export const createLibraryId = (prefix: string): string => {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
};

export const getRandomBookTitle = (random = Math.random): string =>
  bookTitles[Math.floor(random() * bookTitles.length)];

export const getRandomBookColor = (random = Math.random): string =>
  bookColors[Math.floor(random() * bookColors.length)];

export const createBookItem = (params: {
  id: string;
  shelfId: string;
  title: string;
  position: GridPosition;
  color?: string;
  skin?: BookSkin;
  createdAt?: number;
}): BookItem => {
  const design = getLibraryItemDesign("book");
  const createdAt = params.createdAt ?? Date.now();

  return {
    id: params.id,
    kind: "book",
    title: params.title,
    shelfId: params.shelfId,
    row: params.position.row,
    col: params.position.col,
    widthUnits: design.widthUnits,
    heightUnits: design.heightUnits,
    color: params.color ?? design.color,
    createdAt,
    xp: 0,
    level: 1,
    skin: params.skin ?? "classic",
    unlockedSkins: ["classic"],
  };
};

export const createTimerItem = (params: {
  id: string;
  shelfId: string;
  position: GridPosition;
}): TimerItem => {
  const design = getLibraryItemDesign("timer");

  return {
    id: params.id,
    kind: "timer",
    title: "Focus Timer",
    shelfId: params.shelfId,
    row: params.position.row,
    col: params.position.col,
    widthUnits: design.widthUnits,
    heightUnits: design.heightUnits,
    color: design.color,
    xp: 0,
    level: 1,
  };
};

export const createShelfWithTimer = (params: {
  id?: string;
  index: number;
  title?: string;
}): { shelf: LibraryShelf; timer: TimerItem } => {
  const shelf: LibraryShelf = {
    id: params.id ?? createLibraryId("shelf"),
    title: params.title ?? `Raf ${params.index + 1}`,
    rowCount: DEFAULT_SHELF_ROWS,
  };

  return {
    shelf,
    timer: createTimerItem({
      id: `timer-${shelf.id}`,
      shelfId: shelf.id,
      position: { row: 1, col: 4 },
    }),
  };
};

export const ensureShelfTimers = (
  shelves: LibraryShelf[],
  items: LibraryItem[],
  reservedItemIds: Iterable<string> = [],
): LibraryItem[] => {
  let nextItems = [...items];
  let changed = false;
  const usedIds = new Set([...items.map((item) => item.id), ...reservedItemIds]);

  for (const shelf of shelves) {
    const shelfTimers = nextItems.filter(
      (item): item is TimerItem => item.shelfId === shelf.id && item.kind === "timer",
    );

    if (shelfTimers.length > 1) {
      const keeper = [...shelfTimers].sort(
        (left, right) =>
          Number(Boolean(right.costumeId)) - Number(Boolean(left.costumeId)) ||
          (right.xp ?? 0) - (left.xp ?? 0),
      )[0];
      const mergedKeeper: TimerItem = {
        ...keeper,
        xp: Math.max(...shelfTimers.map((timer) => timer.xp ?? 0)),
        level: Math.max(1, ...shelfTimers.map((timer) => timer.level ?? 1)),
        costumeId:
          keeper.costumeId ?? shelfTimers.find((timer) => timer.costumeId)?.costumeId,
      };
      const duplicateIds = new Set(
        shelfTimers.filter((timer) => timer.id !== keeper.id).map((timer) => timer.id),
      );
      nextItems = nextItems.map((item) =>
        item.id === keeper.id ? mergedKeeper : item,
      ).filter((item) => !duplicateIds.has(item.id));
      changed = true;
      continue;
    }

    if (shelfTimers.length === 1) continue;

    const timerSize = getLibraryItemDesign("timer");
    const position = getFirstAvailableSlot(nextItems, shelf, timerSize) ?? {
      row: 1,
      col: 4,
    };
    const baseId = `timer-${shelf.id}`;
    let timerId = baseId;
    let suffix = 2;
    while (usedIds.has(timerId)) timerId = `${baseId}-${suffix++}`;
    usedIds.add(timerId);
    nextItems.push(
      createTimerItem({
        id: timerId,
        shelfId: shelf.id,
        position,
      }),
    );
    changed = true;
  }

  return changed ? nextItems : items;
};

export const createDecorItem = (params: {
  id: string;
  kind: Exclude<LibraryItemKind, "book" | "timer">;
  shelfId: string;
  title: string;
  position: GridPosition;
  sideTarget?: SideColumnTarget;
}): DecorItem => {
  const design = getLibraryItemDesign(params.kind);

  return {
    id: params.id,
    kind: params.kind,
    title: params.title,
    shelfId: params.shelfId,
    row: params.position.row,
    col: params.position.col,
    placement: params.sideTarget?.placement ?? "shelf",
    sideSlot: params.sideTarget?.sideSlot,
    widthUnits: design.widthUnits,
    heightUnits: design.heightUnits,
    color: design.color,
    xp: 0,
    level: 1,
  };
};

export const getFirstAvailableSlot = (
  items: LibraryItem[],
  shelf: LibraryShelf,
  size: GridSize,
): GridPosition | null =>
  findNearestValidSlot(
    { row: 0, col: 0 },
    size,
    items.filter((item) => item.shelfId === shelf.id && isShelfPlacedItem(item)),
    {
      columnCount: GRID_COLUMN_COUNT,
      rowCount: DEFAULT_SHELF_ROWS,
    },
  );

export const getInitialLibraryState = (): LibraryState => {
  const createdAt = Date.now();
  const { shelf: firstShelf, timer: firstTimer } = createShelfWithTimer({
    id: "shelf-1",
    index: 0,
    title: "Ana Raf",
  });

  return {
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    shelves: [firstShelf],
    archivedBooks: [],
    activeShelfId: firstShelf.id,
    selectedBookId: null,
    selectedFocusItemId: null,
    itemDesignVersion: ITEM_DESIGN_VERSION,
    shelfColumnCount: GRID_COLUMN_COUNT,
    sideColumnSlotCount: SIDE_COLUMN_SLOT_COUNT,
    wardrobe: createInitialWardrobeState(),
    activeFocusSession: null,
    focusSessions: [],
    dailyFocus: {
      dateKey: "",
      xp: 0,
    },
    focusMode: false,
    searchQuery: "",
    tasks: [
      {
        id: "task-1",
        title: "Plan next focus block",
        done: false,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    items: [
      firstTimer,
      createBookItem({
        id: "book-1",
        shelfId: firstShelf.id,
        title: "Deep Work",
        position: { row: 0, col: 0 },
        color: "from-rose-800 to-rose-950",
        createdAt,
      }),
      createBookItem({
        id: "book-2",
        shelfId: firstShelf.id,
        title: "Notes",
        position: { row: 0, col: 1 },
        color: "from-emerald-800 to-emerald-950",
        createdAt,
      }),
      createDecorItem({
        id: "plant",
        kind: "plant",
        shelfId: firstShelf.id,
        title: "Fern",
        position: { row: 0, col: 9 },
      }),
      createDecorItem({
        id: "painting",
        kind: "painting",
        shelfId: firstShelf.id,
        title: "Moon Study",
        position: { row: 2, col: 8 },
        sideTarget: {
          placement: "right-column",
          sideSlot: 2,
        },
      }),
      createDecorItem({
        id: "sticky",
        kind: "sticky",
        shelfId: firstShelf.id,
        title: "Tasks",
        position: { row: 2, col: 3 },
        sideTarget: {
          placement: "left-column",
          sideSlot: 6,
        },
      }),
    ],
  };
};
