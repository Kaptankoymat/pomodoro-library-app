import {
  createBookItem,
  createLibraryId,
  DEFAULT_SHELF_ROWS,
  getFirstAvailableSlot,
  getRandomBookColor,
  getRandomBookTitle,
} from "@/lib/libraryInventory";
import { getItemGridSize } from "@/lib/libraryItemDefinitions";
import {
  createItemWithCostume,
  getCostumeGridSize,
} from "@/lib/costumeApplication";
import {
  getCostumesForKind,
  getCostumeDefinition,
  normalizeWardrobeState,
} from "@/lib/libraryCostumeDefinitions";
import type { GridPosition } from "@/lib/gridLogic";
import {
  type FocusRewardSummary,
  type CostumeId,
  type LibraryItem,
  type LibraryShelf,
  type LibraryState,
  type LibraryWardrobeState,
} from "@/types/library";

export const FOCUS_SESSION_SECONDS = 25 * 60;
export const SESSION_XP = 25;
export const DAILY_XP_LIMIT = 200;
export const XP_PER_LEVEL = 100;

export const getTodayKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const getLevelFromXp = (xp: number): number =>
  Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);

export const getXpIntoLevel = (xp: number): number => xp % XP_PER_LEVEL;

const getFocusDropCostumeId = (
  item: LibraryItem,
  wardrobe: LibraryWardrobeState,
  leveledUp: boolean,
  random = Math.random,
) => {
  const unlockedCostumeIds = new Set(wardrobe.unlockedCostumeIds);
  const eligibleCostumes = getCostumesForKind(item.kind).filter(
    (costume) =>
      costume.source === "focus-drop" &&
      !unlockedCostumeIds.has(costume.id) &&
      item.level >= (costume.unlockLevel ?? 1),
  );

  if (eligibleCostumes.length === 0) {
    return undefined;
  }

  const guaranteedVisibleCostume = eligibleCostumes.find(
    (costume) => leveledUp && costume.visibility === "visible",
  );

  if (guaranteedVisibleCostume) {
    return guaranteedVisibleCostume.id;
  }

  if (random() > 0.18) {
    return undefined;
  }

  const weightedCostumes = eligibleCostumes.flatMap((costume) =>
    Array.from({ length: costume.visibility === "secret" ? 1 : 3 }, () => costume),
  );

  return weightedCostumes[Math.floor(random() * weightedCostumes.length)]?.id;
};

export const awardItemXp = (
  item: LibraryItem,
  wardrobe: LibraryWardrobeState,
  xp: number,
  random = Math.random,
): {
  item: LibraryItem;
  wardrobe: LibraryWardrobeState;
  droppedCostumeId?: CostumeId;
  leveledUp: boolean;
} => {
  const nextXp = item.xp + xp;
  const nextLevel = getLevelFromXp(nextXp);
  const leveledUp = nextLevel > item.level;
  const itemWithXp = {
    ...item,
    xp: nextXp,
    level: nextLevel,
  };
  const droppedCostumeId = getFocusDropCostumeId(
    itemWithXp,
    wardrobe,
    leveledUp,
    random,
  );
  const droppedCostume = getCostumeDefinition(droppedCostumeId);
  const nextWardrobe = droppedCostume
    ? {
        ...wardrobe,
        revealedSecretCostumeIds:
          droppedCostume.visibility === "secret"
            ? Array.from(
                new Set([...wardrobe.revealedSecretCostumeIds, droppedCostume.id]),
              )
            : wardrobe.revealedSecretCostumeIds,
        unlockedCostumeIds: Array.from(
          new Set([...wardrobe.unlockedCostumeIds, droppedCostume.id]),
        ),
      }
    : wardrobe;

  return {
    item: itemWithXp,
    wardrobe: nextWardrobe,
    droppedCostumeId,
    leveledUp,
  };
};

