"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, type Transition } from "framer-motion";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Flower2,
  Image as ImageIcon,
  Lock,
  Menu,
  Plus,
  Sparkles,
  StickyNote,
  Upload,
  X,
} from "lucide-react";
import { BookNoteDialog } from "@/components/BookNoteDialog";
import { ShelfManagerDialog } from "@/components/ShelfManagerDialog";
import { TimerControlDialog } from "@/components/TimerControlDialog";
import { useGridMetrics } from "@/hooks/useGridMetrics";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { usePomodoroTimer } from "@/hooks/usePomodoroTimer";
import {
  getFocusElapsedSeconds,
  pauseFocusSession,
  startOrResumeFocusSession,
} from "@/lib/focusSession";
import {
  completeNaturalFocusSession,
  endFocusSessionEarly,
} from "@/lib/focusCompletion";
import {
  getResolvedItemPosition,
  gridToPixel,
  pixelToGridTarget,
  resolveDrop,
  resolveResizeLayout,
  validateGridLayout,
} from "@/lib/gridLogic";
import { resolveLibraryShelfDrop } from "@/lib/libraryDrop";
import {
  createItemWithCostume,
  getCostumeGridSize,
  getItemsAfterDefaultCostume,
  setWardrobeDefaultCostume,
  validateDefaultCostumeApplication,
  validateItemCostumeApplication,
  type CostumeApplicationValidation,
  type WardrobeScope,
} from "@/lib/costumeApplication";
import {
  getItemGridSize,
} from "@/lib/libraryItemDefinitions";
import {
  getCostumeDefinition,
  getCostumesForKind,
  getResolvedCostume,
  isCostumeRevealed,
  isCostumeUnlocked,
  normalizeWardrobeState,
  type CostumeDefinition,
} from "@/lib/libraryCostumeDefinitions";
import {
  createBookItem,
  createDecorItem,
  createLibraryId,
  createShelfWithTimer,
  DEFAULT_SHELF_ROWS,
  getFirstAvailableSlot,
  getInitialLibraryState,
  getRandomBookColor,
  getRandomBookTitle,
  GRID_COLUMN_COUNT,
  SIDE_COLUMN_SLOT_COUNT,
} from "@/lib/libraryInventory";
import {
  findAvailableSideSlot,
  getDefaultSideColumnPlacement,
  isShelfPlacedItem,
  isSideColumnEligibleItem,
  isSideColumnPlacedItem,
  resolveSideColumnDrop,
  type SideColumnTarget,
} from "@/lib/sideColumnLogic";
import {
  FOCUS_SESSION_SECONDS,
  getTodayKey,
} from "@/lib/libraryProgression";
import {
  getBookStudyStats,
  getBooks,
} from "@/lib/libraryStats";
import { normalizeLibraryStateForRuntime } from "@/lib/libraryStateMigration";
import {
  applyStickyTaskSize,
  getActiveTasks,
  STICKY_VISIBLE_TASK_LIMIT,
} from "@/lib/stickyTaskLayout";
import {
  isBookItem,
  type ArchivedBook,
  type BookItem,
  type DecorItem,
  type FocusRewardSummary,
  type LibraryItem,
  type LibraryShelf,
  type LibraryState,
  type LibraryTask,
  type LibraryItemKind,
  type CostumeId,
  type LibraryWardrobeState,
  type SideColumnPlacement,
} from "@/types/library";
import type {
  GridMetrics,
  GridPosition,
  GridSize,
  PixelPoint,
} from "@/lib/gridLogic";

const STORAGE_KEY = "pomodoro-library-state-v3";
const DRAG_CLICK_SUPPRESSION_THRESHOLD = 6;
const POST_DROP_VALIDATION_DELAY_MS = 260;
const GRID_MEASUREMENT_EPSILON = 2.5;
const SHELF_BOARD_OFFSET = 16;
const SHELF_BACK_BOARD_HEIGHT = 26;
const SHELF_FRONT_LIP_HEIGHT = 22;
const SHELF_VISUAL_CLEARANCE = 14;
const SHELF_VISUAL_ROW_GAP = 18;

const springTransition: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 42,
  mass: 0.82,
};

const immediateTransition: Transition = {
  duration: 0,
};

const formatTimer = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const getEffectiveShelfRowCount = (): number => DEFAULT_SHELF_ROWS;

const getShelfMetrics = () => ({
  columnCount: GRID_COLUMN_COUNT,
  rowCount: getEffectiveShelfRowCount(),
});

const getShelfBoardTop = (row: number, metrics: GridMetrics): number =>
  row * (metrics.cellHeight + metrics.gap) +
  metrics.cellHeight -
  SHELF_BOARD_OFFSET +
  SHELF_VISUAL_CLEARANCE +
  row * SHELF_VISUAL_ROW_GAP;

const getShelfVisualRowOffset = (row: number): number =>
  row * SHELF_VISUAL_ROW_GAP;

const getShelfVisualHeight = (metrics: GridMetrics): number =>
  metrics.height +
  SHELF_VISUAL_CLEARANCE +
  Math.max(0, metrics.rowCount - 1) * SHELF_VISUAL_ROW_GAP;

const getGridYFromShelfVisualY = (visualY: number, metrics: GridMetrics): number => {
  const visualRowStep = metrics.cellHeight + metrics.gap + SHELF_VISUAL_ROW_GAP;
  const estimatedRow = Math.min(
    metrics.rowCount - 1,
    Math.max(0, Math.round(visualY / visualRowStep)),
  );

  return visualY - SHELF_VISUAL_CLEARANCE - getShelfVisualRowOffset(estimatedRow);
};

const getShelfItemsWithTimer = (
  items: LibraryItem[],
  shelf: LibraryShelf,
): LibraryItem[] => items.filter((item) => item.shelfId === shelf.id);

const toItemStyle = (
  item: LibraryItem,
  metrics: GridMetrics,
  options: { includeAlignmentOffset?: boolean } = {},
) => {
  const { includeAlignmentOffset = true } = options;
  const heightReduction = 0;
  const rawWidth =
    item.widthUnits * metrics.cellWidth + (item.widthUnits - 1) * metrics.gap;
  const rawHeight =
    item.heightUnits * metrics.cellHeight + (item.heightUnits - 1) * metrics.gap;
  const occupiedRows = Math.ceil(item.heightUnits);
  const fullCellHeight = occupiedRows * metrics.cellHeight + (occupiedRows - 1) * metrics.gap;
  const bottomAlignOffset = fullCellHeight - rawHeight;
  const baseHeight = rawHeight - heightReduction;
  const minTimerWidth = item.kind === "timer" ? 138 : 0;
  const minTimerHeight = item.kind === "timer" ? 44 : 0;
  const visualWidth = Math.max(rawWidth, minTimerWidth);
  const visualHeight = Math.max(baseHeight, minTimerHeight);
  const extraVisualHeight = Math.max(0, visualHeight - baseHeight);
  const extraVisualWidth = Math.max(0, visualWidth - rawWidth);
  const visualStyle = {
    width: visualWidth,
    height: visualHeight,
  };

  return includeAlignmentOffset
    ? {
        ...visualStyle,
        marginLeft: extraVisualWidth ? -extraVisualWidth / 2 : undefined,
        marginTop: heightReduction + bottomAlignOffset - extraVisualHeight,
      }
    : visualStyle;
};

const getDraggedGridPosition = (params: {
  currentPosition: GridPosition;
  grabOffset: PixelPoint;
  gridElement: HTMLElement | null;
  pointer: PixelPoint;
  size: GridSize;
  metrics: GridMetrics;
}): GridPosition => {
  if (!params.gridElement) {
    return params.currentPosition;
  }

  const gridRect = params.gridElement.getBoundingClientRect();
  const visualY = params.pointer.y - gridRect.top - params.grabOffset.y;
  const point = {
    x: params.pointer.x - gridRect.left - params.grabOffset.x,
    y: getGridYFromShelfVisualY(visualY, params.metrics),
  };

  return pixelToGridTarget(point, params.size, params.metrics).position;
};

const hasPointerMovedEnoughToDrag = (
  startPoint: PixelPoint | null,
  currentPoint: PixelPoint,
): boolean => {
  if (!startPoint) {
    return false;
  }

  const deltaX = currentPoint.x - startPoint.x;
  const deltaY = currentPoint.y - startPoint.y;

  return Math.hypot(deltaX, deltaY) >= DRAG_CLICK_SUPPRESSION_THRESHOLD;
};

const getSideSlotTop = (
  sideSlot: number,
  columnHeight: number,
  itemHeight: number,
): number => {
  const slotHeight = columnHeight / SIDE_COLUMN_SLOT_COUNT;
  const centeredTop = sideSlot * slotHeight + (slotHeight - itemHeight) / 2;

  return Math.round(
    Math.max(0, Math.min(columnHeight - itemHeight, centeredTop)),
  );
};

const getSideItemStyle = (item: LibraryItem, columnWidth: number) => {
  const maxWidth = item.kind === "painting" ? 74 : item.kind === "sticky" ? 76 : 64;
  const minWidth = item.kind === "painting" ? 44 : item.kind === "sticky" ? 46 : 38;
  const widthMultiplier =
    item.kind === "painting" ? 0.74 : item.kind === "sticky" ? 0.72 : 0.62;
  const width = Math.round(
    Math.max(minWidth, Math.min(maxWidth, columnWidth * widthMultiplier)),
  );
  const maxHeight = item.kind === "painting" ? 58 : item.kind === "sticky" ? 78 : 66;
  const minHeight = item.kind === "painting" ? 32 : item.kind === "sticky" ? 52 : 42;
  const heightMultiplier =
    item.kind === "painting" ? 0.56 : item.kind === "sticky" ? 0.78 : 0.7;
  const height = Math.round(
    Math.max(minHeight, Math.min(maxHeight, columnWidth * heightMultiplier)),
  );

  return {
    width,
    height,
  };
};

const getSideColumnTargetFromPointer = (params: {
  leftElement: HTMLElement | null;
  pointer: PixelPoint;
  rightElement: HTMLElement | null;
}): SideColumnTarget | null => {
  const candidates: Array<{
    element: HTMLElement | null;
    placement: SideColumnPlacement;
  }> = [
    {
      element: params.leftElement,
      placement: "left-column",
    },
    {
      element: params.rightElement,
      placement: "right-column",
    },
  ];

  for (const candidate of candidates) {
    if (!candidate.element) {
      continue;
    }

    const rect = candidate.element.getBoundingClientRect();

    if (rect.height <= 0) {
      continue;
    }

    const isInside =
      params.pointer.x >= rect.left &&
      params.pointer.x <= rect.right &&
      params.pointer.y >= rect.top &&
      params.pointer.y <= rect.bottom;

    if (!isInside) {
      continue;
    }

    const localY = params.pointer.y - rect.top;
    const slotHeight = rect.height / SIDE_COLUMN_SLOT_COUNT;
    const sideSlot = Math.min(
      SIDE_COLUMN_SLOT_COUNT - 1,
      Math.max(0, Math.floor(localY / slotHeight)),
    );

    return {
      placement: candidate.placement,
      sideSlot,
    };
  }

  return null;
};

const getItemClasses = (
  item: LibraryItem,
  positionClass = "absolute",
): string => {
  const base =
    `${positionClass} left-0 top-0 flex touch-none select-none items-center justify-center overflow-visible outline-none`;

  if (item.kind === "timer") {
    return `${base} rounded-[6px] border-[3px] border-[#5a321c] bg-gradient-to-br from-[#8f5a30] to-[#4a2817] text-amber-100 shadow-[inset_0_2px_4px_rgba(255,255,255,0.16),0_4px_8px_rgba(0,0,0,0.36)] ring-1 ring-[#b17a45]/55`;
  }

  if (item.kind === "painting") {
    return `${base}`;
  }

  if (item.kind === "sticky") {
    return `${base} rounded-[1px] bg-[#f4d760] text-stone-800 shadow-[2px_6px_8px_rgba(0,0,0,0.2)]`;
  }

  if (item.kind === "plant") {
    return `${base}`;
  }

  return `${base} shadow-sm transition-shadow hover:shadow-md border border-[#c5b49e]/80 bg-gradient-to-b rounded-[4px] text-[#3e3225]`;
};

const getShelfItemSlot = (
  items: LibraryItem[],
  shelves: LibraryShelf[],
  activeShelf: LibraryShelf,
  size: GridSize,
) => {
  const activeSlot = getFirstAvailableSlot(items, activeShelf, size);

  if (activeSlot) {
    return {
      newItems: [] as LibraryItem[],
      shelves,
      shelf: activeShelf,
      position: activeSlot,
    };
  }

  const { shelf: newShelf, timer } = createShelfWithTimer({
    index: shelves.length,
  });
  const position = getFirstAvailableSlot([timer], newShelf, size) ?? {
    row: 0,
    col: 0,
  };

  return {
    newItems: [timer] as LibraryItem[],
    shelves: [...shelves, newShelf],
    shelf: newShelf,
    position,
  };
};

