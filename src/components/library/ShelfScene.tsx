"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MotionConfig, motion, type Transition } from "framer-motion";
import { useGridMetrics } from "@/hooks/useGridMetrics";
import {
  getResolvedItemPosition,
  gridToPixel,
  pixelToGridTarget,
  resolveResizeLayout,
} from "@/lib/gridLogic";
import type {
  GridMetrics,
  GridPosition,
  GridSize,
  PixelPoint,
} from "@/lib/gridLogic";
import { resolveLibraryShelfDrop } from "@/lib/libraryDrop";
import { getResolvedCostume } from "@/lib/libraryCostumeDefinitions";
import {
  DEFAULT_SHELF_ROWS,
  GRID_COLUMN_COUNT,
  SIDE_COLUMN_SLOT_COUNT,
} from "@/lib/libraryInventory";
import {
  isShelfPlacedItem,
  isSideColumnEligibleItem,
  isSideColumnPlacedItem,
  resolveSideColumnDrop,
  type SideColumnTarget,
} from "@/lib/sideColumnLogic";
import { getStickyTaskGridSize } from "@/lib/stickyTaskLayout";
import type {
  LibraryItem,
  LibraryShelf,
  LibraryTask,
  LibraryWardrobeState,
  SideColumnPlacement,
} from "@/types/library";
import { LibraryItemVisual } from "@/components/library/LibraryItemVisual";
import {
  BookStack,
  GlassJar,
  ConstellationGlobe,
  QuillDecoration,
  SleepingCat,
  UprightBooks,
  Hourglass,
  CrystalCluster,
  MagicLamp,
} from "@/components/library/LibraryAtmosphere";

const DRAG_CLICK_SUPPRESSION_THRESHOLD = 6;
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

const getGridYFromShelfVisualY = (
  visualY: number,
  metrics: GridMetrics,
): number => {
  const visualRowStep = metrics.cellHeight + metrics.gap + SHELF_VISUAL_ROW_GAP;
  const estimatedRow = Math.min(
    metrics.rowCount - 1,
    Math.max(0, Math.round(visualY / visualRowStep)),
  );

  return (
    visualY - SHELF_VISUAL_CLEARANCE - getShelfVisualRowOffset(estimatedRow)
  );
};

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
    item.heightUnits * metrics.cellHeight +
    (item.heightUnits - 1) * metrics.gap;
  const occupiedRows = Math.ceil(item.heightUnits);
  const fullCellHeight =
    occupiedRows * metrics.cellHeight + (occupiedRows - 1) * metrics.gap;
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
  const maxWidth =
    item.kind === "painting" ? 74 : item.kind === "sticky" ? 76 : 64;
  const minWidth =
    item.kind === "painting" ? 44 : item.kind === "sticky" ? 46 : 38;
  const widthMultiplier =
    item.kind === "painting" ? 0.74 : item.kind === "sticky" ? 0.72 : 0.62;
  const width = Math.round(
    Math.max(minWidth, Math.min(maxWidth, columnWidth * widthMultiplier)),
  );
  const maxHeight =
    item.kind === "painting" ? 58 : item.kind === "sticky" ? 78 : 66;
  const minHeight =
    item.kind === "painting" ? 32 : item.kind === "sticky" ? 52 : 42;
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

const getItemClasses = (item: LibraryItem, positionClass = "absolute") =>
  `library-item library-item--${item.kind} ${positionClass} left-0 top-0`;

