import type { GridItem } from "@/lib/gridLogic";

export type LibraryItemKind = "book" | "plant" | "timer" | "painting" | "sticky";

export type BookSkin = "classic" | "gilded" | "moonlit" | "botanical" | "obsidian";
export type CostumeId = `${LibraryItemKind}:${string}`;
export type CostumeSource = "default" | "focus-drop" | "achievement" | "shop";
export type CostumeVisibility = "visible" | "secret";
export type CostumeAssetMode = "css" | "svg" | "png";
export type DecorPlacement = "shelf" | "left-column" | "right-column";
export type SideColumnPlacement = Exclude<DecorPlacement, "shelf">;

export type LibraryShelf = {
  id: string;
  title: string;
  rowCount: number;
};

export type BaseLibraryItem<TKind extends LibraryItemKind = LibraryItemKind> =
  GridItem<TKind> & {
    shelfId: string;
    title: string;
    color: string;
    xp: number;
    level: number;
    costumeId?: CostumeId;
  };

export type BookItem = BaseLibraryItem<"book"> & {
  note?: string;
  noteUpdatedAt?: number;
  createdAt?: number;
  lastStudiedAt?: number;
  skin?: BookSkin;
  unlockedSkins?: BookSkin[];
};

export type ArchivedBook = BookItem & {
  archivedAt: number;
};

export type TimerItem = BaseLibraryItem<"timer">;

export type DecorItem = BaseLibraryItem<"plant" | "painting" | "sticky"> & {
  placement?: DecorPlacement;
  sideSlot?: number;
};

export type LibraryItem = BookItem | TimerItem | DecorItem;

export type LibraryTask = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
  updatedAt?: number;
  completedAt?: number;
};

export type DailyFocusRecord = {
  dateKey: string;
  xp: number;
};

export type LibraryWardrobeState = {
  unlockedCostumeIds: CostumeId[];
  defaultCostumeByKind: Partial<Record<LibraryItemKind, CostumeId>>;
  tokens: number;
  revealedSecretCostumeIds: CostumeId[];
};

export type ActiveFocusSession = {
  id: string;
  targetBookId: string | null;
  startedAt: number;
  durationSeconds: number;
  status?: "running" | "paused";
  accumulatedSeconds?: number;
  resumedAt?: number;
  pausedAt?: number;
  needsRestart?: boolean;
};

export type LibraryFocusSessionRecord = {
  id: string;
  targetBookId: string | null;
  startedAt: number;
  completedAt: number;
  durationSeconds: number;
  awardedXp: number;
  addedBookId?: string;
  completion?: "completed" | "ended-early";
};

export type LibraryState = {
  schemaVersion?: number;
  shelves: LibraryShelf[];
  items: LibraryItem[];
  archivedBooks?: ArchivedBook[];
  tasks: LibraryTask[];
  activeFocusSession?: ActiveFocusSession | null;
  focusSessions?: LibraryFocusSessionRecord[];
  selectedBookId?: string | null;
  selectedFocusItemId: string | null;
  activeShelfId: string;
  itemDesignVersion?: number;
  shelfColumnCount?: number;
  sideColumnSlotCount?: number;
  wardrobe?: LibraryWardrobeState;
  dailyFocus: DailyFocusRecord;
  focusMode: boolean;
  searchQuery: string;
};

export type FocusRewardSummary = {
  awardedXp: number;
  capped: boolean;
  leveledUpBookTitle?: string;
  leveledUpItemTitle?: string;
  droppedCostumeId?: CostumeId;
  droppedCostumeName?: string;
  droppedSkin?: BookSkin;
  addedBookId?: string;
  addedBookTitle?: string;
};

export const isBookItem = (item: LibraryItem): item is BookItem => item.kind === "book";
