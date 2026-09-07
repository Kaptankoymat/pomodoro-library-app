"use client";

import { BookNoteDialog } from "@/components/BookNoteDialog";
import { ShelfManagerDialog } from "@/components/ShelfManagerDialog";
import { TimerControlDialog } from "@/components/TimerControlDialog";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { usePomodoroTimer } from "@/hooks/usePomodoroTimer";
import {
  createItemWithCostume,
  getCostumeGridSize,
  getItemsAfterDefaultCostume,
  setWardrobeDefaultCostume,
  validateDefaultCostumeApplication,
  validateItemCostumeApplication,
  type WardrobeScope,
} from "@/lib/costumeApplication";
import {
  completeNaturalFocusSession,
  endFocusSessionEarly,
} from "@/lib/focusCompletion";
import {
  getFocusElapsedSeconds,
  pauseFocusSession,
  startOrResumeFocusSession,
} from "@/lib/focusSession";
import type { GridPosition, GridSize } from "@/lib/gridLogic";
import { resolveResizeLayout, validateGridLayout } from "@/lib/gridLogic";
import { parseLibraryBackup } from "@/lib/libraryBackup";
import {
  getCostumeDefinition,
  isCostumeUnlocked,
  normalizeWardrobeState,
} from "@/lib/libraryCostumeDefinitions";
import { resolveLibraryShelfDrop } from "@/lib/libraryDrop";
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
import { getItemGridSize } from "@/lib/libraryItemDefinitions";
import {
  FOCUS_SESSION_SECONDS,
  getDailyFocusXp,
  getTodayKey,
} from "@/lib/libraryProgression";
import { normalizeLibraryStateForRuntime } from "@/lib/libraryStateMigration";
import { getBooks, getBookStudyStats } from "@/lib/libraryStats";
import {
  findAvailableSideSlot,
  getDefaultSideColumnPlacement,
  isShelfPlacedItem,
  resolveSideColumnDrop,
  type SideColumnTarget,
} from "@/lib/sideColumnLogic";
import {
  applyStickyTaskSize,
  getStickyTaskGridSize,
} from "@/lib/stickyTaskLayout";
import {
  isBookItem,
  type ArchivedBook,
  type BookItem,
  type CostumeId,
  type DecorItem,
  type FocusRewardSummary,
  type LibraryItem,
  type LibraryShelf,
  type LibraryState,
} from "@/types/library";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { AddMenu } from "@/components/library/AddMenu";
import { FocusDock } from "@/components/library/FocusDock";
import {
  LibraryAtmosphere,
  LibraryVine,
  MagicLamp,
} from "@/components/library/LibraryAtmosphere";
import { LibraryNavigation } from "@/components/library/LibraryNavigation";
import { MobileLibraryScene } from "@/components/library/MobileLibraryScene";
import {
  ShelfScene,
  type PlacementPreview,
} from "@/components/library/ShelfScene";
import { TaskModal } from "@/components/library/TaskModal";
import { WardrobePanel } from "@/components/library/WardrobePanel";

const STORAGE_KEY = "pomodoro-library-state-v3";
const POST_DROP_VALIDATION_DELAY_MS = 260;

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

const getShelfItemsWithTimer = (
  items: LibraryItem[],
  shelf: LibraryShelf,
): LibraryItem[] => items.filter((item) => item.shelfId === shelf.id);

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
    const updatedItems = state.items.map(
      (item) => nextItemsById.get(item.id) ?? item,
    );
    const addedItems = shelfItems.filter(
      (item) => !existingItemIds.has(item.id),
    );

    return [...updatedItems, ...addedItems].map((item) =>
      item.shelfId === shelfId && nextItemsById.has(item.id)
        ? (nextItemsById.get(item.id) ?? item)
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

  const currentById = new Map(
    currentItems.map((item) => [item.id, item] as const),
  );

  return nextItems.some((nextItem) => {
    const currentItem = currentById.get(nextItem.id);

    return (
      !currentItem ||
      currentItem.row !== nextItem.row ||
      currentItem.col !== nextItem.col
    );
  });
};