const replaceShelfItems = (
  state: LibraryState,
  shelfId: string,
  shelfItems: LibraryItem[],
): LibraryState => ({
  ...state,
  items: (() => {
    const nextItemsById = new Map(shelfItems.map((item) => [item.id, item]));
    const existingItemIds = new Set(state.items.map((item) => item.id));
    const updatedItems = state.items.map((item) => nextItemsById.get(item.id) ?? item);
    const addedItems = shelfItems.filter((item) => !existingItemIds.has(item.id));

    return [...updatedItems, ...addedItems].map((item) =>
      item.shelfId === shelfId && nextItemsById.has(item.id)
        ? nextItemsById.get(item.id) ?? item
        : item,
    );
  })(),
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

type ShelfSceneProps = {
  shelf: LibraryShelf;
  items: LibraryItem[];
  tasks: LibraryTask[];
  timerText: string;
  isTimerRunning: boolean;
  selectedFocusBookTitle: string | null;
  wardrobe: LibraryWardrobeState;
  isWardrobeMode: boolean;
  isFocusTargetSelectionMode: boolean;
  selectedFocusBookId: string | null;
  selectedWardrobeItemId: string | null;
  wardrobePreview: PlacementPreview | null;
  onMoveItem: (shelf: LibraryShelf, itemId: string, position: GridPosition) => void;
  onMoveSideItem: (
    shelf: LibraryShelf,
    itemId: string,
    target: SideColumnTarget,
  ) => void;
  onOpenBook: (bookId: string) => void;
  onOpenTimer: () => void;
  onOpenTasks: () => void;
  onSelectFocusBook: (bookId: string) => void;
  onSelectWardrobeItem: (itemId: string) => void;
  children?: React.ReactNode;
  topRightActions?: React.ReactNode;
};

type PlacementPreview = GridPosition &
  GridSize & {
    itemId: string;
    state: "move" | "swap" | "blocked";
  };
type SidePlacementPreview = SideColumnTarget & {
  itemId: string;
  state: "move" | "swap" | "blocked";
};

type DragSession = {
  itemId: string;
  grabOffset: PixelPoint;
};

type ActiveDrag = DragSession & {
  item: LibraryItem;
  pointer: PixelPoint;
  pointerId: number;
};

const LibraryItemContent = ({
  costume,
  item,
  tasks = [],
  timerText = "25:00",
  isTimerRunning = false,
  selectedFocusBookTitle = null,
}: {
  costume: CostumeDefinition;
  item: LibraryItem;
  tasks?: LibraryTask[];
  timerText?: string;
  isTimerRunning?: boolean;
  selectedFocusBookTitle?: string | null;
}) => {
  const [timerMinutes = "25", timerSeconds = "00"] = timerText.split(":");

  return (
  <>
    {costume.assetMode === "png" && costume.pngSrc ? (
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] bg-contain bg-center bg-no-repeat opacity-90"
        style={{
          backgroundImage: `url(${costume.pngSrc})`,
          imageRendering: costume.pixelated ? "pixelated" : "auto",
        }}
      />
    ) : null}

    {isBookItem(item) && item.note ? (
      <span
        aria-hidden
        className="absolute -top-2 right-2 h-7 w-3 rounded-t-[2px] bg-amber-300 shadow-lg shadow-black/30"
        style={{
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)",
        }}
      />
    ) : null}

    {item.kind === "timer" ? (
      <span
        className={`relative flex h-full w-full items-center justify-between px-2.5 sm:px-3 overflow-hidden rounded-[4px] border-b-[3px] border-[#2b180d] bg-[#5c3826] shadow-[0_6px_12px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.15)] ${costume.contentClassName ?? ""}`}
      >
        {/* Left Side: Digital Display (Retro LED) */}
        <span className="flex h-[32px] items-center justify-center rounded-[3px] border-[2px] border-[#22120a] bg-[#0c0704] px-2 shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)]">
          <span className="font-mono text-lg sm:text-[22px] font-bold tracking-widest text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]">
            {timerMinutes}:{timerSeconds}
          </span>
        </span>

        {/* Right Side: Info & Indicator */}
        <span className="flex h-[32px] min-w-0 flex-1 flex-col items-end justify-center gap-[2px] ml-2">
          <span className="w-full truncate text-right text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#e6cdb3] drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
            {selectedFocusBookTitle ?? "Yeni kitap"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[8px] uppercase font-bold tracking-widest text-[#a67b5b]">OdaK</span>
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full border border-[#22120a] ${
                isTimerRunning
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                  : "bg-rose-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
              }`}
            />
          </span>
        </span>
      </span>
    ) : null}

    {item.kind === "book" ? (
      <span className={`relative flex h-full w-full justify-center overflow-hidden rounded-[2px] ${costume.contentClassName ?? ""}`}>
        <span className="absolute top-2 h-1.5 w-full border-y border-yellow-600/40" />
        <span className="absolute bottom-2 h-1.5 w-full border-y border-yellow-600/40" />
        <span
          className="mt-3 block max-h-full overflow-hidden whitespace-nowrap px-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-50/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] [writing-mode:vertical-rl]"
          title={item.title}
        >
          {item.title}
        </span>
      </span>
    ) : null}

    {item.kind === "plant" ? (
      <span className={`relative flex h-full w-full items-end justify-center pb-0.5 ${costume.contentClassName ?? ""}`}>
        <span className="relative flex h-[80%] w-[85%] flex-col items-center justify-end">
          {/* Stem */}
          <span className="absolute bottom-[42%] left-1/2 h-[30%] w-[3px] -translate-x-1/2 bg-[#3d7a2a] shadow-[0_0_2px_rgba(0,0,0,0.3)]" />
          {/* Main leaves - rosette pattern */}
          <span className="absolute -top-[2px] left-1/2 -translate-x-1/2">
            {/* Center bud */}
            <span className="absolute left-1/2 -translate-x-1/2 -top-[1px] h-3 w-3 rounded-full bg-[radial-gradient(circle_at_40%_35%,#6ee7b7,#059669)] shadow-[0_1px_3px_rgba(0,0,0,0.3)]" />
            {/* Left leaf */}
            <span className="absolute -left-[8px] top-[2px] h-5 w-3 -rotate-[30deg] rounded-[50%] bg-[radial-gradient(circle_at_30%_30%,#4ade80,#166534)] shadow-[0_1px_3px_rgba(0,0,0,0.25)]" />
            {/* Right leaf */}
            <span className="absolute -right-[8px] top-[2px] h-5 w-3 rotate-[30deg] rounded-[50%] bg-[radial-gradient(circle_at_70%_30%,#86efac,#15803d)] shadow-[0_1px_3px_rgba(0,0,0,0.25)]" />
            {/* Far left leaf */}
            <span className="absolute -left-[12px] top-[8px] h-4 w-2.5 -rotate-[55deg] rounded-[50%] bg-[radial-gradient(circle_at_30%_30%,#22c55e,#064e3b)] shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />
            {/* Far right leaf */}
            <span className="absolute -right-[12px] top-[8px] h-4 w-2.5 rotate-[55deg] rounded-[50%] bg-[radial-gradient(circle_at_70%_30%,#a7f3d0,#047857)] shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />
            {/* Tiny flower */}
            <span className="absolute -right-[3px] -top-[5px] h-2 w-2 rounded-full bg-[radial-gradient(circle,#fbbf24,#f59e0b)] shadow-[0_0_4px_rgba(251,191,36,0.5)]" />
          </span>
          {/* Pot - rounded terracotta */}
          <span className="relative z-10 flex h-[48%] w-[90%] flex-col items-center">
            {/* Pot rim */}
            <span className="h-[18%] w-full rounded-t-[3px] bg-[linear-gradient(180deg,#d4845a_0%,#c06a3a_100%)] shadow-[0_1px_0_rgba(0,0,0,0.2)]" />
            {/* Pot body */}
            <span className="h-[82%] w-[88%] rounded-b-[8px] bg-[linear-gradient(180deg,#b85c38_0%,#8b4513_60%,#6b3410_100%)] shadow-[inset_0_-3px_6px_rgba(0,0,0,0.4),0_4px_6px_rgba(0,0,0,0.4)]" />
          </span>
        </span>
      </span>
    ) : null}

    {item.kind === "painting" ? (
      <span
        className={`relative mr-[6px] flex h-full w-[calc(100%-6px)] items-center justify-center rounded-[3px] p-[6px] shadow-[0_8px_16px_rgba(0,0,0,0.6)] ring-1 ring-[#5e4315]/80 ${costume.frameClassName ?? ""}`}
        style={{ backgroundImage: "url(/wood_texture.png)", backgroundSize: "150px" }}
      >
        <span className="absolute inset-0 rounded-[3px] bg-black/20" />
        <span
          className={`relative h-full w-full rounded-[1px] bg-cover bg-center shadow-[inset_0_0_12px_rgba(0,0,0,0.6),0_0_4px_rgba(0,0,0,0.8)] ${costume.contentClassName ?? ""}`}
          style={{
            backgroundImage:
              parseInt(item.id.replace(/\D/g, "") || "0", 10) % 2 === 0
                ? "url(/vintage_landscape_1.png)"
                : "url(/vintage_landscape_2.png)",
          }}
        />
      </span>
    ) : null}

    {item.kind === "sticky" ? (
      <span className={`relative flex h-full w-full flex-col items-center justify-center gap-1 p-2 ${costume.contentClassName ?? ""}`}>
        <span className="absolute bottom-0 right-0 border-b-[10px] border-l-[10px] border-b-transparent border-l-[#d4b943] opacity-80" />
        <span className="absolute left-1/2 top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-red-800 bg-red-600 shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)]" />
        {getActiveTasks(tasks).length > 0 ? (
          <span className="mt-3 grid w-full gap-0.5 overflow-hidden px-1 text-left">
            {getActiveTasks(tasks)
              .slice(
                0,
                Math.min(
                  Math.max(3, Math.ceil(item.heightUnits) * 3),
                  STICKY_VISIBLE_TASK_LIMIT,
                ),
              )
              .map((task) => (
                <span
                  key={task.id}
                  className="truncate font-serif text-[9px] font-bold leading-tight text-[#4a3b2c]"
                >
                  {task.title}
                </span>
              ))}
            {getActiveTasks(tasks).length >
            Math.min(
              Math.max(3, Math.ceil(item.heightUnits) * 3),
              STICKY_VISIBLE_TASK_LIMIT,
            ) ? (
              <span className="text-center text-[9px] font-bold text-[#6e5c47]">
                +
                {getActiveTasks(tasks).length -
                  Math.min(
                    Math.max(3, Math.ceil(item.heightUnits) * 3),
                    STICKY_VISIBLE_TASK_LIMIT,
                  )}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="mt-3 w-full -rotate-3 truncate px-1 text-center font-serif text-[12px] font-bold leading-tight text-[#4a3b2c]">
            {item.title}
          </span>
        )}
      </span>
    ) : null}
  </>
  );
};

const ShelfScene = ({
  shelf,
  items,
  tasks,
  timerText,
  isTimerRunning,
  selectedFocusBookTitle,
  wardrobe,
  isWardrobeMode,
  isFocusTargetSelectionMode,
  selectedFocusBookId,
  selectedWardrobeItemId,
  wardrobePreview,
  onMoveItem,
  onMoveSideItem,
  onOpenBook,
  onOpenTimer,
  onOpenTasks,
  onSelectFocusBook,
  onSelectWardrobeItem,
  children,
  topRightActions,
}: ShelfSceneProps) => {
  const { containerRef, metrics, isResizing } = useGridMetrics<HTMLDivElement>({
    columnCount: GRID_COLUMN_COUNT,
    rowCount: getEffectiveShelfRowCount(),
    minCellWidth: 41,
    maxCellWidth: 73,
    gap: 8,
    cellAspectRatio: 3.36,
    measurementEpsilon: GRID_MEASUREMENT_EPSILON,
  });
  const suppressObjectOpenRef = useRef(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const leftSideColumnRef = useRef<HTMLDivElement | null>(null);
  const rightSideColumnRef = useRef<HTMLDivElement | null>(null);
  const activeDragRef = useRef<ActiveDrag | null>(null);
  const pendingDragRef = useRef<ActiveDrag | null>(null);
  const pointerStartRef = useRef<PixelPoint | null>(null);
  const previewKeyRef = useRef<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [placementPreview, setPlacementPreview] = useState<PlacementPreview | null>(
    null,
  );
  const [sidePlacementPreview, setSidePlacementPreview] =
    useState<SidePlacementPreview | null>(null);
  const [sideColumnSize, setSideColumnSize] = useState({
    width: 96,
    height: metrics.height,
  });
  const shelfItems = useMemo(() => items.filter(isShelfPlacedItem), [items]);
  const sideColumnItems = useMemo(
    () => items.filter(isSideColumnPlacedItem),
    [items],
  );
  const renderedItems = useMemo(
    () => resolveResizeLayout(shelfItems, metrics),
    [shelfItems, metrics],
  );
  const previewPoint = placementPreview
    ? gridToPixel(placementPreview, metrics)
    : null;
  const ghostPoint = activeDrag
    ? {
        x: activeDrag.pointer.x - activeDrag.grabOffset.x,
        y: activeDrag.pointer.y - activeDrag.grabOffset.y,
      }
    : null;
  const activeDragSkinClass =
    activeDrag ? getResolvedCostume(activeDrag.item, wardrobe).className : "";

  useEffect(() => {
    const sideColumnElement =
      leftSideColumnRef.current ?? rightSideColumnRef.current;

    if (!sideColumnElement) {
      return;
    }

    const updateSideColumnSize = () => {
      const rect = sideColumnElement.getBoundingClientRect();
      const nextSize = {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };

      setSideColumnSize((currentSize) => {
        const widthChanged =
          Math.abs(currentSize.width - nextSize.width) >= GRID_MEASUREMENT_EPSILON;
        const heightChanged =
          Math.abs(currentSize.height - nextSize.height) >= GRID_MEASUREMENT_EPSILON;

        return widthChanged || heightChanged ? nextSize : currentSize;
      });
    };
    const observer = new ResizeObserver(updateSideColumnSize);

    updateSideColumnSize();
    observer.observe(sideColumnElement);

    return () => observer.disconnect();
  }, [metrics.height]);

  const releaseObjectOpenSuppression = useCallback(() => {
    window.setTimeout(() => {
      suppressObjectOpenRef.current = false;
    }, 140);
  }, []);

  const setActiveDragSnapshot = useCallback((drag: ActiveDrag | null) => {
    activeDragRef.current = drag;
    setActiveDrag(drag);
  }, []);

  const clearDragState = useCallback(() => {
    activeDragRef.current = null;
    pendingDragRef.current = null;
    pointerStartRef.current = null;
    previewKeyRef.current = null;
    setActiveDrag(null);
    setPlacementPreview(null);
    setSidePlacementPreview(null);
  }, []);

  const resolveDragPreview = useCallback(
    (item: LibraryItem, pointer: PixelPoint, grabOffset: PixelPoint) => {
      const resolutionItems = isShelfPlacedItem(item)
        ? renderedItems
        : [
            ...renderedItems,
            {
              ...item,
              placement: "shelf" as const,
              sideSlot: undefined,
            },
          ];
      const target = getDraggedGridPosition({
        currentPosition: item,
        grabOffset,
        gridElement: gridRef.current,
        pointer,
        size: item,
        metrics,
      });
      const resolution = resolveDrop(
        item.id,
        target,
        resolutionItems,
        getShelfMetrics(),
        {
          canSwap: (draggedItem, targetItem) =>
            isBookItem(draggedItem) && isBookItem(targetItem),
        },
      );
      const state: PlacementPreview["state"] =
        resolution.type === "snap-back" ? "blocked" : resolution.type;
      const resolvedPosition =
        getResolvedItemPosition(item.id, resolution) ?? {
          row: item.row,
          col: item.col,
        };
      const previewKey = `${item.id}:${resolvedPosition.row}:${resolvedPosition.col}:${state}`;

      if (previewKeyRef.current !== previewKey) {
        previewKeyRef.current = previewKey;
        setSidePlacementPreview(null);
        setPlacementPreview({
          itemId: item.id,
          row: resolvedPosition.row,
          col: resolvedPosition.col,
          widthUnits: item.widthUnits,
          heightUnits: item.heightUnits,
          state,
        });
      }

      return target;
    },
    [metrics, renderedItems],
  );

  const getSideColumnTarget = useCallback(
    (pointer: PixelPoint): SideColumnTarget | null =>
      getSideColumnTargetFromPointer({
        leftElement: leftSideColumnRef.current,
        pointer,
        rightElement: rightSideColumnRef.current,
      }),
    [],
  );

  const resolveSideDragPreview = useCallback(
    (item: LibraryItem, target: SideColumnTarget): boolean => {
      const resolution = resolveSideColumnDrop(
        item.id,
        target,
        items,
        SIDE_COLUMN_SLOT_COUNT,
      );
      const state: SidePlacementPreview["state"] =
        resolution.type === "snap-back" ? "blocked" : resolution.type;
      const previewKey = `${item.id}:${target.placement}:${target.sideSlot}:${state}`;

      if (previewKeyRef.current !== previewKey) {
        previewKeyRef.current = previewKey;
        setPlacementPreview(null);
        setSidePlacementPreview({
          itemId: item.id,
          placement: target.placement,
          sideSlot: target.sideSlot,
          state,
        });
      }

      return isSideColumnEligibleItem(item);
    },
    [items],
  );

  const updateDragFromPointer = useCallback(
    (pointer: PixelPoint, pointerId?: number) => {
      const pendingDrag = pendingDragRef.current;

      if (
        !pendingDrag ||
        (pointerId !== undefined && pendingDrag.pointerId !== pointerId)
      ) {
        return;
      }

      if (
        !activeDragRef.current &&
        !hasPointerMovedEnoughToDrag(pointerStartRef.current, pointer)
      ) {
        return;
      }

      suppressObjectOpenRef.current = true;
      setActiveDragSnapshot({
        ...pendingDrag,
        pointer,
      });

      const sideTarget = getSideColumnTarget(pointer);

      if (sideTarget) {
        resolveSideDragPreview(pendingDrag.item, sideTarget);
        return;
      }

      resolveDragPreview(pendingDrag.item, pointer, pendingDrag.grabOffset);
    },
    [
      getSideColumnTarget,
      resolveDragPreview,
      resolveSideDragPreview,
      setActiveDragSnapshot,
    ],
  );

  const finishDragFromPointer = useCallback(
    (pointer: PixelPoint, pointerId?: number): boolean => {
      const pendingDrag = pendingDragRef.current;

      if (
        !pendingDrag ||
        (pointerId !== undefined && pendingDrag.pointerId !== pointerId)
      ) {
        return false;
      }

      const wasDragging =
        activeDragRef.current?.itemId === pendingDrag.itemId ||
        hasPointerMovedEnoughToDrag(pointerStartRef.current, pointer);

      if (!wasDragging) {
        pendingDragRef.current = null;
        pointerStartRef.current = null;
        return false;
      }

      suppressObjectOpenRef.current = true;
      const sideTarget = getSideColumnTarget(pointer);

      if (sideTarget) {
        resolveSideDragPreview(pendingDrag.item, sideTarget);

        if (isSideColumnEligibleItem(pendingDrag.item)) {
          onMoveSideItem(shelf, pendingDrag.itemId, sideTarget);
        }

        clearDragState();
        releaseObjectOpenSuppression();
        return true;
      }

      const target = resolveDragPreview(
        pendingDrag.item,
        pointer,
        pendingDrag.grabOffset,
      );

      onMoveItem(shelf, pendingDrag.itemId, target);
      clearDragState();
      releaseObjectOpenSuppression();

      return true;
    },
    [
      clearDragState,
      getSideColumnTarget,
      onMoveItem,
      onMoveSideItem,
      releaseObjectOpenSuppression,
      resolveDragPreview,
      resolveSideDragPreview,
      shelf,
    ],
  );

  const cancelDrag = useCallback(() => {
    if (!pendingDragRef.current && !activeDragRef.current) {
      return;
    }

    clearDragState();
    releaseObjectOpenSuppression();
  }, [clearDragState, releaseObjectOpenSuppression]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      updateDragFromPointer(
        {
          x: event.clientX,
          y: event.clientY,
        },
        event.pointerId,
      );
    };

    const handlePointerUp = (event: PointerEvent) => {
      finishDragFromPointer(
        {
          x: event.clientX,
          y: event.clientY,
        },
        event.pointerId,
      );
    };

    const handleMouseMove = (event: MouseEvent) => {
      updateDragFromPointer({
        x: event.clientX,
        y: event.clientY,
      });
    };

    const handleMouseUp = (event: MouseEvent) => {
      finishDragFromPointer({
        x: event.clientX,
        y: event.clientY,
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", cancelDrag);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", cancelDrag);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [cancelDrag, finishDragFromPointer, updateDragFromPointer]);

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-[98vw] items-end justify-center px-2 pt-16 sm:max-w-[95vw] sm:px-4 sm:pt-20">
      <div className="relative flex h-full w-full rounded-t-[6px] rounded-b-none bg-[#8a5a35] shadow-[0_20px_40px_rgba(55,30,17,0.28)]">
        {/* Left Pillar */}
        <div 
          className="absolute left-[-26px] sm:left-[-32px] top-0 bottom-0 w-[108px] sm:w-[144px] z-20 pointer-events-none shadow-[inset_-6px_0_16px_rgba(72,39,21,0.36),inset_2px_0_4px_rgba(255,232,190,0.24),6px_0_16px_rgba(55,30,17,0.24)] border-r-2 border-l border-[#6a3b20]"
          style={{ backgroundColor: '#7a4828', backgroundImage: 'url(/lofi_pillar_wood.png)', backgroundSize: '100% 100%', backgroundBlendMode: 'multiply' }}
        >
          <div className="absolute left-3 right-3 top-0 bottom-0 border-x border-[#6a3b20]/55 shadow-[inset_2px_0_8px_rgba(72,39,21,0.16)] bg-[#a66b3b]/10" />
          <div className="absolute left-[35%] right-[35%] top-0 bottom-0 border-x border-[#6a3b20]/35 shadow-[inset_1px_0_4px_rgba(72,39,21,0.1)] bg-[#f2c078]/5" />
          
          {/* Pillar Capital (Top layers) */}
          <div className="absolute top-[38px] left-[-14px] right-[-14px] flex flex-col items-center z-10">
            <div className="w-full h-4 border-y border-[#6a3b20] shadow-[0_2px_4px_rgba(72,39,21,0.34)] rounded-sm"
                 style={{ backgroundColor: '#87522f', backgroundImage: 'url(/lofi_pillar_wood.png)', backgroundSize: '100% 100%', backgroundBlendMode: 'multiply' }} />
            <div className="w-[calc(100%-8px)] h-3 border-b border-[#6a3b20] shadow-[0_2px_4px_rgba(72,39,21,0.24)] rounded-b-sm"
                 style={{ backgroundColor: '#87522f', backgroundImage: 'url(/lofi_pillar_wood.png)', backgroundSize: '100% 100%', backgroundBlendMode: 'multiply' }} />
            <div className="w-[calc(100%-16px)] h-3 border-b border-[#6a3b20] shadow-[0_2px_4px_rgba(72,39,21,0.24)] rounded-b-sm"
                 style={{ backgroundColor: '#87522f', backgroundImage: 'url(/lofi_pillar_wood.png)', backgroundSize: '100% 100%', backgroundBlendMode: 'multiply' }} />
            <div className="w-[calc(100%-24px)] h-4 border-b border-[#6a3b20] shadow-[0_2px_8px_rgba(72,39,21,0.34)] rounded-b-sm bg-gradient-to-b from-transparent to-[#5a321c]/18"
                 style={{ backgroundColor: '#87522f', backgroundImage: 'url(/lofi_pillar_wood.png)', backgroundSize: '100% 100%', backgroundBlendMode: 'multiply' }} />
          </div>
        </div>

        {/* Right Pillar */}
        <div 
          className="absolute right-[-26px] sm:right-[-32px] top-0 bottom-0 w-[108px] sm:w-[144px] z-20 pointer-events-none shadow-[inset_6px_0_16px_rgba(72,39,21,0.36),inset_-2px_0_4px_rgba(255,232,190,0.24),-6px_0_16px_rgba(55,30,17,0.24)] border-l-2 border-r border-[#6a3b20]"
          style={{ backgroundColor: '#7a4828', backgroundImage: 'url(/lofi_pillar_wood.png)', backgroundSize: '100% 100%', backgroundBlendMode: 'multiply' }}
        >
          <div className="absolute left-3 right-3 top-0 bottom-0 border-x border-[#6a3b20]/55 shadow-[inset_2px_0_8px_rgba(72,39,21,0.16)] bg-[#a66b3b]/10" />
          <div className="absolute left-[35%] right-[35%] top-0 bottom-0 border-x border-[#6a3b20]/35 shadow-[inset_1px_0_4px_rgba(72,39,21,0.1)] bg-[#f2c078]/5" />

          {/* Pillar Capital (Top layers) */}
          <div className="absolute top-[38px] left-[-14px] right-[-14px] flex flex-col items-center z-10">
            <div className="w-full h-4 border-y border-[#6a3b20] shadow-[0_2px_4px_rgba(72,39,21,0.34)] rounded-sm"
                 style={{ backgroundColor: '#87522f', backgroundImage: 'url(/lofi_pillar_wood.png)', backgroundSize: '100% 100%', backgroundBlendMode: 'multiply' }} />
            <div className="w-[calc(100%-8px)] h-3 border-b border-[#6a3b20] shadow-[0_2px_4px_rgba(72,39,21,0.24)] rounded-b-sm"
                 style={{ backgroundColor: '#87522f', backgroundImage: 'url(/lofi_pillar_wood.png)', backgroundSize: '100% 100%', backgroundBlendMode: 'multiply' }} />
            <div className="w-[calc(100%-16px)] h-3 border-b border-[#6a3b20] shadow-[0_2px_4px_rgba(72,39,21,0.24)] rounded-b-sm"
                 style={{ backgroundColor: '#87522f', backgroundImage: 'url(/lofi_pillar_wood.png)', backgroundSize: '100% 100%', backgroundBlendMode: 'multiply' }} />
            <div className="w-[calc(100%-24px)] h-4 border-b border-[#6a3b20] shadow-[0_2px_8px_rgba(72,39,21,0.34)] rounded-b-sm bg-gradient-to-b from-transparent to-[#5a321c]/18"
                 style={{ backgroundColor: '#87522f', backgroundImage: 'url(/lofi_pillar_wood.png)', backgroundSize: '100% 100%', backgroundBlendMode: 'multiply' }} />
          </div>
        </div>

        {/* Top Cornice / Crown Molding */}
        <div 
          className="absolute left-[-46px] right-[-46px] sm:left-[-54px] sm:right-[-54px] top-[-40px] h-20 z-30 pointer-events-none shadow-[0_12px_24px_rgba(55,30,17,0.34),inset_0_-4px_8px_rgba(72,39,21,0.26),inset_0_2px_4px_rgba(255,232,190,0.34)] border-b-4 border-x-2 border-[#6a3b20] rounded-t-[6px] flex items-center justify-center"
          style={{ backgroundColor: '#87522f', backgroundImage: 'url(/lofi_shelf_wood.png)', backgroundSize: '100% 100%', backgroundBlendMode: 'multiply' }}
        >
          <div className="absolute top-0 left-0 right-0 h-4 bg-[#6a3b20]/22 border-b border-[#6a3b20] rounded-t-[4px]" />
          <div className="absolute top-4 left-2 right-2 h-5 shadow-[0_4px_6px_rgba(72,39,21,0.16)] border-b border-[#6a3b20]/52 bg-[#a66b3b]/10" />
          <div className="absolute bottom-1 left-4 right-4 h-3 shadow-[0_2px_4px_rgba(72,39,21,0.16)] bg-gradient-to-b from-transparent to-[#6a3b20]/32" />
          <h1 className="relative z-40 font-serif text-3xl font-bold uppercase tracking-[0.3em] text-[#3a2114] drop-shadow-[0_1px_1px_rgba(255,232,190,0.52)] sm:text-4xl mt-2">
            Kütüphane
          </h1>
          {topRightActions && (
            <div className="pointer-events-auto absolute right-4 top-1/2 hidden -translate-y-1/2 sm:block">
              {topRightActions}
            </div>
          )}
        </div>

        {(["left-column", "right-column"] as const).map((placement) => {
          const sideItems = sideColumnItems.filter(
            (item) => item.placement === placement,
          );
          const previewItem =
            sidePlacementPreview?.placement === placement && activeDrag
              ? activeDrag.item
              : null;
          const previewStyle = previewItem
            ? getSideItemStyle(previewItem, sideColumnSize.width)
            : null;

          return (
            <div
              key={placement}
              ref={placement === "left-column" ? leftSideColumnRef : rightSideColumnRef}
              className={`pointer-events-none absolute bottom-64 top-20 z-40 w-[72px] sm:bottom-0 sm:top-24 sm:w-[96px] ${
                placement === "left-column" ? "left-0" : "right-0"
              }`}
              data-side-column={placement}
            >
              {sidePlacementPreview?.placement === placement && previewStyle ? (
                <motion.div
                  aria-hidden
                  className={`pointer-events-none absolute top-0 rounded-[8px] border-2 ${
                    sidePlacementPreview.state === "blocked"
                      ? "border-rose-300/50 bg-rose-50/30 shadow-sm"
                      : "border-stone-300/60 bg-stone-100/40 shadow-sm"
                  }`}
                  data-side-placement-preview={sidePlacementPreview.state}
                  initial={{
                    opacity: 0,
                    scale: 0.94,
                    x: -previewStyle.width / 2,
                    y: getSideSlotTop(
                      sidePlacementPreview.sideSlot,
                      sideColumnSize.height,
                      previewStyle.height,
                    ),
                  }}
                  animate={{
                    opacity:
                      sidePlacementPreview.state === "blocked" ? 0.44 : 0.78,
                    scale: sidePlacementPreview.state === "swap" ? 1.04 : 1,
                    x: -previewStyle.width / 2,
                    y: getSideSlotTop(
                      sidePlacementPreview.sideSlot,
                      sideColumnSize.height,
                      previewStyle.height,
                    ),
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 650,
                    damping: 40,
                    mass: 0.7,
                  }}
                  style={{
                    left: "50%",
                    width: previewStyle.width,
                    height: previewStyle.height,
                    zIndex: 8,
                  }}
                />
              ) : null}

              {sideItems.map((item) => {
                const costume = getResolvedCostume(item, wardrobe);
                const itemStyle = getSideItemStyle(item, sideColumnSize.width);
                const isGhosted = activeDrag?.itemId === item.id;
                const isWardrobeSelected = selectedWardrobeItemId === item.id;
                const isFocusSelected = selectedFocusBookId === item.id;

                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    aria-label={item.title}
                    className={`${getItemClasses(
                      item,
                    )} pointer-events-auto cursor-grab transform-gpu bg-gradient-to-b ${item.color} ${costume.className} ${
                      isGhosted ? "saturate-75" : ""
                    } ${
                      isWardrobeMode
                        ? "ring-2 ring-amber-200/70 ring-offset-2 ring-offset-[#3e2311]/60"
                        : ""
                    } ${
                      isWardrobeSelected ? "shadow-[0_0_18px_rgba(251,191,36,0.55)]" : ""
                    } ${
                      isFocusSelected ? "ring-2 ring-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.45)]" : ""
                    }`}
                    data-item-id={item.id}
                    data-item-kind={item.kind}
                    data-side-placement={item.placement}
                    data-side-slot={item.sideSlot}
                    style={{
                      left: "50%",
                      width: itemStyle.width,
                      height: itemStyle.height,
                      x: -itemStyle.width / 2,
                      y: getSideSlotTop(
                        item.sideSlot,
                        sideColumnSize.height,
                        itemStyle.height,
                      ),
                      zIndex: item.kind === "sticky" ? 24 : 22,
                    }}
                    animate={{
                      opacity: isGhosted ? 0.45 : 1,
                      scale: isGhosted ? 0.985 : 1,
                    }}
                    initial={false}
                    transition={isResizing ? immediateTransition : springTransition}
                    onPointerDown={(event) => {
                      if (
                        isResizing ||
                        (event.pointerType === "mouse" && event.button !== 0)
                      ) {
                        return;
                      }

                      const pointer = {
                        x: event.clientX,
                        y: event.clientY,
                      };
                      const itemRect = event.currentTarget.getBoundingClientRect();

                      suppressObjectOpenRef.current = false;
                      pointerStartRef.current = pointer;
                      pendingDragRef.current = {
                        item,
                        itemId: item.id,
                        grabOffset: {
                          x: pointer.x - itemRect.left,
                          y: pointer.y - itemRect.top,
                        },
                        pointer,
                        pointerId: event.pointerId,
                      };

                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      updateDragFromPointer(
                        {
                          x: event.clientX,
                          y: event.clientY,
                        },
                        event.pointerId,
                      );
                    }}
                    onPointerUp={(event) => {
                      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                      }

                      const didDrag = finishDragFromPointer(
                        {
                          x: event.clientX,
                          y: event.clientY,
                        },
                        event.pointerId,
                      );

                      if (didDrag) {
                        event.preventDefault();
                        event.stopPropagation();
                      }
                    }}
                    onPointerCancel={(event) => {
                      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                      }

                      cancelDrag();
                    }}
                    onClick={() => {
                      if (suppressObjectOpenRef.current) {
                        return;
                      }

                      if (isWardrobeMode) {
                        onSelectWardrobeItem(item.id);
                        return;
                      }

                      if (item.kind === "sticky") {
                        onOpenTasks();
                      }
                    }}
                  >
                    <LibraryItemContent
                      costume={costume}
                      item={item}
                      tasks={tasks}
                      isTimerRunning={isTimerRunning}
                      selectedFocusBookTitle={selectedFocusBookTitle}
                      timerText={timerText}
                    />
                  </motion.button>
                );
              })}
            </div>
          );
        })}

        <div className="relative h-full w-full overflow-x-auto overflow-y-hidden overscroll-x-contain">
        <div
          ref={containerRef}
          className="relative flex h-full min-w-[1000px] items-start justify-center overflow-hidden rounded-t-[4px] rounded-b-none border border-[#7a4828] border-b-0 bg-[#4a2817] px-[86px] pb-8 pt-14 sm:px-[120px] sm:pb-8 sm:pt-16 lg:min-w-0"
        >
          <div
            ref={gridRef}
            className="relative mx-auto"
            style={{
              width: metrics.width,
              height: getShelfVisualHeight(metrics),
            }}
          >
          {Array.from({ length: metrics.rowCount }).map((_, row) => {
            const shelfTop = getShelfBoardTop(row, metrics);

            return (
              <div
                key={row}
                aria-hidden
                className="absolute left-[-12px] right-[-12px] sm:left-[-16px] sm:right-[-16px] rounded-sm shadow-[0_16px_20px_rgba(0,0,0,0.25),inset_0_3px_0_rgba(255,255,255,0.25),inset_0_-2px_4px_rgba(0,0,0,0.3)]"
                style={{
                  backgroundColor: '#7a4828',
                  backgroundImage: 'url(/lofi_shelf_wood.png)',
                  backgroundSize: '100% 100%',
                  backgroundBlendMode: 'multiply',
                  backgroundPosition: 'center bottom',
                  filter: 'brightness(1.04) saturate(1.08)',
                  top: shelfTop,
                  height: SHELF_BACK_BOARD_HEIGHT,
                  zIndex: 2,
                }}
              />
            );
          })}

          {placementPreview ? (
            <motion.div
              aria-hidden
              className={`pointer-events-none absolute left-0 top-0 rounded-[8px] border-2 ${
                placementPreview.state === "blocked"
                  ? "border-rose-300/50 bg-rose-50/30 shadow-sm"
                  : "border-stone-300/60 bg-stone-100/40 shadow-sm"
              }`}
              data-placement-preview={placementPreview.state}
              initial={{
                opacity: 0,
                scale: 0.94,
                x: previewPoint?.x ?? 0,
                y:
                  (previewPoint?.y ?? 0) -
                  16 +
                  SHELF_VISUAL_CLEARANCE +
                  getShelfVisualRowOffset(placementPreview.row),
              }}
              animate={{
                opacity: placementPreview.state === "blocked" ? 0.44 : 0.78,
                scale: placementPreview.state === "swap" ? 1.04 : 1,
                x: previewPoint?.x ?? 0,
                y:
                  (previewPoint?.y ?? 0) -
                  16 +
                  SHELF_VISUAL_CLEARANCE +
                  getShelfVisualRowOffset(placementPreview.row),
              }}
              transition={{
                type: "spring",
                stiffness: 650,
                damping: 40,
                mass: 0.7,
              }}
              style={{
                width:
                  placementPreview.widthUnits * metrics.cellWidth +
                  (placementPreview.widthUnits - 1) * metrics.gap,
                height:
                  placementPreview.heightUnits * metrics.cellHeight +
                  (placementPreview.heightUnits - 1) * metrics.gap,
                marginTop: (() => {
                  const rawHeight = placementPreview.heightUnits * metrics.cellHeight + (placementPreview.heightUnits - 1) * metrics.gap;
                  const occupiedRows = Math.ceil(placementPreview.heightUnits);
                  const fullCellHeight = occupiedRows * metrics.cellHeight + (occupiedRows - 1) * metrics.gap;
                  return fullCellHeight - rawHeight;
                })(),
                zIndex: 6,
              }}
            />
          ) : null}

          {wardrobePreview ? (
            <motion.div
              aria-hidden
              className={`pointer-events-none absolute left-0 top-0 rounded-[8px] border-2 ${
                wardrobePreview.state === "blocked"
                  ? "border-rose-300/60 bg-rose-50/35"
                  : "border-amber-200/70 bg-amber-100/25"
              } shadow-[0_0_18px_rgba(251,191,36,0.18)]`}
              data-costume-placement-preview={wardrobePreview.state}
              initial={{
                opacity: 0,
                scale: 0.94,
                x: gridToPixel(wardrobePreview, metrics).x,
                y:
                  gridToPixel(wardrobePreview, metrics).y -
                  16 +
                  SHELF_VISUAL_CLEARANCE +
                  getShelfVisualRowOffset(wardrobePreview.row),
              }}
              animate={{
                opacity: wardrobePreview.state === "blocked" ? 0.5 : 0.82,
                scale: wardrobePreview.state === "blocked" ? 0.98 : 1,
                x: gridToPixel(wardrobePreview, metrics).x,
                y:
                  gridToPixel(wardrobePreview, metrics).y -
                  16 +
                  SHELF_VISUAL_CLEARANCE +
                  getShelfVisualRowOffset(wardrobePreview.row),
              }}
              transition={{
                type: "spring",
                stiffness: 650,
                damping: 40,
                mass: 0.7,
              }}
              style={{
                width:
                  wardrobePreview.widthUnits * metrics.cellWidth +
                  (wardrobePreview.widthUnits - 1) * metrics.gap,
                height:
                  wardrobePreview.heightUnits * metrics.cellHeight +
                  (wardrobePreview.heightUnits - 1) * metrics.gap,
                zIndex: 7,
              }}
            />
          ) : null}

          {renderedItems.map((item) => {
            const point = gridToPixel(item, metrics);
            const costume = getResolvedCostume(item, wardrobe);
            const isGhosted = activeDrag?.itemId === item.id;
            const isWardrobeSelected = selectedWardrobeItemId === item.id;
            const isFocusSelected = selectedFocusBookId === item.id;
            const isSelectableFocusBook =
              isFocusTargetSelectionMode && item.kind === "book";

            return (
              <motion.button
                key={item.id}
                type="button"
                aria-label={item.title}
                data-grid-col={item.col}
                data-grid-row={item.row}
                data-item-id={item.id}
                data-item-kind={item.kind}
                data-shelf-id={item.shelfId}
                className={`${getItemClasses(item)} cursor-grab transform-gpu ${item.kind !== "plant" ? `bg-gradient-to-b ${item.color}` : ""} ${costume.className} ${
                  isGhosted ? "saturate-75" : ""
                } ${
                  isWardrobeMode
                    ? "ring-2 ring-amber-200/70 ring-offset-2 ring-offset-[#3e2311]/60"
                    : ""
                } ${
                  isWardrobeSelected ? "shadow-[0_0_18px_rgba(251,191,36,0.55)]" : ""
                } ${
                  isSelectableFocusBook
                    ? "ring-2 ring-emerald-200/80 ring-offset-2 ring-offset-[#1f130c]/70"
                    : ""
                } ${
                  isFocusSelected
                    ? "shadow-[0_0_20px_rgba(110,231,183,0.55)]"
                    : ""
                }`}
                style={{
                  ...toItemStyle(item, metrics),
                  x: point.x,
                  y: point.y - 16 + SHELF_VISUAL_CLEARANCE + getShelfVisualRowOffset(item.row),
                  zIndex: item.kind === "timer" ? 30 : 10 + item.row,
                }}
                animate={{
                  opacity: isGhosted ? 0.45 : 1,
                  scale: isGhosted ? 0.985 : 1,
                }}
                initial={false}
                transition={isResizing ? immediateTransition : springTransition}
                onPointerDown={(event) => {
                  if (isResizing || (event.pointerType === "mouse" && event.button !== 0)) {
                    return;
                  }

                  const pointer = {
                    x: event.clientX,
                    y: event.clientY,
                  };
                  const itemRect = event.currentTarget.getBoundingClientRect();

                  suppressObjectOpenRef.current = false;
                  pointerStartRef.current = pointer;
                  pendingDragRef.current = {
                    item,
                    itemId: item.id,
                    grabOffset: {
                      x: pointer.x - itemRect.left,
                      y: pointer.y - itemRect.top,
                    },
                    pointer,
                    pointerId: event.pointerId,
                  };

                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  updateDragFromPointer(
                    {
                      x: event.clientX,
                      y: event.clientY,
                    },
                    event.pointerId,
                  );
                }}
                onPointerUp={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }

                  const didDrag = finishDragFromPointer(
                    {
                      x: event.clientX,
                      y: event.clientY,
                    },
                    event.pointerId,
                  );

                  if (didDrag) {
                    event.preventDefault();
                    event.stopPropagation();
                  }
                }}
                onPointerCancel={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }

                  cancelDrag();
                }}
                onClick={() => {
                  if (suppressObjectOpenRef.current) {
                    return;
                  }

                  if (isWardrobeMode) {
                    onSelectWardrobeItem(item.id);
                    return;
                  }

                  if (isFocusTargetSelectionMode && item.kind === "book") {
                    onSelectFocusBook(item.id);
                    return;
                  }

                  if (item.kind === "book") {
                    onOpenBook(item.id);
                  }

                  if (item.kind === "timer") {
                    onOpenTimer();
                  }

                  if (item.kind === "sticky") {
                    onOpenTasks();
                  }
                }}
              >
                <LibraryItemContent
                  costume={costume}
                  item={item}
                  tasks={tasks}
                  isTimerRunning={isTimerRunning}
                  selectedFocusBookTitle={selectedFocusBookTitle}
                  timerText={timerText}
                />
              </motion.button>
            );
          })}

          {Array.from({ length: metrics.rowCount }).map((_, row) => {
            const shelfTop = getShelfBoardTop(row, metrics);

            return (
              <div
                key={`shelf-front-${row}`}
                aria-hidden
                className="pointer-events-none absolute rounded-[3px] border-t border-[#c18a55]/48 shadow-[0_13px_18px_rgba(55,30,17,0.38),inset_0_3px_0_rgba(255,232,190,0.2),inset_0_-7px_12px_rgba(72,39,21,0.38)]"
                style={{
                  left: -8,
                  right: -8,
                  top: shelfTop,
                  height: SHELF_FRONT_LIP_HEIGHT,
                  zIndex: 42 + row,
                  backgroundColor: "#73411f",
                  backgroundImage: "url(/lofi_shelf_wood.png)",
                  backgroundSize: "100% 100%",
                  backgroundBlendMode: "multiply",
                  backgroundPosition: "center bottom",
                  filter: "brightness(1.02) contrast(1.02) saturate(1.1)",
                }}
              >
                <span className="absolute inset-x-0 top-0 h-[5px] rounded-t-[3px] bg-[#d2a15a]/32 shadow-[0_-4px_10px_rgba(72,39,21,0.24)]" />
                <span className="absolute inset-x-1 top-[7px] h-px bg-amber-100/18" />
                <span className="absolute inset-x-0 bottom-0 h-3 rounded-b-[3px] bg-[#3a2012]/18" />
              </div>
            );
          })}

          {activeDrag && ghostPoint ? (
            <motion.div
              aria-hidden
              className={`${getItemClasses(
                activeDrag.item,
                "fixed",
              )} pointer-events-none transform-gpu ${activeDrag.item.kind !== "plant" ? `bg-gradient-to-b ${activeDrag.item.color}` : ""} ${activeDragSkinClass} opacity-95 shadow-2xl shadow-black/35`}
              data-drag-ghost={activeDrag.item.id}
              initial={{
                x: ghostPoint.x,
                y: ghostPoint.y,
                scale: 0.98,
                rotate: 0,
              }}
              animate={{
                x: ghostPoint.x,
                y: ghostPoint.y,
                scale: 1.055,
                rotate: activeDrag.item.kind === "book" ? -1.25 : 0,
              }}
              transition={{
                type: "spring",
                stiffness: 900,
                damping: 48,
                mass: 0.45,
              }}
              style={{
                ...toItemStyle(activeDrag.item, metrics, {
                  includeAlignmentOffset: false,
                }),
                zIndex: 90,
              }}
            >
              <LibraryItemContent
                costume={getResolvedCostume(activeDrag.item, wardrobe)}
                item={activeDrag.item}
                tasks={tasks}
                isTimerRunning={isTimerRunning}
                selectedFocusBookTitle={selectedFocusBookTitle}
                timerText={timerText}
              />
            </motion.div>
          ) : null}
        </div>
        </div>
        {children}
      </div>
      </div>
    </div>
  );
};