export type ShelfSceneProps = {
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
  onMoveItem: (
    shelf: LibraryShelf,
    itemId: string,
    position: GridPosition,
  ) => void;
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

export type PlacementPreview = GridPosition &
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

export const ShelfScene = ({
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
}: ShelfSceneProps) => {
  const { containerRef, metrics, isResizing } = useGridMetrics<HTMLDivElement>({
    columnCount: GRID_COLUMN_COUNT,
    rowCount: getEffectiveShelfRowCount(),
    minCellWidth: 41,
    maxCellWidth: 73,
    gap: 8,
    cellAspectRatio: 3.36,
    measurementEpsilon: GRID_MEASUREMENT_EPSILON,
    fitToHeight: false,
  });
  const suppressObjectOpenRef = useRef(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const leftSideColumnRef = useRef<HTMLDivElement | null>(null);
  const rightSideColumnRef = useRef<HTMLDivElement | null>(null);
  const activeDragRef = useRef<ActiveDrag | null>(null);
  const pendingDragRef = useRef<ActiveDrag | null>(null);
  const cancelledPointerIdRef = useRef<number | null>(null);
  const pointerStartRef = useRef<PixelPoint | null>(null);
  const previewKeyRef = useRef<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [placementPreview, setPlacementPreview] =
    useState<PlacementPreview | null>(null);
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
  const activeDragSkinClass = activeDrag
    ? getResolvedCostume(activeDrag.item, wardrobe).className
    : "";

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
          Math.abs(currentSize.width - nextSize.width) >=
          GRID_MEASUREMENT_EPSILON;
        const heightChanged =
          Math.abs(currentSize.height - nextSize.height) >=
          GRID_MEASUREMENT_EPSILON;

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
      const shelfSize =
        item.kind === "sticky" ? getStickyTaskGridSize(tasks) : item;
      const target = getDraggedGridPosition({
        currentPosition: item,
        grabOffset,
        gridElement: gridRef.current,
        pointer,
        size: shelfSize,
        metrics,
      });
      const resolution = resolveLibraryShelfDrop({
        itemId: item.id,
        items: [...renderedItems, ...sideColumnItems],
        position: target,
        metrics: getShelfMetrics(),
        shelf,
        tasks,
      });
      const state: PlacementPreview["state"] =
        resolution.type === "snap-back" ? "blocked" : resolution.type;
      const resolvedPosition =
        resolution.type === "snap-back"
          ? target
          : (getResolvedItemPosition(item.id, resolution) ?? target);
      const previewKey = `${item.id}:${resolvedPosition.row}:${resolvedPosition.col}:${shelfSize.widthUnits}:${shelfSize.heightUnits}:${state}`;

      if (previewKeyRef.current !== previewKey) {
        previewKeyRef.current = previewKey;
        setSidePlacementPreview(null);
        setPlacementPreview({
          itemId: item.id,
          row: resolvedPosition.row,
          col: resolvedPosition.col,
          widthUnits: shelfSize.widthUnits,
          heightUnits: shelfSize.heightUnits,
          state,
        });
      }

      return target;
    },
    [metrics, renderedItems, shelf, sideColumnItems, tasks],
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
        { metrics: getShelfMetrics(), tasks },
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
    [items, tasks],
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
        !pendingDrag &&
        cancelledPointerIdRef.current !== null &&
        (pointerId === undefined || pointerId === cancelledPointerIdRef.current)
      ) {
        cancelledPointerIdRef.current = null;
        releaseObjectOpenSuppression();
        return true;
      }

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
    const drag = pendingDragRef.current ?? activeDragRef.current;
    if (!drag) {
      return;
    }

    cancelledPointerIdRef.current = drag.pointerId;
    suppressObjectOpenRef.current = true;
    clearDragState();
  }, [clearDragState]);

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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && pendingDragRef.current) {
        event.preventDefault();
        cancelDrag();
      }
    };
    const handleVisibilityChange = () => {
      if (document.hidden) cancelDrag();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", cancelDrag);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("blur", cancelDrag);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", cancelDrag);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("blur", cancelDrag);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [cancelDrag, finishDragFromPointer, updateDragFromPointer]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="library-bookcase" aria-label="Kütüphane rafı">
        <div className="library-bookcase-inner">
          <div className="library-bookcase-cap" aria-hidden="true" />
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
                ref={
                  placement === "left-column"
                    ? leftSideColumnRef
                    : rightSideColumnRef
                }
                className={`library-side-column library-side-column--${placement}`}
                data-side-column={placement}
              >
                {sidePlacementPreview?.placement === placement &&
                previewStyle ? (
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
                  const itemStyle = getSideItemStyle(
                    item,
                    sideColumnSize.width,
                  );
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
                        isWardrobeSelected
                          ? "shadow-[0_0_18px_rgba(251,191,36,0.55)]"
                          : ""
                      } ${
                        isFocusSelected
                          ? "ring-2 ring-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.45)]"
                          : ""
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
                      transition={
                        isResizing ? immediateTransition : springTransition
                      }
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
                        const itemRect =
                          event.currentTarget.getBoundingClientRect();

                        suppressObjectOpenRef.current = false;
                        cancelledPointerIdRef.current = null;
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
                        if (
                          event.currentTarget.hasPointerCapture(event.pointerId)
                        ) {
                          event.currentTarget.releasePointerCapture(
                            event.pointerId,
                          );
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
                        if (
                          event.currentTarget.hasPointerCapture(event.pointerId)
                        ) {
                          event.currentTarget.releasePointerCapture(
                            event.pointerId,
                          );
                        }

                        cancelDrag();
                      }}
                      onLostPointerCapture={cancelDrag}
                      onClick={(event) => {
                        if (
                          suppressObjectOpenRef.current &&
                          event.detail !== 0
                        ) {
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
                      <LibraryItemVisual
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

          <div
            className="library-shelf-scroll"
            aria-label="Raf alanı"
            tabIndex={0}
          >
            <div
              ref={containerRef}
              className="library-grid-container"
              style={{ minHeight: getShelfVisualHeight(metrics) + 66 }}
            >
              <div
                ref={gridRef}
                className="library-grid"
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
                      className="library-shelf-back"
                      style={{
                        top: shelfTop,
                        height: SHELF_BACK_BOARD_HEIGHT,
                        zIndex: 2,
                      }}
                    />
                  );
                })}

                {Array.from({ length: metrics.rowCount }).flatMap((_, row) => {
                  const ornaments = [
                    [
                      UprightBooks,
                      MagicLamp,
                      BookStack,
                      GlassJar,
                      ConstellationGlobe,
                    ],
                    [GlassJar, UprightBooks, Hourglass, BookStack, SleepingCat],
                    [
                      BookStack,
                      QuillDecoration,
                      UprightBooks,
                      CrystalCluster,
                      GlassJar,
                    ],
                    [MagicLamp, BookStack, GlassJar, UprightBooks, Hourglass],
                  ];
                  return [3, 8, 13, 18, 23].map((col, index) => {
                    const widthUnits = 4;
                    const isOccupied = renderedItems.some(
                      (item) =>
                        item.row <= row &&
                        item.row + Math.ceil(item.heightUnits) > row &&
                        item.col < col + widthUnits &&
                        item.col + item.widthUnits > col,
                    );
                    if (isOccupied) return null;
                    const Ornament = ornaments[row % ornaments.length][index];
                    return (
                      <span
                        key={`${row}-${col}`}
                        className={`library-shelf-accent library-shelf-accent--${index}`}
                        aria-hidden="true"
                        style={{
                          left: col * (metrics.cellWidth + metrics.gap),
                          top:
                            getShelfBoardTop(row, metrics) -
                            metrics.cellHeight * 0.84,
                          width: 4 * metrics.cellWidth + 3 * metrics.gap,
                          height: metrics.cellHeight * 0.84,
                        }}
                      >
                        <Ornament />
                      </span>
                    );
                  });
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
                      opacity:
                        placementPreview.state === "blocked" ? 0.44 : 0.78,
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
                        const rawHeight =
                          placementPreview.heightUnits * metrics.cellHeight +
                          (placementPreview.heightUnits - 1) * metrics.gap;
                        const occupiedRows = Math.ceil(
                          placementPreview.heightUnits,
                        );
                        const fullCellHeight =
                          occupiedRows * metrics.cellHeight +
                          (occupiedRows - 1) * metrics.gap;
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
                        isWardrobeSelected
                          ? "shadow-[0_0_18px_rgba(251,191,36,0.55)]"
                          : ""
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
                        y:
                          point.y -
                          16 +
                          SHELF_VISUAL_CLEARANCE +
                          getShelfVisualRowOffset(item.row),
                        zIndex: item.kind === "timer" ? 30 : 10 + item.row,
                      }}
                      animate={{
                        opacity: isGhosted ? 0.45 : 1,
                        scale: isGhosted ? 0.985 : 1,
                      }}
                      initial={false}
                      transition={
                        isResizing ? immediateTransition : springTransition
                      }
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
                        const itemRect =
                          event.currentTarget.getBoundingClientRect();

                        suppressObjectOpenRef.current = false;
                        cancelledPointerIdRef.current = null;
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
                        if (
                          event.currentTarget.hasPointerCapture(event.pointerId)
                        ) {
                          event.currentTarget.releasePointerCapture(
                            event.pointerId,
                          );
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
                        if (
                          event.currentTarget.hasPointerCapture(event.pointerId)
                        ) {
                          event.currentTarget.releasePointerCapture(
                            event.pointerId,
                          );
                        }

                        cancelDrag();
                      }}
                      onLostPointerCapture={cancelDrag}
                      onClick={(event) => {
                        if (
                          suppressObjectOpenRef.current &&
                          event.detail !== 0
                        ) {
                          return;
                        }

                        if (isWardrobeMode) {
                          onSelectWardrobeItem(item.id);
                          return;
                        }

                        if (
                          isFocusTargetSelectionMode &&
                          item.kind === "book"
                        ) {
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
                      <LibraryItemVisual
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
                      className="library-shelf-front"
                      style={{
                        left: -8,
                        right: -8,
                        top: shelfTop,
                        height: SHELF_FRONT_LIP_HEIGHT,
                        zIndex: 42 + row,
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
                    <LibraryItemVisual
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
    </MotionConfig>
  );
};