export const completeFocusSession = (
  state: LibraryState,
  selectedFocusItemId: string | null,
  random = Math.random,
  date = new Date(),
): {
  state: LibraryState;
  summary: FocusRewardSummary;
} => {
  const todayKey = getTodayKey(date);
  const dailyFocus =
    state.dailyFocus.dateKey === todayKey
      ? state.dailyFocus
      : {
          dateKey: todayKey,
          xp: 0,
        };
  const awardedXp = Math.max(0, Math.min(SESSION_XP, DAILY_XP_LIMIT - dailyFocus.xp));
  const wardrobe = normalizeWardrobeState(state.wardrobe);
  const selectedItem = state.items.find(
    (item) => item.id === selectedFocusItemId && item.kind === "book",
  );

  if (awardedXp === 0) {
    return {
      state: {
        ...state,
        wardrobe,
        dailyFocus: {
          ...dailyFocus,
          xp: dailyFocus.xp,
        },
      },
      summary: {
        awardedXp,
        capped: awardedXp === 0,
      },
    };
  }

  if (selectedItem) {
    const reward = awardItemXp(selectedItem, wardrobe, awardedXp, random);
    const itemsWithReward = state.items.map((item) =>
      item.id === selectedItem.id
        ? {
            ...reward.item,
            lastStudiedAt: date.getTime(),
          }
        : item,
    );
    const droppedCostume = getCostumeDefinition(reward.droppedCostumeId);

    return {
      state: {
        ...state,
        dailyFocus: {
          dateKey: todayKey,
          xp: dailyFocus.xp + awardedXp,
        },
        items: itemsWithReward,
        wardrobe: reward.wardrobe,
      },
      summary: {
        awardedXp,
        capped: dailyFocus.xp + awardedXp >= DAILY_XP_LIMIT,
        droppedCostumeId: reward.droppedCostumeId,
        droppedCostumeName: droppedCostume?.name,
        leveledUpBookTitle:
          reward.leveledUp && reward.item.kind === "book"
            ? reward.item.title
            : undefined,
        leveledUpItemTitle: reward.leveledUp ? reward.item.title : undefined,
      },
    };
  }

  const defaultBookCostume = getCostumeDefinition(wardrobe.defaultCostumeByKind.book);
  const bookSize = defaultBookCostume
    ? getCostumeGridSize("book", defaultBookCostume)
    : getItemGridSize("book");
  let shelves = state.shelves;
  let targetShelf: LibraryShelf | undefined;
  let targetSlot: GridPosition | undefined;

  for (const shelf of shelves) {
    const slot = getFirstAvailableSlot(state.items, shelf, bookSize);

    if (slot) {
      targetShelf = shelf;
      targetSlot = slot;
      break;
    }
  }

  if (!targetShelf || !targetSlot) {
    const newShelf: LibraryShelf = {
      id: createLibraryId("shelf"),
      title: `Shelf ${shelves.length + 1}`,
      rowCount: DEFAULT_SHELF_ROWS,
    };
    shelves = [...shelves, newShelf];
    targetShelf = newShelf;
    targetSlot = {
      row: 0,
      col: 0,
    };
  }

  const addedBookBase = createBookItem({
    id: createLibraryId("book"),
    shelfId: targetShelf.id,
    title: getRandomBookTitle(random),
    position: targetSlot,
    color: getRandomBookColor(random),
  });
  const addedBook = defaultBookCostume
    ? createItemWithCostume(addedBookBase, defaultBookCostume, wardrobe)
    : addedBookBase;

  return {
    state: {
      ...state,
      shelves,
      dailyFocus: {
        dateKey: todayKey,
        xp: dailyFocus.xp + awardedXp,
      },
      activeShelfId: targetShelf.id,
      items: [...state.items, addedBook],
      wardrobe,
    },
    summary: {
      awardedXp,
      capped: dailyFocus.xp + awardedXp >= DAILY_XP_LIMIT,
      addedBookId: addedBook.id,
      addedBookTitle: addedBook.title,
    },
  };
};