const subscribeToCompactLayout = (onChange: () => void) => {
  const query = window.matchMedia("(max-width: 900px)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const getCompactLayout = () => window.matchMedia("(max-width: 900px)").matches;
const getServerCompactLayout = () => false;

export const LibraryGrid = () => {
  const isCompact = useSyncExternalStore(
    subscribeToCompactLayout,
    getCompactLayout,
    getServerCompactLayout,
  );
  const initialLibraryState = useMemo(() => getInitialLibraryState(), []);
  const [libraryState, setLibraryState, persistence] =
    useLocalStorageState<LibraryState>(STORAGE_KEY, initialLibraryState);
  const [selectedNoteBookId, setSelectedNoteBookId] = useState<string | null>(
    null,
  );
  const [rewardSummary, setRewardSummary] = useState<FocusRewardSummary | null>(
    null,
  );
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
  const [pendingCostumeId, setPendingCostumeId] = useState<CostumeId | null>(
    null,
  );
  const [storageNotice, setStorageNotice] = useState<string | null>(null);
  const [selectedNoteBaseline, setSelectedNoteBaseline] =
    useState<BookItem | null>(null);
  const validationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const activeShelf =
    libraryState.shelves.find(
      (shelf) => shelf.id === libraryState.activeShelfId,
    ) ?? libraryState.shelves[0];
  const activeShelfId = activeShelf?.id;
  const activeShelfIndex = Math.max(
    0,
    libraryState.shelves.findIndex((shelf) => shelf.id === activeShelfId),
  );
  const activeShelfItems = useMemo(
    () =>
      activeShelf
        ? getShelfItemsWithTimer(libraryState.items, activeShelf)
        : [],
    [activeShelf, libraryState.items],
  );
  const wardrobe = useMemo(
    () => normalizeWardrobeState(libraryState.wardrobe),
    [libraryState.wardrobe],
  );
  const books = useMemo(
    () => getBooks(libraryState.items),
    [libraryState.items],
  );
  const selectedNoteBook = useMemo(
    () =>
      books.find((book) => book.id === selectedNoteBookId) ??
      (selectedNoteBaseline?.id === selectedNoteBookId
        ? selectedNoteBaseline
        : null),
    [books, selectedNoteBaseline, selectedNoteBookId],
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
        ? (books.find((book) => book.id === libraryState.selectedFocusItemId) ??
          null)
        : null,
    [books, libraryState.selectedFocusItemId],
  );
  const currentDailyXp = getDailyFocusXp(libraryState);
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

    const size =
      selectedWardrobeItem.kind === "sticky"
        ? {
            widthUnits: selectedWardrobeItem.widthUnits,
            heightUnits: selectedWardrobeItem.heightUnits,
          }
        : getCostumeGridSize(selectedWardrobeItem.kind, pendingCostume);

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
      void setLibraryState((currentState) =>
        normalizeLibraryStateForRuntime(currentState),
      );
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
          const shelf = currentState.shelves.find(
            (candidate) => candidate.id === shelfId,
          );

          if (!shelf) {
            return currentState;
          }

          const shelfItems = getShelfItemsWithTimer(
            currentState.items,
            shelf,
          ).filter(isShelfPlacedItem);
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

  const completeSession = useCallback(
    async (sessionId: string) => {
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
      return wasPersisted;
    },
    [setLibraryState],
  );

  const timer = usePomodoroTimer({
    durationSeconds: FOCUS_SESSION_SECONDS,
    session: libraryState.activeFocusSession,
    onComplete: completeSession,
  });

  const timerText = formatTimer(timer.remainingSeconds);

  const observedSessionId = libraryState.activeFocusSession?.id ?? null;
  const startFocusTimer = useCallback(async () => {
    const now = Date.now();
    const sessionId = createLibraryId("focus");
    const saved = await setLibraryState((currentState) => {
      if ((currentState.activeFocusSession?.id ?? null) !== observedSessionId)
        return currentState;
      return {
        ...currentState,
        activeFocusSession: startOrResumeFocusSession({
          current: currentState.activeFocusSession,
          durationSeconds: FOCUS_SESSION_SECONDS,
          id: sessionId,
          now,
          targetBookId: currentState.selectedFocusItemId ?? null,
        }),
      };
    });
    return (
      saved.activeFocusSession?.status === "running" &&
      [observedSessionId, sessionId].includes(saved.activeFocusSession.id)
    );
  }, [observedSessionId, setLibraryState]);

  const pauseFocusTimer = useCallback(async () => {
    const now = Date.now();
    const saved = await setLibraryState((currentState) => {
      if (
        !observedSessionId ||
        currentState.activeFocusSession?.id !== observedSessionId
      )
        return currentState;
      return {
        ...currentState,
        activeFocusSession: pauseFocusSession(
          currentState.activeFocusSession,
          now,
        ),
      };
    });
    if (saved.activeFocusSession?.id !== observedSessionId) return false;
    if (
      saved.activeFocusSession &&
      getFocusElapsedSeconds(saved.activeFocusSession, now) >=
        saved.activeFocusSession.durationSeconds
    ) {
      return await completeSession(saved.activeFocusSession.id);
    }
    return saved.activeFocusSession?.status === "paused";
  }, [completeSession, observedSessionId, setLibraryState]);

  const resetFocusTimer = useCallback(async () => {
    const saved = await setLibraryState((currentState) =>
      (currentState.activeFocusSession?.id ?? null) !== observedSessionId
        ? currentState
        : { ...currentState, activeFocusSession: null },
    );
    return !saved.activeFocusSession;
  }, [observedSessionId, setLibraryState]);

  const finishFocusTimer = useCallback(async () => {
    const completedAt = Date.now();
    let summary: FocusRewardSummary | null = null;
    let endedObservedSession = false;
    const saved = await setLibraryState((currentState) => {
      const session = currentState.activeFocusSession;
      if (!observedSessionId || session?.id !== observedSessionId)
        return currentState;
      endedObservedSession = true;
      if (
        getFocusElapsedSeconds(session, completedAt) >= session.durationSeconds
      ) {
        const result = completeNaturalFocusSession({
          state: currentState,
          sessionId: session.id,
          completedAt,
        });
        summary = result.summary;
        return result.state;
      }
      return endFocusSessionEarly(currentState, completedAt);
    });
    const completed = Boolean(
      saved.focusSessions?.some((session) => session.id === observedSessionId),
    );
    if (summary && completed) setRewardSummary(summary);
    return completed || (endedObservedSession && !saved.activeFocusSession);
  }, [observedSessionId, setLibraryState]);

  const selectFocusBook = useCallback(
    (bookId: string) => {
      void setLibraryState((currentState) =>
        currentState.items.some(
          (item) => item.id === bookId && isBookItem(item),
        )
          ? {
              ...currentState,
              selectedBookId: bookId,
              selectedFocusItemId: bookId,
              activeFocusSession:
                currentState.activeFocusSession &&
                getFocusElapsedSeconds(currentState.activeFocusSession) <
                  currentState.activeFocusSession.durationSeconds
                  ? {
                      ...currentState.activeFocusSession,
                      targetBookId: bookId,
                    }
                  : currentState.activeFocusSession,
            }
          : currentState,
      );
      setIsFocusTargetSelectionMode(false);
      setIsTimerOpen(true);
    },
    [setLibraryState],
  );

  const clearFocusTarget = useCallback(async () => {
    const saved = await setLibraryState((currentState) => ({
      ...currentState,
      selectedBookId: null,
      selectedFocusItemId: null,
      activeFocusSession:
        currentState.activeFocusSession &&
        getFocusElapsedSeconds(currentState.activeFocusSession) <
          currentState.activeFocusSession.durationSeconds
          ? {
              ...currentState.activeFocusSession,
              targetBookId: null,
            }
          : currentState.activeFocusSession,
    }));
    setIsFocusTargetSelectionMode(false);
    return saved.selectedFocusItemId === null;
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
    async (shelfId: string) => {
      const saved = await setLibraryState((currentState) =>
        currentState.shelves.some((shelf) => shelf.id === shelfId)
          ? { ...currentState, activeShelfId: shelfId }
          : currentState,
      );
      return saved.activeShelfId === shelfId;
    },
    [setLibraryState],
  );

  const renameActiveShelf = useCallback(
    async (title: string) => {
      if (!activeShelf) return false;
      const savedTitle = title.trim() || "İsimsiz raf";
      const saved = await setLibraryState((currentState) => ({
        ...currentState,
        shelves: currentState.shelves.map((shelf) =>
          shelf.id === activeShelf.id ? { ...shelf, title: savedTitle } : shelf,
        ),
      }));
      return saved.shelves.some(
        (shelf) => shelf.id === activeShelf.id && shelf.title === savedTitle,
      );
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
          tasks: currentState.tasks,
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
          { metrics: getShelfMetrics(), tasks: currentState.tasks },
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
      const openedBook = selectedNoteBaseline;
      let conflict = false;

      const saved = await setLibraryState((currentState) => {
        const currentBook = currentState.items.find(
          (item): item is BookItem => item.id === bookId && isBookItem(item),
        );
        if (
          currentBook?.title === data.title &&
          (currentBook.note ?? "") === data.note
        )
          return currentState;
        if (
          !currentBook ||
          openedBook?.id !== bookId ||
          currentBook.title !== openedBook.title ||
          currentBook.note !== openedBook.note
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
        throw new Error(
          "Bu kitap başka bir sekmede değiştirildi veya kaldırıldı. Taslağın bu pencerede korunuyor. Metni kopyalayıp güncel kitabı yeniden açabilirsin.",
        );
      }
      const savedBook = saved.items.find(
        (item): item is BookItem => item.id === bookId && isBookItem(item),
      );
      if (
        !savedBook ||
        savedBook.title !== data.title ||
        (savedBook.note ?? "") !== data.note
      ) {
        return false;
      }
      setSelectedNoteBookId(null);
      return true;
    },
    [selectedNoteBaseline, setLibraryState],
  );

  const downloadBackup = useCallback(() => {
    const blob = new Blob([persistence.exportData()], {
      type: "application/json",
    });
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
        const summary = parseLibraryBackup(rawValue);
        const shouldImport = window.confirm(
          `Bu yedek ${summary?.shelves?.length ?? 0} raf, ${summary?.items?.length ?? 0} eşya ve ${summary?.tasks?.length ?? 0} görev içeriyor. Mevcut kütüphane değiştirilsin mi?`,
        );
        if (!shouldImport) {
          return;
        }

        await persistence.importData(rawValue);
        setIsFocusTargetSelectionMode(false);
        closeWardrobe();
        setRewardSummary(null);
        setSelectedNoteBookId(null);
        setIsTimerOpen(false);
        setIsTaskOpen(false);
        setIsShelfManagerOpen(false);
        setStorageNotice(
          "Yedek doğrulandı ve yüklendi. Kaydedilmiş sayaç durduruldu.",
        );
      } catch (error) {
        setStorageNotice(
          error instanceof Error ? error.message : "Yedek yüklenemedi.",
        );
      }
    },
    [closeWardrobe, persistence],
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
        items: [...currentState.items, timer],
      };
    });
    setIsAddMenuOpen(false);
  }, [setLibraryState]);

  const addBook = useCallback(() => {
    if (!activeShelf) {
      return;
    }

    setLibraryState((currentState) => {
      const targetShelf = currentState.shelves.find(
        (shelf) => shelf.id === activeShelf.id,
      );
      if (!targetShelf) return currentState;
      const normalizedWardrobe = normalizeWardrobeState(currentState.wardrobe);
      const defaultCostume = getCostumeDefinition(
        normalizedWardrobe.defaultCostumeByKind.book,
      );
      const target = getShelfItemSlot(
        currentState.items,
        currentState.shelves,
        targetShelf,
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
        const targetShelf = currentState.shelves.find(
          (shelf) => shelf.id === activeShelf.id,
        );
        if (!targetShelf) return currentState;
        const normalizedWardrobe = normalizeWardrobeState(
          currentState.wardrobe,
        );
        const defaultCostume = getCostumeDefinition(
          normalizedWardrobe.defaultCostumeByKind[kind],
        );
        const defaultSidePlacement = getDefaultSideColumnPlacement(kind);

        if (defaultSidePlacement) {
          const sideSlot = findAvailableSideSlot(
            currentState.items,
            targetShelf.id,
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
              shelfId: targetShelf.id,
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
                  ? createItemWithCostume(
                      decor,
                      defaultCostume,
                      normalizedWardrobe,
                    )
                  : decor,
              ],
            };
          }
        }

        const target = getShelfItemSlot(
          currentState.items,
          currentState.shelves,
          targetShelf,
          kind === "sticky"
            ? getStickyTaskGridSize(currentState.tasks)
            : defaultCostume
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
    async (title: string) => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return false;
      const taskId = createLibraryId("task");
      const saved = await setLibraryState((currentState) => {
        const createdAt = Date.now();
        const tasks = [
          {
            id: taskId,
            title: trimmedTitle,
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
      return saved.tasks.some((task) => task.id === taskId);
    },
    [setLibraryState],
  );

  const archiveBook = useCallback(
    async (bookId: string, data: { title: string; note: string }) => {
      const archivedAt = Date.now();
      const openedBook = selectedNoteBaseline;
      let conflict = false;
      const saved = await setLibraryState((currentState) => {
        const book = currentState.items.find(
          (item): item is BookItem => item.id === bookId && isBookItem(item),
        );

        if (!book) {
          if (
            currentState.archivedBooks?.some(
              (candidate) =>
                candidate.id === bookId &&
                candidate.title === data.title &&
                (candidate.note ?? "") === data.note,
            )
          )
            return currentState;
          conflict = true;
          return currentState;
        }
        if (
          openedBook?.id !== bookId ||
          book.title !== openedBook.title ||
          book.note !== openedBook.note
        ) {
          conflict = true;
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
            currentState.selectedBookId === bookId
              ? null
              : currentState.selectedBookId,
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
      if (conflict) {
        throw new Error(
          "Bu kitap başka bir sekmede değiştirildi veya kaldırıldı. Taslağın bu pencerede korunuyor. Metni kopyalayıp güncel kitabı yeniden açabilirsin.",
        );
      }
      if (
        !saved.archivedBooks?.some(
          (book) =>
            book.id === bookId &&
            book.title === data.title &&
            (book.note ?? "") === data.note,
        )
      )
        return false;
      setSelectedNoteBookId(null);
      return true;
    },
    [selectedNoteBaseline, setLibraryState],
  );

  const restoreArchivedBook = useCallback(
    async (bookId: string) => {
      const saved = await setLibraryState((currentState) => {
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
      return saved.items.some((item) => item.id === bookId);
    },
    [setLibraryState],
  );

  const deleteShelf = useCallback(
    async (shelfId: string) => {
      const saved = await setLibraryState((currentState) => {
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
        const shelves = currentState.shelves.filter(
          (shelf) => shelf.id !== shelfId,
        );
        const fallbackShelf =
          shelves[Math.max(0, Math.min(deletedShelfIndex, shelves.length - 1))];
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
          archivedBooks: [
            ...archivedBooks,
            ...(currentState.archivedBooks ?? []),
          ],
          selectedBookId: archivedBookIds.has(currentState.selectedBookId ?? "")
            ? null
            : currentState.selectedBookId,
          selectedFocusItemId: archivedBookIds.has(
            currentState.selectedFocusItemId ?? "",
          )
            ? null
            : currentState.selectedFocusItemId,
          activeFocusSession:
            activeFocusSession &&
            archivedBookIds.has(activeFocusSession.targetBookId ?? "")
              ? {
                  ...activeFocusSession,
                  targetBookId: null,
                }
              : activeFocusSession,
        };
      });
      return !saved.shelves.some((shelf) => shelf.id === shelfId);
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

  const recoveryActions = persistence.error ? (
    <div
      className="library-dialog-alert library-dialog-alert--danger library-recovery-actions"
      role="alert"
    >
      <p className="w-full">{persistence.error}</p>
      <button
        className="library-button library-button--quiet"
        type="button"
        onClick={() => void persistence.retryLastSave()}
      >
        Tekrar dene
      </button>
      <button
        className="library-button library-button--quiet"
        type="button"
        onClick={downloadBackup}
      >
        Yedekle
      </button>
    </div>
  ) : null;

  if (!persistence.isReady) {
    return (
      <main className="library-loading">
        <section className="library-panel library-loading-panel">
          <h1 className="font-serif text-2xl">Kütüphane</h1>
          <p role={persistence.error ? "alert" : "status"}>
            {persistence.isHydrated
              ? (persistence.error ??
                "Kayıt açılamadı. Tekrar deneyebilir veya bir yedek yükleyebilirsin.")
              : "Kütüphanen yükleniyor…"}
          </p>
          {persistence.isHydrated ? (
            <div className="flex flex-wrap gap-3 text-sm">
              <button
                className="library-button"
                onClick={() => void persistence.retryLastSave()}
                type="button"
              >
                Tekrar dene
              </button>
              <button
                className="library-button"
                onClick={downloadBackup}
                type="button"
              >
                Kurtarma verisini indir
              </button>
              <label className="library-button library-upload">
                Yedek yükle
                <input
                  aria-label="Yedek yükle"
                  type="file"
                  accept="application/json,.json"
                  onChange={async (event) => {
                    const input = event.currentTarget;
                    if (input.files?.[0]) await importBackup(input.files[0]);
                    input.value = "";
                  }}
                />
              </label>
            </div>
          ) : null}
          {storageNotice ? <p role="status">{storageNotice}</p> : null}
        </section>
      </main>
    );
  }

  if (!activeShelf) {
    return null;
  }

  const Scene = isCompact ? MobileLibraryScene : ShelfScene;

  return (
    <main className="library-app">
      <LibraryAtmosphere />
      <div className="library-stage">
        <header className="library-header">
          <div className="library-header-side">
            <MagicLamp className="library-header-lamp" />
            <span className="library-header-note">
              Dışarıdaki dünya
              <br />
              biraz bekleyebilir.
            </span>
          </div>
          <div className="library-title-plaque">
            <LibraryVine className="library-title-vine library-title-vine--left" />
            <span className="library-title-star" aria-hidden="true">
              ✦
            </span>
            <h1>
              POMODORO<span>LIBRARY</span>
            </h1>
            <p>KENDİ DÜNYANA BİR SAYFA DAHA</p>
            <LibraryVine
              className="library-title-vine library-title-vine--right"
              flipped
            />
          </div>
          <div className="library-header-side library-header-side--right">
            <span className="library-local-badge">
              <span aria-hidden="true">◈</span> Bu cihazda saklanır
            </span>
            <span className="library-header-note">
              Senin köşen.
              <br />
              Senin ritmin.
            </span>
          </div>
        </header>
        <FocusDock
          timerText={timerText}
          isRunning={timer.isRunning}
          targetTitle={selectedFocusBook?.title ?? null}
          completedSessions={
            (libraryState.focusSessions ?? []).filter(
              (session) => session.completion !== "ended-early",
            ).length
          }
          dailyXp={currentDailyXp}
          onOpen={() => {
            setRewardSummary(null);
            setIsFocusTargetSelectionMode(false);
            setIsTimerOpen(true);
          }}
          onToggle={timer.isRunning ? pauseFocusTimer : startFocusTimer}
        />
        <div className="library-scene-heading">
          <span className="library-eyebrow">
            RAF {String(activeShelfIndex + 1).padStart(2, "0")}{" "}
            <span aria-hidden="true">/</span> {activeShelf.title}
          </span>
          <span>
            {activeShelfItems.filter(isBookItem).length} kitap{" "}
            <span aria-hidden="true">·</span> Her odak, yeni bir hikâye.
          </span>
        </div>
        <Scene
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
          onOpenBook={(bookId) => {
            const book = books.find((candidate) => candidate.id === bookId);
            setSelectedNoteBaseline(book ?? null);
            setSelectedNoteBookId(bookId);
          }}
          onOpenTasks={() => setIsTaskOpen(true)}
          onOpenTimer={() => {
            setRewardSummary(null);
            setIsFocusTargetSelectionMode(false);
            setIsTimerOpen(true);
          }}
        />
        <div className="library-controls">
          <LibraryNavigation
            shelf={activeShelf}
            shelves={libraryState.shelves}
            onRelative={goToRelativeShelf}
            onSelect={updateActiveShelf}
            onRename={renameActiveShelf}
            onTasks={() => setIsTaskOpen(true)}
            onShelves={() => {
              setIsShelfManagerOpen(true);
              setIsAddMenuOpen(false);
              setIsWardrobeMode(false);
            }}
            onExport={downloadBackup}
            onImport={importBackup}
          />
          <AddMenu
            isOpen={isAddMenuOpen}
            isWardrobeMode={isWardrobeMode}
            onAddBook={addBook}
            onAddDecor={addDecor}
            onAddShelf={addShelf}
            onToggle={() => setIsAddMenuOpen((current) => !current)}
            onToggleWardrobe={toggleWardrobeMode}
          />
        </div>

        {isTimerOpen ? (
          <TimerControlDialog
            canFinish={Boolean(
              libraryState.activeFocusSession &&
              !libraryState.activeFocusSession.needsRestart &&
              getFocusElapsedSeconds(libraryState.activeFocusSession) >= 1,
            )}
            recoveryActions={recoveryActions}
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
            onFinish={finishFocusTimer}
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

        {isFocusTargetSelectionMode ? (
          <div className="library-selection-notice library-panel" role="status">
            <span>Odaklanmak için bir kitap seç.</span>
            <button
              className="library-button"
              type="button"
              onClick={() => {
                setIsFocusTargetSelectionMode(false);
                setIsTimerOpen(true);
              }}
            >
              Vazgeç
            </button>
          </div>
        ) : null}

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
            recoveryActions={recoveryActions}
            book={selectedNoteBook}
            stats={selectedNoteBookStats}
            onArchive={archiveBook}
            onClose={() => setSelectedNoteBookId(null)}
            onSave={saveBookNote}
          />
        ) : null}

        {isShelfManagerOpen ? (
          <ShelfManagerDialog
            recoveryActions={recoveryActions}
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
            recoveryActions={recoveryActions}
            tasks={libraryState.tasks}
            onAddTask={addTask}
            onClose={() => setIsTaskOpen(false)}
            onToggleTask={toggleTask}
          />
        ) : null}
        {persistence.error || storageNotice ? (
          <div
            className="library-storage-notice library-panel"
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