const itemKindLabel: Record<LibraryItemKind, string> = {
  book: "Kitap",
  painting: "Tablo",
  plant: "Saksi",
  sticky: "Not",
  timer: "Sayac",
};

type TaskModalProps = {
  tasks: LibraryTask[];
  onAddTask: (title: string) => void;
  onClose: () => void;
  onToggleTask: (taskId: string) => void;
};

const TaskModal = ({ tasks, onAddTask, onClose, onToggleTask }: TaskModalProps) => {
  const [draftTask, setDraftTask] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-md border border-[#bba88c] bg-[#f4efe6] text-[#2f251b] shadow-2xl shadow-[#4a3b2c]/25">
        <div className="flex items-center justify-between border-b border-[#c5b49e] px-5 py-4">
          <h2 id="task-dialog-title" className="text-lg font-semibold text-[#2f251b]">Görevler</h2>
          <button
            aria-label="Kapat"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[#bba88c] text-[#6e5c47] transition hover:bg-[#e3d7c1] hover:text-[#2f251b]"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>

        <div className="grid max-h-[calc(100dvh-9rem)] gap-4 overflow-y-auto px-5 py-5">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const title = draftTask.trim();

              if (!title) {
                return;
              }

              onAddTask(title);
              setDraftTask("");
            }}
          >
            <input
              autoFocus
              aria-label="Yeni görev"
              className="min-w-0 flex-1 rounded-md border border-[#bba88c] bg-[#fffaf1] px-3 text-sm text-[#2f251b] outline-none focus:border-[#8a6040]"
              placeholder="Görev"
              value={draftTask}
              onChange={(event) => setDraftTask(event.target.value)}
            />
            <button
              aria-label="Görev ekle"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-200 text-stone-950 transition hover:bg-amber-100"
              type="submit"
            >
              <Plus aria-hidden className="h-5 w-5" />
            </button>
          </form>

          <div className="grid gap-2">
            {tasks.map((task) => (
              <button
                key={task.id}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition ${
                  task.done
                    ? "border-emerald-600/35 bg-emerald-100 text-emerald-950"
                    : "border-[#bba88c] bg-[#fffaf1] text-[#2f251b] hover:border-[#8a6040]"
                }`}
                type="button"
                onClick={() => onToggleTask(task.id)}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border ${
                    task.done
                      ? "border-stone-300 bg-[#d2c0a1] text-[#3e3225]"
                      : "border-[#c5b49e]"
                  }`}
                >
                  {task.done ? <Check aria-hidden className="h-3.5 w-3.5" /> : null}
                </span>
                <span
                  className={
                    task.done ? "line-through decoration-stone-400 text-[#9c8975]" : ""
                  }
                >
                  {task.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

type WardrobePanelProps = {
  item: LibraryItem | null;
  pendingCostumeId: CostumeId | null;
  scope: WardrobeScope;
  validation: CostumeApplicationValidation | null;
  wardrobe: LibraryWardrobeState;
  onApply: () => void;
  onClose: () => void;
  onPreviewCostume: (costumeId: CostumeId) => void;
  onScopeChange: (scope: WardrobeScope) => void;
};

const getCostumeValidationMessage = (
  validation: CostumeApplicationValidation | null,
  scope: WardrobeScope,
): string | null => {
  if (!validation) {
    return null;
  }

  if (validation.valid) {
    return "Yerlesim uygun.";
  }

  if (scope === "kind") {
    return `${validation.blockedCount} obje bu kostumle mevcut yerine sigmiyor.`;
  }

  return validation.reason === "out-of-bounds"
    ? "Bu kostum mevcut konumda grid disina tasiyor."
    : "Bu kostum mevcut konumda baska bir objeyle cakisir.";
};

const WardrobePanel = ({
  item,
  pendingCostumeId,
  scope,
  validation,
  wardrobe,
  onApply,
  onClose,
  onPreviewCostume,
  onScopeChange,
}: WardrobePanelProps) => {
  const costumes = item ? getCostumesForKind(item.kind) : [];
  const selectedCostume = getCostumeDefinition(pendingCostumeId ?? undefined);
  const selectedUnlocked = selectedCostume
    ? isCostumeUnlocked(wardrobe, selectedCostume.id)
    : false;
  const currentCostumeId = item
    ? scope === "kind"
      ? wardrobe.defaultCostumeByKind[item.kind] ?? getResolvedCostume(item, wardrobe).id
      : getResolvedCostume(item, wardrobe).id
    : null;
  const canApply =
    Boolean(item && pendingCostumeId && selectedCostume && selectedUnlocked) &&
    (validation?.valid ?? true);
  const validationMessage = getCostumeValidationMessage(validation, scope);
  const selectedSize =
    item && selectedCostume ? getCostumeGridSize(item.kind, selectedCostume) : null;

  return (
    <aside
      aria-label="Kostum paneli"
      className="fixed bottom-24 right-6 z-50 w-[min(380px,calc(100vw-2rem))] rounded-md border border-[#c5b49e] bg-[#e3d7c1]/95 p-3 text-[#3e3225] shadow-2xl shadow-black/35 backdrop-blur"
      data-wardrobe-panel
    >
      <div className="flex items-start justify-between gap-3 border-b border-[#c5b49e] pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em]">
            <Sparkles aria-hidden className="h-4 w-4 text-amber-700" />
            Kostumler
          </div>
          <p className="mt-1 truncate text-sm text-[#6e5c47]">
            {item
              ? `${item.title} - ${itemKindLabel[item.kind]} Lv ${item.level}`
              : "Bir obje sec."}
          </p>
        </div>
        <button
          aria-label="Kostum panelini kapat"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-[#c5b49e] text-[#6e5c47] transition hover:bg-stone-200/60"
          type="button"
          onClick={onClose}
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>

      {item ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-[4px] bg-[#c5b49e]/45 p-1">
            {(["item", "kind"] as const).map((candidateScope) => (
              <button
                key={candidateScope}
                className={`h-9 rounded-[3px] text-xs font-semibold transition ${
                  scope === candidateScope
                    ? "bg-[#3e2311] text-amber-50 shadow-sm"
                    : "text-[#6e5c47] hover:bg-stone-100/60"
                }`}
                type="button"
                onClick={() => onScopeChange(candidateScope)}
              >
                {candidateScope === "item" ? "Bu obje" : "Tur varsayilani"}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {costumes.map((costume) => {
              const revealed = isCostumeRevealed(wardrobe, costume);
              const unlocked = isCostumeUnlocked(wardrobe, costume.id);
              const selected =
                pendingCostumeId === costume.id ||
                (!pendingCostumeId && currentCostumeId === costume.id);
              const size = getCostumeGridSize(item.kind, costume);

              return (
                <button
                  key={costume.id}
                  className={`min-h-[116px] rounded-[5px] border p-2 text-left transition ${
                    selected
                      ? "border-amber-500 bg-amber-100/70 shadow-[0_0_14px_rgba(217,119,6,0.18)]"
                      : "border-[#c5b49e] bg-[#f3eadb]/80 hover:border-amber-500/60"
                  } ${!revealed ? "opacity-80" : ""}`}
                  data-costume-card={costume.id}
                  disabled={!revealed}
                  type="button"
                  onClick={() => onPreviewCostume(costume.id)}
                >
                  <span
                    className={`relative mb-2 flex h-10 w-full items-center justify-center overflow-hidden rounded-[4px] border border-[#c5b49e] bg-gradient-to-b from-[#7a5938] to-[#3e2311] text-amber-50 ${revealed ? costume.className : ""}`}
                  >
                    {!revealed || !unlocked ? (
                      <Lock aria-hidden className="h-4 w-4 opacity-80" />
                    ) : (
                      <Sparkles aria-hidden className="h-4 w-4 opacity-80" />
                    )}
                  </span>
                  <span className="block truncate text-xs font-bold text-[#3e3225]">
                    {revealed ? costume.name : "Gizli kostum"}
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug text-[#6e5c47]">
                    {revealed
                      ? unlocked
                        ? `${size.widthUnits}x${size.heightUnits}`
                        : costume.unlockHint ?? "Kilitli"
                      : "Drop ile kesfedilir."}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 rounded-[5px] border border-[#c5b49e] bg-[#f3eadb] p-3 text-sm text-[#6e5c47]">
            {pendingCostumeId && selectedCostume ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-[#3e3225]">
                    {selectedCostume.name}
                  </span>
                  {selectedSize ? (
                    <span className="rounded-[3px] bg-[#d2c0a1] px-2 py-0.5 text-xs">
                      {selectedSize.widthUnits}x{selectedSize.heightUnits}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs">
                  {!selectedUnlocked
                    ? selectedCostume.unlockHint ?? "Bu kostum henuz kilitli."
                    : validationMessage ?? selectedCostume.description}
                </p>
              </>
            ) : (
              <p className="text-xs">
                Uygulamak icin bir kostum sec. Boyut degisirse grid once kontrol
                edilir.
              </p>
            )}
          </div>

          <button
            className={`mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[5px] text-sm font-semibold transition ${
              canApply
                ? "bg-[#3e2311] text-amber-50 hover:bg-[#4a2e1b]"
                : "cursor-not-allowed bg-[#c5b49e] text-[#6e5c47]"
            }`}
            disabled={!canApply}
            type="button"
            onClick={onApply}
          >
            <Sparkles aria-hidden className="h-4 w-4" />
            Uygula
          </button>
        </>
      ) : (
        <div className="mt-3 rounded-[5px] border border-[#c5b49e] bg-[#f3eadb] p-3 text-sm text-[#6e5c47]">
          Raftaki veya sutundaki bir objeye tikla.
        </div>
      )}
    </aside>
  );
};

type AddMenuProps = {
  isOpen: boolean;
  isWardrobeMode: boolean;
  onAddBook: () => void;
  onAddDecor: (kind: DecorItem["kind"]) => void;
  onAddShelf: () => void;
  onToggle: () => void;
  onToggleWardrobe: () => void;
};

const AddMenu = ({
  isOpen,
  isWardrobeMode,
  onAddBook,
  onAddDecor,
  onAddShelf,
  onToggle,
  onToggleWardrobe,
}: AddMenuProps) => (
  <div className="fixed bottom-32 right-3 z-40 flex flex-col items-end gap-2 md:bottom-6 md:right-6">
    {isOpen ? (
      <div className="grid min-w-44 gap-2 rounded-md border border-[#c5b49e] bg-[#e3d7c1]/95 p-2 shadow-xl shadow-[#4a3b2c]/25 backdrop-blur">
        <button
          className="flex h-10 items-center gap-2 rounded-md px-3 text-sm text-[#6e5c47] transition hover:bg-stone-200/50 hover:text-[#3e3225]"
          type="button"
          onClick={onAddBook}
        >
          <BookOpen aria-hidden className="h-4 w-4" />
          Kitap Ekle
        </button>
        <button
          className="flex h-10 items-center gap-2 rounded-md px-3 text-sm text-[#6e5c47] transition hover:bg-stone-200/50 hover:text-[#3e3225]"
          type="button"
          onClick={() => onAddDecor("plant")}
        >
          <Flower2 aria-hidden className="h-4 w-4" />
          Saksı Ekle
        </button>
        <button
          className="flex h-10 items-center gap-2 rounded-md px-3 text-sm text-[#6e5c47] transition hover:bg-stone-200/50 hover:text-[#3e3225]"
          type="button"
          onClick={() => onAddDecor("painting")}
        >
          <ImageIcon aria-hidden className="h-4 w-4" />
          Tablo Ekle
        </button>
        <button
          className="flex h-10 items-center gap-2 rounded-md px-3 text-sm text-[#6e5c47] transition hover:bg-stone-200/50 hover:text-[#3e3225]"
          type="button"
          onClick={() => onAddDecor("sticky")}
        >
          <StickyNote aria-hidden className="h-4 w-4" />
          Not Ekle
        </button>
        <button
          className="flex h-10 items-center gap-2 rounded-md px-3 text-sm text-[#6e5c47] transition hover:bg-stone-200/50 hover:text-[#3e3225]"
          type="button"
          onClick={onAddShelf}
        >
          <Menu aria-hidden className="h-4 w-4" />
          Raf Ekle
        </button>
      </div>
    ) : null}
    <button
      aria-pressed={isWardrobeMode}
      className={`flex h-12 items-center gap-2 rounded-full border px-5 text-sm font-semibold shadow-lg shadow-[#4a3b2c]/25 transition ${
        isWardrobeMode
          ? "border-amber-200 bg-[#3e2311] text-amber-50"
          : "border-[#d4c5b0] bg-[#e3d7c1] text-[#3e3225] hover:bg-[#d2c0a1]"
      }`}
      type="button"
      onClick={onToggleWardrobe}
    >
      <Sparkles aria-hidden className="h-4 w-4" />
      Kostumler
    </button>
    <button
      aria-label="Kütüphaneye ekle"
      className="flex h-14 items-center gap-2 rounded-full bg-[#d2c0a1] border border-[#d4c5b0] px-5 text-sm font-semibold text-[#3e3225] shadow-lg shadow-[#4a3b2c]/25 transition hover:bg-[#c3ae8a]"
      type="button"
      onClick={onToggle}
    >
      <Plus aria-hidden className="h-5 w-5" />
      Ekle
    </button>
  </div>
);

export const LibraryGrid = () => {
  const initialLibraryState = useMemo(() => getInitialLibraryState(), []);
  const [libraryState, setLibraryState, persistence] = useLocalStorageState<LibraryState>(
    STORAGE_KEY,
    initialLibraryState,
  );
  const [selectedNoteBookId, setSelectedNoteBookId] = useState<string | null>(null);
  const [rewardSummary, setRewardSummary] = useState<FocusRewardSummary | null>(null);
  const [isFocusTargetSelectionMode, setIsFocusTargetSelectionMode] =
    useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [isShelfManagerOpen, setIsShelfManagerOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isWardrobeMode, setIsWardrobeMode] = useState(false);
  const [selectedWardrobeItemId, setSelectedWardrobeItemId] = useState<
    string | null
  >(null);
  const [wardrobeScope, setWardrobeScope] = useState<WardrobeScope>("item");
  const [pendingCostumeId, setPendingCostumeId] = useState<CostumeId | null>(null);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);
  const selectedNoteBaselineRef = useRef<{
    id: string;
    note?: string;
    noteUpdatedAt?: number;
    title: string;
  } | null>(null);
  const validationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeShelf =
    libraryState.shelves.find((shelf) => shelf.id === libraryState.activeShelfId) ??
    libraryState.shelves[0];
  const activeShelfId = activeShelf?.id;
  const activeShelfIndex = Math.max(
    0,
    libraryState.shelves.findIndex((shelf) => shelf.id === activeShelfId),
  );
  const activeShelfItems = useMemo(
    () => (activeShelf ? getShelfItemsWithTimer(libraryState.items, activeShelf) : []),
    [activeShelf, libraryState.items],
  );
  const wardrobe = useMemo(
    () => normalizeWardrobeState(libraryState.wardrobe),
    [libraryState.wardrobe],
  );
  const books = useMemo(() => getBooks(libraryState.items), [libraryState.items]);
  const selectedNoteBook = useMemo(
    () => books.find((book) => book.id === selectedNoteBookId) ?? null,
    [books, selectedNoteBookId],
  );
  const selectedNoteBookStats = useMemo(
    () =>
      selectedNoteBook
        ? getBookStudyStats(selectedNoteBook, libraryState.focusSessions ?? [])
        : null,
    [libraryState.focusSessions, selectedNoteBook],
  );
  const selectedFocusBook = useMemo(
    () =>
      libraryState.selectedFocusItemId
        ? books.find((book) => book.id === libraryState.selectedFocusItemId) ?? null
        : null,
    [books, libraryState.selectedFocusItemId],
  );
  const currentDailyXp =
    libraryState.dailyFocus.dateKey === getTodayKey()
      ? libraryState.dailyFocus.xp
      : 0;
  const selectedWardrobeItem = useMemo(() => {
    if (!selectedWardrobeItemId) {
      return null;
    }

    return (
      libraryState.items.find((item) => item.id === selectedWardrobeItemId) ??
      activeShelfItems.find((item) => item.id === selectedWardrobeItemId) ??
      null
    );
  }, [activeShelfItems, libraryState.items, selectedWardrobeItemId]);
  const pendingCostume = useMemo(
    () => getCostumeDefinition(pendingCostumeId ?? undefined),
    [pendingCostumeId],
  );
  const wardrobeValidation = useMemo(() => {
    if (
      !selectedWardrobeItem ||
      !pendingCostume ||
      pendingCostume.kind !== selectedWardrobeItem.kind
    ) {
      return null;
    }

    return wardrobeScope === "kind"
      ? validateDefaultCostumeApplication({
          items: libraryState.items,
          kind: selectedWardrobeItem.kind,
          costume: pendingCostume,
          wardrobe,
          metrics: getShelfMetrics(),
        })
      : validateItemCostumeApplication({
          items: libraryState.items,
          item: selectedWardrobeItem,
          costume: pendingCostume,
          wardrobe,
          metrics: getShelfMetrics(),
        });
  }, [
    libraryState.items,
    pendingCostume,
    selectedWardrobeItem,
    wardrobe,
    wardrobeScope,
  ]);
  const wardrobePreview = useMemo<PlacementPreview | null>(() => {
    if (
      wardrobeScope !== "item" ||
      !selectedWardrobeItem ||
      !pendingCostume ||
      pendingCostume.kind !== selectedWardrobeItem.kind ||
      !isShelfPlacedItem(selectedWardrobeItem)
    ) {
      return null;
    }

    const size = getCostumeGridSize(selectedWardrobeItem.kind, pendingCostume);

    return {
      itemId: selectedWardrobeItem.id,
      row: selectedWardrobeItem.row,
      col: selectedWardrobeItem.col,
      widthUnits: size.widthUnits,
      heightUnits: size.heightUnits,
      state: wardrobeValidation?.valid ? "move" : "blocked",
    };
  }, [pendingCostume, selectedWardrobeItem, wardrobeScope, wardrobeValidation]);

  useEffect(() => {
    if (!persistence.isHydrated || persistence.error) {
      return;
    }

    const normalizedState = normalizeLibraryStateForRuntime(libraryState);
    if (normalizedState !== libraryState) {
      void setLibraryState((currentState) => normalizeLibraryStateForRuntime(currentState));
    }
  }, [
    libraryState,
    persistence.error,
    persistence.isHydrated,
    setLibraryState,
  ]);

  const scheduleShelfGridValidation = useCallback(
    (shelfId: string) => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }

      validationTimeoutRef.current = setTimeout(() => {
        setLibraryState((currentState) => {
          const shelf = currentState.shelves.find((candidate) => candidate.id === shelfId);

          if (!shelf) {
            return currentState;
          }

          const shelfItems = getShelfItemsWithTimer(currentState.items, shelf).filter(
            isShelfPlacedItem,
          );
          const metrics = getShelfMetrics();
          const validation = validateGridLayout(shelfItems, metrics);

          if (validation.valid) {
            return currentState;
          }

          const repairedItems = resolveResizeLayout(shelfItems, metrics);

          if (!haveGridPositionsChanged(shelfItems, repairedItems)) {
            return currentState;
          }

          return replaceShelfItems(currentState, shelf.id, repairedItems);
        });
      }, POST_DROP_VALIDATION_DELAY_MS);
    },
    [setLibraryState],
  );

  useEffect(
    () => () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (activeShelfId) {
      scheduleShelfGridValidation(activeShelfId);
    }
  }, [activeShelfId, scheduleShelfGridValidation]);

  const completeSession = useCallback(async (sessionId: string) => {
    let completedSummary: FocusRewardSummary | null = null;

    const persistedState = await setLibraryState((currentState) => {
      const result = completeNaturalFocusSession({
        completedAt: Date.now(),
        sessionId,
        state: currentState,
      });
      completedSummary = result.summary;
      return result.state;
    });

    const wasPersisted = (persistedState.focusSessions ?? []).some(
      (sessionRecord) => sessionRecord.id === sessionId,
    );
    if (completedSummary && wasPersisted) {
      setRewardSummary(completedSummary);
    }
  }, [setLibraryState]);

  const timer = usePomodoroTimer({
    durationSeconds: FOCUS_SESSION_SECONDS,
    session: libraryState.activeFocusSession,
    onComplete: completeSession,
  });

  const timerText = formatTimer(timer.remainingSeconds);

  const startFocusTimer = useCallback(() => {
    const now = Date.now();
    const sessionId = createLibraryId("focus");

    void setLibraryState((currentState) => ({
      ...currentState,
      activeFocusSession: startOrResumeFocusSession({
        current: currentState.activeFocusSession,
        durationSeconds: FOCUS_SESSION_SECONDS,
        id: sessionId,
        now,
        targetBookId: currentState.selectedFocusItemId ?? null,
      }),
    }));
  }, [setLibraryState]);

  const pauseFocusTimer = useCallback(() => {
    const now = Date.now();

    void setLibraryState((currentState) => ({
      ...currentState,
      activeFocusSession: currentState.activeFocusSession
        ? pauseFocusSession(currentState.activeFocusSession, now)
        : null,
    }));
  }, [setLibraryState]);

  const resetFocusTimer = useCallback(() => {
    void setLibraryState((currentState) => ({
      ...currentState,
      activeFocusSession: null,
    }));
  }, [setLibraryState]);

  const finishFocusTimer = useCallback(async () => {
    const completedAt = Date.now();

    await setLibraryState((currentState) => {
      return endFocusSessionEarly(currentState, completedAt);
    });
  }, [setLibraryState]);

  const selectFocusBook = useCallback(
    (bookId: string) => {
      setLibraryState((currentState) => ({
        ...currentState,
        selectedBookId: bookId,
        selectedFocusItemId: bookId,
        activeFocusSession: currentState.activeFocusSession
          ? {
              ...currentState.activeFocusSession,
              targetBookId: bookId,
            }
          : currentState.activeFocusSession,
      }));
      setIsFocusTargetSelectionMode(false);
    },
    [setLibraryState],
  );

  const clearFocusTarget = useCallback(() => {
    setLibraryState((currentState) => ({
      ...currentState,
      selectedBookId: null,
      selectedFocusItemId: null,
      activeFocusSession: currentState.activeFocusSession
        ? {
            ...currentState.activeFocusSession,
            targetBookId: null,
          }
        : currentState.activeFocusSession,
    }));
    setIsFocusTargetSelectionMode(false);
  }, [setLibraryState]);

  const closeWardrobe = useCallback(() => {
    setIsWardrobeMode(false);
    setSelectedWardrobeItemId(null);
    setPendingCostumeId(null);
  }, []);

  const toggleWardrobeMode = useCallback(() => {
    setIsWardrobeMode((current) => {
      const next = !current;

      if (!next) {
        setSelectedWardrobeItemId(null);
        setPendingCostumeId(null);
      }

      return next;
    });
    setIsAddMenuOpen(false);
  }, []);

  const selectWardrobeItem = useCallback((itemId: string) => {
    setSelectedWardrobeItemId(itemId);
    setPendingCostumeId(null);
    setWardrobeScope("item");
  }, []);

  const applyPendingCostume = useCallback(() => {
    if (!pendingCostumeId || !selectedWardrobeItemId) {
      return;
    }

    setLibraryState((currentState) => {
      const item = currentState.items.find(
        (candidate) => candidate.id === selectedWardrobeItemId,
      );
      const costume = getCostumeDefinition(pendingCostumeId);
      const normalizedWardrobe = normalizeWardrobeState(currentState.wardrobe);

      if (
        !item ||
        !costume ||
        costume.kind !== item.kind ||
        !isCostumeUnlocked(normalizedWardrobe, costume.id)
      ) {
        return currentState;
      }

      if (wardrobeScope === "kind") {
        const validation = validateDefaultCostumeApplication({
          items: currentState.items,
          kind: item.kind,
          costume,
          wardrobe: normalizedWardrobe,
          metrics: getShelfMetrics(),
        });

        if (!validation.valid) {
          return currentState;
        }

        const nextWardrobe = setWardrobeDefaultCostume(
          normalizedWardrobe,
          item.kind,
          costume.id,
        );

        return {
          ...currentState,
          wardrobe: nextWardrobe,
          items: getItemsAfterDefaultCostume(
            currentState.items,
            item.kind,
            costume,
            nextWardrobe,
          ),
        };
      }

      const validation = validateItemCostumeApplication({
        items: currentState.items,
        item,
        costume,
        wardrobe: normalizedWardrobe,
        metrics: getShelfMetrics(),
      });

      if (!validation.valid) {
        return currentState;
      }

      return {
        ...currentState,
        wardrobe: normalizedWardrobe,
        items: currentState.items.map((candidate) =>
          candidate.id === item.id
            ? createItemWithCostume(candidate, costume, normalizedWardrobe)
            : candidate,
        ),
      };
    });
    setPendingCostumeId(null);
  }, [
    pendingCostumeId,
    selectedWardrobeItemId,
    setLibraryState,
    wardrobeScope,
  ]);

  const updateActiveShelf = useCallback(
    (shelfId: string) => {
      setLibraryState((currentState) => ({
        ...currentState,
        activeShelfId: shelfId,
      }));
    },
    [setLibraryState],
  );

  const renameActiveShelf = useCallback(
    (title: string) => {
      if (!activeShelf) {
        return;
      }

      setLibraryState((currentState) => ({
        ...currentState,
        shelves: currentState.shelves.map((shelf) =>
          shelf.id === activeShelf.id
            ? {
                ...shelf,
                title,
              }
            : shelf,
        ),
      }));
    },
    [activeShelf, setLibraryState],
  );

  const moveItem = useCallback(
    (shelf: LibraryShelf, itemId: string, position: GridPosition) => {
      setLibraryState((currentState) => {
        const resolution = resolveLibraryShelfDrop({
          itemId,
          items: currentState.items,
          metrics: getShelfMetrics(),
          position,
          shelf,
        });

        if (resolution.type === "snap-back") {
          return currentState;
        }

        return replaceShelfItems(currentState, shelf.id, resolution.items);
      });

      scheduleShelfGridValidation(shelf.id);
    },
    [scheduleShelfGridValidation, setLibraryState],
  );

  const moveSideItem = useCallback(
    (shelf: LibraryShelf, itemId: string, target: SideColumnTarget) => {
      setLibraryState((currentState) => {
        const resolution = resolveSideColumnDrop(
          itemId,
          target,
          currentState.items,
          SIDE_COLUMN_SLOT_COUNT,
        );

        if (resolution.type === "snap-back") {
          return currentState;
        }

        return {
          ...currentState,
          items: resolution.items,
        };
      });

      scheduleShelfGridValidation(shelf.id);
    },
    [scheduleShelfGridValidation, setLibraryState],
  );

  const saveBookNote = useCallback(
    async (bookId: string, data: { title: string; note: string }) => {
      const noteUpdatedAt = Date.now();
      const openedBook = selectedNoteBaselineRef.current;
      let conflict = false;

      await setLibraryState((currentState) => {
        const currentBook = currentState.items.find(
          (item): item is BookItem => item.id === bookId && isBookItem(item),
        );
        if (
          currentBook &&
          (currentBook.title !== openedBook?.title ||
            (currentBook.noteUpdatedAt !== openedBook?.noteUpdatedAt &&
              currentBook.note !== openedBook?.note))
        ) {
          conflict = true;
          return currentState;
        }

        return {
          ...currentState,
          items: currentState.items.map((item) =>
            item.id === bookId && isBookItem(item)
              ? {
                  ...item,
                  title: data.title,
                  note: data.note || undefined,
                  noteUpdatedAt: data.note ? noteUpdatedAt : undefined,
                }
              : item,
          ),
        };
      });

      if (conflict) {
        setStorageNotice(
          "Bu not başka bir sekmede değişti. Taslağın korunuyor; güncel notu görmek için pencereyi kapatıp yeniden aç.",
        );
        return;
      }

      setSelectedNoteBookId(null);
    },
    [setLibraryState],
  );

  const downloadBackup = useCallback(() => {
    const blob = new Blob([persistence.exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pomodoro-library-${getTodayKey()}.json`;
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(url);
    }, 1_000);
    setStorageNotice("Yedek dosyası hazırlandı.");
  }, [persistence]);

  const importBackup = useCallback(
    async (file: File) => {
      try {
        const rawValue = await file.text();
        const parsed = JSON.parse(rawValue) as {
          data?: { items?: unknown[]; shelves?: unknown[]; tasks?: unknown[] };
        };
        const summary = parsed.data;
        const shouldImport = window.confirm(
          `Bu yedek ${summary?.shelves?.length ?? 0} raf, ${summary?.items?.length ?? 0} eşya ve ${summary?.tasks?.length ?? 0} görev içeriyor. Mevcut kütüphane değiştirilsin mi?`,
        );
        if (!shouldImport) {
          return;
        }

        await persistence.importData(rawValue);
        setStorageNotice("Yedek doğrulandı ve yüklendi.");
      } catch (error) {
        setStorageNotice(
          error instanceof Error ? error.message : "Yedek yüklenemedi.",
        );
      }
    },
    [persistence],
  );

  const addShelf = useCallback(() => {
    void setLibraryState((currentState) => {
      const { shelf, timer } = createShelfWithTimer({
        index: currentState.shelves.length,
      });

      return {
        ...currentState,
        activeShelfId: shelf.id,
        shelves: [...currentState.shelves, shelf],
        items: [
          ...currentState.items,
          timer,
        ],
      };
    });
    setIsAddMenuOpen(false);
  }, [setLibraryState]);

  const addBook = useCallback(() => {
    if (!activeShelf) {
      return;
    }

    setLibraryState((currentState) => {
      const normalizedWardrobe = normalizeWardrobeState(currentState.wardrobe);
      const defaultCostume = getCostumeDefinition(
        normalizedWardrobe.defaultCostumeByKind.book,
      );
      const target = getShelfItemSlot(
        currentState.items,
        currentState.shelves,
        activeShelf,
        defaultCostume
          ? getCostumeGridSize("book", defaultCostume)
          : getItemGridSize("book"),
      );
      const book = createBookItem({
        id: createLibraryId("book"),
        shelfId: target.shelf.id,
        title: getRandomBookTitle(),
        position: target.position,
        color: getRandomBookColor(),
      });
      const item = defaultCostume
        ? createItemWithCostume(book, defaultCostume, normalizedWardrobe)
        : book;

      return {
        ...currentState,
        wardrobe: normalizedWardrobe,
        activeShelfId: target.shelf.id,
        shelves: target.shelves,
        items: [...currentState.items, ...target.newItems, item],
      };
    });
    setIsAddMenuOpen(false);
  }, [activeShelf, setLibraryState]);

  const addDecor = useCallback(
    (kind: DecorItem["kind"]) => {
      if (!activeShelf) {
        return;
      }

      setLibraryState((currentState) => {
        const normalizedWardrobe = normalizeWardrobeState(currentState.wardrobe);
        const defaultCostume = getCostumeDefinition(
          normalizedWardrobe.defaultCostumeByKind[kind],
        );
        const defaultSidePlacement = getDefaultSideColumnPlacement(kind);

        if (defaultSidePlacement) {
          const sideSlot = findAvailableSideSlot(
            currentState.items,
            activeShelf.id,
            defaultSidePlacement,
            SIDE_COLUMN_SLOT_COUNT,
          );

          if (sideSlot !== null) {
            const titleByKind: Record<DecorItem["kind"], string> = {
              painting: "Moon Study",
              plant: "Fern",
              sticky: "Tasks",
            };
            const decor = createDecorItem({
              id: createLibraryId(kind),
              kind,
              shelfId: activeShelf.id,
              title: titleByKind[kind],
              position: {
                row: Math.min(sideSlot, DEFAULT_SHELF_ROWS - 1),
                col: 0,
              },
              sideTarget: {
                placement: defaultSidePlacement,
                sideSlot,
              },
            });

            return {
              ...currentState,
              wardrobe: normalizedWardrobe,
              items: [
                ...currentState.items,
                defaultCostume
                  ? createItemWithCostume(decor, defaultCostume, normalizedWardrobe)
                  : decor,
              ],
            };
          }
        }

        const target = getShelfItemSlot(
          currentState.items,
          currentState.shelves,
          activeShelf,
          defaultCostume
            ? getCostumeGridSize(kind, defaultCostume)
            : getItemGridSize(kind),
        );
        const titleByKind: Record<DecorItem["kind"], string> = {
          painting: "Moon Study",
          plant: "Fern",
          sticky: "Tasks",
        };
        const decor = createDecorItem({
          id: createLibraryId(kind),
          kind,
          shelfId: target.shelf.id,
          title: titleByKind[kind],
          position: target.position,
        });

        return {
          ...currentState,
          wardrobe: normalizedWardrobe,
          activeShelfId: target.shelf.id,
          shelves: target.shelves,
          items: [
            ...currentState.items,
            ...target.newItems,
            defaultCostume
              ? createItemWithCostume(decor, defaultCostume, normalizedWardrobe)
              : decor,
          ],
        };
      });
      setIsAddMenuOpen(false);
    },
    [activeShelf, setLibraryState],
  );

  const addTask = useCallback(
    (title: string) => {
      setLibraryState((currentState) => {
        const createdAt = Date.now();
        const tasks = [
          {
            id: createLibraryId("task"),
            title,
            done: false,
            createdAt,
            updatedAt: createdAt,
          },
          ...currentState.tasks,
        ];

        return {
          ...currentState,
          tasks,
          items: applyStickyTaskSize(currentState.items, tasks),
        };
      });
    },
    [setLibraryState],
  );

  const archiveBook = useCallback(
    (bookId: string, data: { title: string; note: string }) => {
      const archivedAt = Date.now();

      setLibraryState((currentState) => {
        const book = currentState.items.find(
          (item): item is BookItem => item.id === bookId && isBookItem(item),
        );

        if (!book) {
          return currentState;
        }

        const archivedBook: ArchivedBook = {
          ...book,
          title: data.title,
          note: data.note || undefined,
          noteUpdatedAt: data.note ? archivedAt : undefined,
          archivedAt,
        };

        return {
          ...currentState,
          items: currentState.items.filter((item) => item.id !== bookId),
          archivedBooks: [archivedBook, ...(currentState.archivedBooks ?? [])],
          selectedBookId:
            currentState.selectedBookId === bookId ? null : currentState.selectedBookId,
          selectedFocusItemId:
            currentState.selectedFocusItemId === bookId
              ? null
              : currentState.selectedFocusItemId,
          activeFocusSession:
            currentState.activeFocusSession?.targetBookId === bookId
              ? {
                  ...currentState.activeFocusSession,
                  targetBookId: null,
                }
              : currentState.activeFocusSession,
        };
      });
      setSelectedNoteBookId(null);
    },
    [setLibraryState],
  );

  const restoreArchivedBook = useCallback(
    (bookId: string) => {
      setLibraryState((currentState) => {
        const archivedBook = (currentState.archivedBooks ?? []).find(
          (book) => book.id === bookId,
        );
        const targetShelf =
          currentState.shelves.find(
            (shelf) => shelf.id === currentState.activeShelfId,
          ) ?? currentState.shelves[0];

        if (!archivedBook || !targetShelf) {
          return currentState;
        }

        const target = getShelfItemSlot(
          currentState.items,
          currentState.shelves,
          targetShelf,
          {
            widthUnits: archivedBook.widthUnits,
            heightUnits: archivedBook.heightUnits,
          },
        );
        const restoredBook: BookItem = {
          ...archivedBook,
          shelfId: target.shelf.id,
          row: target.position.row,
          col: target.position.col,
        };

        return {
          ...currentState,
          activeShelfId: target.shelf.id,
          shelves: target.shelves,
          items: [...currentState.items, ...target.newItems, restoredBook],
          archivedBooks: (currentState.archivedBooks ?? []).filter(
            (book) => book.id !== bookId,
          ),
        };
      });
    },
    [setLibraryState],
  );

  const deleteShelf = useCallback(
    (shelfId: string) => {
      setLibraryState((currentState) => {
        if (currentState.shelves.length <= 1) {
          return currentState;
        }

        const deletedShelfIndex = currentState.shelves.findIndex(
          (shelf) => shelf.id === shelfId,
        );
        const shelfItems = currentState.items.filter(
          (item) => item.shelfId === shelfId,
        );
        const archivedAt = Date.now();
        const archivedBooks = shelfItems
          .filter(isBookItem)
          .map((book) => ({ ...book, archivedAt }));
        const archivedBookIds = new Set(archivedBooks.map((book) => book.id));
        const shelves = currentState.shelves.filter((shelf) => shelf.id !== shelfId);
        const fallbackShelf = shelves[Math.max(0, Math.min(deletedShelfIndex, shelves.length - 1))];
        const activeFocusSession = currentState.activeFocusSession;

        if (!fallbackShelf) {
          return currentState;
        }

        return {
          ...currentState,
          shelves,
          activeShelfId:
            currentState.activeShelfId === shelfId
              ? fallbackShelf.id
              : currentState.activeShelfId,
          items: currentState.items.filter((item) => item.shelfId !== shelfId),
          archivedBooks: [...archivedBooks, ...(currentState.archivedBooks ?? [])],
          selectedBookId: archivedBookIds.has(currentState.selectedBookId ?? "")
            ? null
            : currentState.selectedBookId,
          selectedFocusItemId: archivedBookIds.has(currentState.selectedFocusItemId ?? "")
            ? null
            : currentState.selectedFocusItemId,
          activeFocusSession: activeFocusSession && archivedBookIds.has(
            activeFocusSession.targetBookId ?? "",
          )
            ? {
                ...activeFocusSession,
                targetBookId: null,
              }
            : activeFocusSession,
        };
      });
    },
    [setLibraryState],
  );

  const toggleTask = useCallback(
    (taskId: string) => {
      setLibraryState((currentState) => {
        const updatedAt = Date.now();
        const tasks = currentState.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                done: !task.done,
                updatedAt,
                completedAt: task.done ? undefined : updatedAt,
              }
            : task,
        );

        return {
          ...currentState,
          tasks,
          items: applyStickyTaskSize(currentState.items, tasks),
        };
      });
    },
    [setLibraryState],
  );

  const goToRelativeShelf = useCallback(
    (direction: -1 | 1) => {
      const nextIndex =
        (activeShelfIndex + direction + libraryState.shelves.length) %
        libraryState.shelves.length;
      const nextShelf = libraryState.shelves[nextIndex];

      if (nextShelf) {
        updateActiveShelf(nextShelf.id);
      }
    },
    [activeShelfIndex, libraryState.shelves, updateActiveShelf],
  );

  if (!activeShelf) {
    return null;
  }

  return (
    <main 
      className="relative h-dvh overflow-hidden bg-[#3a261b] text-stone-100"
    >
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/lofi_room_bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(4px) brightness(0.72) saturate(1.12)',
          transform: 'scale(1.05)'
        }}
      />
      <div className="relative z-10 h-dvh w-full overflow-hidden">

      <ShelfScene
        shelf={activeShelf}
        items={activeShelfItems}
        tasks={libraryState.tasks}
        timerText={timerText}
        isTimerRunning={timer.isRunning}
        selectedFocusBookTitle={selectedFocusBook?.title ?? null}
        wardrobe={wardrobe}
        isWardrobeMode={isWardrobeMode}
        isFocusTargetSelectionMode={isFocusTargetSelectionMode}
        selectedFocusBookId={libraryState.selectedFocusItemId}
        selectedWardrobeItemId={selectedWardrobeItemId}
        wardrobePreview={wardrobePreview}
        onMoveItem={moveItem}
        onMoveSideItem={moveSideItem}
        onSelectFocusBook={selectFocusBook}
        onSelectWardrobeItem={selectWardrobeItem}
        topRightActions={
          <span className="rounded bg-[#6f3f22]/88 px-3 py-2 text-xs font-bold text-amber-50">
            Bu cihazda saklanır
          </span>
        }
        onOpenBook={(bookId) => {
          const book = books.find((candidate) => candidate.id === bookId);
          selectedNoteBaselineRef.current = book
            ? {
                id: book.id,
                note: book.note,
                noteUpdatedAt: book.noteUpdatedAt,
                title: book.title,
              }
            : null;
          setSelectedNoteBookId(bookId);
        }}
        onOpenTasks={() => setIsTaskOpen(true)}
        onOpenTimer={() => {
          setRewardSummary(null);
          setIsTimerOpen(true);
        }}
      >
        <div className="absolute bottom-6 left-1/2 z-40 grid w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2 rounded-sm border border-[#6a3b20] bg-[#8a5a35] p-2 shadow-[0_8px_16px_rgba(55,30,17,0.42),inset_0_2px_4px_rgba(255,232,190,0.22)] md:flex md:flex-row">
          <button
            aria-label="Önceki raf"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-[#6a3b20]/60 bg-[#6f3f22] text-amber-50 transition hover:bg-[#83502c]"
            type="button"
            onClick={() => goToRelativeShelf(-1)}
          >
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </button>

          <label className="min-w-0 flex-1">
            <span className="sr-only">Raf adı</span>
            <input
              aria-label="Raf adı"
              className="h-8 w-full rounded-[2px] border border-[#8b5d37]/55 bg-[#f2dfc3] px-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-[#3b281b] outline-none focus:border-[#6f3f22]"
              value={activeShelf.title}
              onChange={(event) => renameActiveShelf(event.target.value)}
            />
          </label>

          <button
            aria-label="Sonraki raf"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-[#6a3b20]/60 bg-[#6f3f22] text-amber-50 transition hover:bg-[#83502c]"
            type="button"
            onClick={() => goToRelativeShelf(1)}
          >
            <ChevronRight aria-hidden className="h-4 w-4" />
          </button>

          <div className="col-span-3 grid grid-cols-4 gap-2 md:contents">
            <button
              aria-label="Görevleri aç"
              className="flex h-8 min-w-0 shrink-0 items-center justify-center rounded-[2px] border border-[#6a3b20]/60 bg-[#6f3f22] px-1 text-xs font-semibold text-amber-50 transition hover:bg-[#83502c]"
              type="button"
              onClick={() => setIsTaskOpen(true)}
            >
              Görevler
            </button>

            <button
              aria-label="Raf yönetimini aç"
              className="flex h-8 min-w-0 shrink-0 items-center justify-center gap-1 rounded-[2px] border border-[#6a3b20]/60 bg-[#6f3f22] px-1 text-xs font-semibold text-amber-50 transition hover:bg-[#83502c]"
              type="button"
              onClick={() => {
                setIsShelfManagerOpen(true);
                setIsAddMenuOpen(false);
                setIsWardrobeMode(false);
              }}
            >
              <Menu aria-hidden className="hidden h-3.5 w-3.5 lg:block" />
              Raflar
            </button>

            <button
              aria-label="Kütüphane yedeğini indir"
              className="flex h-8 min-w-0 shrink-0 items-center justify-center gap-1 rounded-[2px] border border-[#6a3b20]/60 bg-[#6f3f22] px-1 text-xs font-semibold text-amber-50 transition hover:bg-[#83502c]"
              type="button"
              onClick={downloadBackup}
            >
              <Download aria-hidden className="hidden h-3.5 w-3.5 lg:block" />
              Yedekle
            </button>

            <label className="flex h-8 min-w-0 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-[2px] border border-[#6a3b20]/60 bg-[#6f3f22] px-1 text-xs font-semibold text-amber-50 transition hover:bg-[#83502c]">
              <Upload aria-hidden className="hidden h-3.5 w-3.5 lg:block" />
              Yükle
              <input
                accept="application/json,.json"
                className="sr-only"
                type="file"
                onChange={async (event) => {
                  const input = event.currentTarget;
                  const file = input.files?.[0];
                  if (file) {
                    await importBackup(file);
                  }
                  input.value = "";
                }}
              />
            </label>
          </div>

          <div className="col-span-3 flex justify-center gap-1 md:ml-1">
            {libraryState.shelves.map((shelf) => (
              <button
                key={shelf.id}
                aria-label={`${shelf.title} rafına geç`}
                className={`h-2 w-6 rounded-sm transition border border-[#6a3b20]/55 ${
                  shelf.id === activeShelf.id ? "bg-[#f2c078]" : "bg-[#4a2817]/42"
                }`}
                type="button"
                onClick={() => updateActiveShelf(shelf.id)}
              />
            ))}
          </div>
        </div>
      </ShelfScene>

      {isTimerOpen ? (
        <TimerControlDialog
          canFinish={Boolean(
            libraryState.activeFocusSession &&
              !libraryState.activeFocusSession.needsRestart &&
              getFocusElapsedSeconds(libraryState.activeFocusSession) >= 1,
          )}
          dailyXp={currentDailyXp}
          isRunning={timer.isRunning}
          isSelectingBook={isFocusTargetSelectionMode}
          rewardSummary={rewardSummary}
          recoveryMessage={
            libraryState.activeFocusSession?.needsRestart
              ? "Önceki sürümden kalan sayaç güvenle durduruldu. Yeni bir çalışma başlatabilirsin."
              : undefined
          }
          selectedBook={selectedFocusBook}
          timerText={timerText}
          onClearReward={() => setRewardSummary(null)}
          onClearTarget={clearFocusTarget}
          onClose={() => setIsTimerOpen(false)}
          onFinish={() => void finishFocusTimer()}
          onPause={pauseFocusTimer}
          onRequestBookSelection={() => {
            setIsFocusTargetSelectionMode(true);
            setIsAddMenuOpen(false);
            setIsWardrobeMode(false);
            setIsTimerOpen(false);
          }}
          onReset={resetFocusTimer}
          onStart={startFocusTimer}
        />
      ) : null}

      <AddMenu
        isOpen={isAddMenuOpen}
        isWardrobeMode={isWardrobeMode}
        onAddBook={addBook}
        onAddDecor={addDecor}
        onAddShelf={addShelf}
        onToggle={() => setIsAddMenuOpen((current) => !current)}
        onToggleWardrobe={toggleWardrobeMode}
      />

      {isWardrobeMode ? (
        <WardrobePanel
          item={selectedWardrobeItem}
          pendingCostumeId={pendingCostumeId}
          scope={wardrobeScope}
          validation={wardrobeValidation}
          wardrobe={wardrobe}
          onApply={applyPendingCostume}
          onClose={closeWardrobe}
          onPreviewCostume={setPendingCostumeId}
          onScopeChange={(scope) => {
            setWardrobeScope(scope);
            setPendingCostumeId(null);
          }}
        />
      ) : null}

      {selectedNoteBook && selectedNoteBookStats ? (
        <BookNoteDialog
          key={selectedNoteBook.id}
          book={selectedNoteBook}
          stats={selectedNoteBookStats}
          onArchive={archiveBook}
          onClose={() => setSelectedNoteBookId(null)}
          onSave={saveBookNote}
        />
      ) : null}

      {isShelfManagerOpen ? (
        <ShelfManagerDialog
          activeShelfId={activeShelf.id}
          archivedBooks={libraryState.archivedBooks ?? []}
          shelves={libraryState.shelves}
          onClose={() => setIsShelfManagerOpen(false)}
          onDeleteShelf={deleteShelf}
          onRestoreBook={restoreArchivedBook}
          onSelectShelf={updateActiveShelf}
        />
      ) : null}

      {isTaskOpen ? (
        <TaskModal
          tasks={libraryState.tasks}
          onAddTask={addTask}
          onClose={() => setIsTaskOpen(false)}
          onToggleTask={toggleTask}
        />
      ) : null}
      {persistence.error || storageNotice ? (
        <div
          className="fixed bottom-3 left-1/2 z-[100] flex w-[min(92vw,680px)] -translate-x-1/2 items-center justify-between gap-3 rounded-md border border-amber-300/70 bg-[#2b190f] px-4 py-3 text-sm text-amber-50 shadow-2xl"
          role={persistence.error ? "alert" : "status"}
        >
          <span>{persistence.error ?? storageNotice}</span>
          <button
            className="shrink-0 rounded border border-amber-200/40 px-2 py-1 text-xs font-bold"
            hidden={!persistence.error}
            type="button"
            onClick={() => void persistence.retryLastSave()}
          >
            Tekrar dene
          </button>
          <button
            className="shrink-0 rounded border border-amber-200/40 px-2 py-1 text-xs font-bold"
            type="button"
            onClick={() => {
              persistence.clearError();
              setStorageNotice(null);
            }}
          >
            Kapat
          </button>
        </div>
      ) : null}
      </div>
    </main>
  );
};
