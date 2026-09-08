"use client";

import { useId, useState, type CSSProperties } from "react";
import { ArrowRightLeft, Check, Move, X } from "lucide-react";
import { LibraryDialog } from "@/components/LibraryDialog";
import { LibraryItemVisual } from "@/components/library/LibraryItemVisual";
import { ShelfTimer } from "@/components/library/ShelfTimer";
import { getResolvedCostume } from "@/lib/libraryCostumeDefinitions";
import { resolveLibraryShelfDrop } from "@/lib/libraryDrop";
import {
  DEFAULT_SHELF_ROWS,
  GRID_COLUMN_COUNT,
  SIDE_COLUMN_SLOT_COUNT,
} from "@/lib/libraryInventory";
import {
  isSideColumnEligibleItem,
  isSideColumnPlacedItem,
  isShelfPlacedItem,
  resolveSideColumnDrop,
  type SideColumnTarget,
} from "@/lib/sideColumnLogic";
import type { GridPosition } from "@/lib/gridLogic";
import type {
  DecorPlacement,
  LibraryItem,
  LibraryShelf,
  LibraryTask,
  LibraryWardrobeState,
} from "@/types/library";

export type MobileLibrarySceneProps = {
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
  onOpenBook: (bookId: string) => void;
  onOpenTimer: () => void;
  onToggleTimer: () => Promise<boolean>;
  onOpenTasks: () => void;
  onSelectFocusBook: (bookId: string) => void;
  onSelectWardrobeItem: (itemId: string) => void;
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
};

type PlacementDialogProps = Pick<
  MobileLibrarySceneProps,
  "shelf" | "items" | "tasks" | "onMoveItem" | "onMoveSideItem"
> & {
  item: LibraryItem;
  onClose: () => void;
};

/** Uses the same placement rules as dragging, without shrinking the saved grid. */
const ItemPlacementDialog = ({
  item,
  shelf,
  items,
  tasks,
  onMoveItem,
  onMoveSideItem,
  onClose,
}: PlacementDialogProps) => {
  const headingId = useId();
  const statusId = useId();
  const [placement, setPlacement] = useState<DecorPlacement>(
    isSideColumnPlacedItem(item) ? item.placement : "shelf",
  );
  const [row, setRow] = useState(item.row);
  const [col, setCol] = useState(item.col);
  const [sideSlot, setSideSlot] = useState(
    isSideColumnPlacedItem(item) ? item.sideSlot : 0,
  );
  const metrics = {
    columnCount: GRID_COLUMN_COUNT,
    rowCount: DEFAULT_SHELF_ROWS,
  };
  const resolution =
    placement === "shelf"
      ? resolveLibraryShelfDrop({
          itemId: item.id,
          items,
          metrics,
          position: { row, col },
          shelf,
          tasks,
        })
      : resolveSideColumnDrop(
          item.id,
          { placement, sideSlot },
          items,
          SIDE_COLUMN_SLOT_COUNT,
          { metrics, tasks },
        );
  const blocked = resolution.type === "snap-back";
  const isSwap = resolution.type === "swap";

  return (
    <LibraryDialog
      aria-labelledby={headingId}
      className="mobile-placement-backdrop"
      onClose={onClose}
      dismissOnBackdrop
    >
      <form
        className="library-panel mobile-placement-panel"
        onSubmit={(event) => {
          event.preventDefault();
          if (blocked) return;
          if (placement === "shelf") onMoveItem(shelf, item.id, { row, col });
          else onMoveSideItem(shelf, item.id, { placement, sideSlot });
          onClose();
        }}
      >
        <header className="mobile-placement-heading">
          <div>
            <p className="library-eyebrow">Raf düzeni</p>
            <h2 id={headingId}>Yerini değiştir</h2>
          </div>
          <button
            className="library-button library-button--icon"
            aria-label="Yer değiştirmeyi kapat"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden size={18} />
          </button>
        </header>
        <p className="mobile-placement-title">{item.title}</p>
        {isSideColumnEligibleItem(item) ? (
          <label className="mobile-placement-field">
            Konum
            <select
              aria-label="Konum"
              className="library-field"
              value={placement}
              onChange={(event) =>
                setPlacement(event.target.value as DecorPlacement)
              }
            >
              <option value="shelf">Kitaplık rafı</option>
              <option value="left-column">Sol süsleme alanı</option>
              <option value="right-column">Sağ süsleme alanı</option>
            </select>
          </label>
        ) : null}
        <div className="mobile-placement-fields">
          {placement === "shelf" ? (
            <>
              <label className="mobile-placement-field">
                Raf katı
                <select
                  aria-label="Raf katı"
                  className="library-field"
                  value={row}
                  onChange={(event) => setRow(Number(event.target.value))}
                >
                  {Array.from({ length: DEFAULT_SHELF_ROWS }, (_, index) => (
                    <option key={index} value={index}>
                      {index + 1}. kat
                    </option>
                  ))}
                </select>
              </label>
              <label className="mobile-placement-field">
                Raf sırası
                <select
                  aria-label="Raf sırası"
                  className="library-field"
                  value={col}
                  onChange={(event) => setCol(Number(event.target.value))}
                >
                  {Array.from({ length: GRID_COLUMN_COUNT }, (_, index) => (
                    <option key={index} value={index}>
                      {index + 1}. sıra
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <label className="mobile-placement-field">
              Süsleme yeri
              <select
                aria-label="Süsleme yeri"
                className="library-field"
                value={sideSlot}
                onChange={(event) => setSideSlot(Number(event.target.value))}
              >
                {Array.from({ length: SIDE_COLUMN_SLOT_COUNT }, (_, index) => (
                  <option key={index} value={index}>
                    {index + 1}. yer
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <p
          id={statusId}
          role="status"
          className="mobile-placement-status"
          data-blocked={blocked}
        >
          {blocked
            ? "Bu konumda yeterli yer yok. Başka bir kat veya sıra seç."
            : isSwap
              ? "Bu konumdaki nesneyle yer değiştirilecek."
              : "Nesnen bu konuma yerleştirilecek."}
        </p>
        <div className="mobile-placement-actions">
          <button type="button" className="library-button" onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="submit"
            className="library-button library-button--primary"
            disabled={blocked}
            aria-describedby={statusId}
          >
            <ArrowRightLeft aria-hidden size={16} /> Yerleştir
          </button>
        </div>
      </form>
    </LibraryDialog>
  );
};

export const MobileLibraryScene = (props: MobileLibrarySceneProps) => {
  const {
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
    onOpenBook,
    onOpenTimer,
    onToggleTimer,
    onOpenTasks,
    onSelectFocusBook,
    onSelectWardrobeItem,
  } = props;
  const [isArranging, setIsArranging] = useState(false);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const movingItem = items.find((item) => item.id === movingItemId);
  const shelfItems = items.filter(isShelfPlacedItem);
  const sideItems = items.filter(isSideColumnPlacedItem);
  // Sort only the rendered copy. Persisted coordinates and sizes never depend on a viewport.
  const rows = Array.from({ length: DEFAULT_SHELF_ROWS }, (_, row) => ({
    row,
    items: shelfItems
      .filter((item) => item.row === row)
      .sort((a, b) => a.col - b.col),
  })).filter((row) => row.items.length > 0);

  const renderItem = (item: LibraryItem) => {
    const costume = getResolvedCostume(item, wardrobe);
    const isSelected = isWardrobeMode
      ? item.id === selectedWardrobeItemId
      : item.kind === "book" && item.id === selectedFocusBookId;
    const itemAttributes = {
      "data-selected": isSelected,
      "data-item-id": item.id,
      "data-item-kind": item.kind,
      "data-grid-row": isShelfPlacedItem(item) ? item.row : undefined,
      "data-grid-col": isShelfPlacedItem(item) ? item.col : undefined,
      "data-side-placement": isSideColumnPlacedItem(item)
        ? item.placement
        : undefined,
      "data-side-slot": isSideColumnPlacedItem(item)
        ? item.sideSlot
        : undefined,
    };
    const timerVisual =
      item.kind === "timer" ? (
        <ShelfTimer
          item={item}
          costume={costume}
          timerText={timerText}
          isRunning={isTimerRunning}
          targetTitle={selectedFocusBookTitle}
          onOpen={onOpenTimer}
          onToggle={onToggleTimer}
          isEditing={isWardrobeMode || isArranging}
        />
      ) : null;
    if (item.kind === "timer" && !isWardrobeMode && !isArranging) {
      return (
        <li
          key={item.id}
          className="mobile-library-entry mobile-library-entry--timer"
        >
          <div
            className="mobile-library-timer"
            {...itemAttributes}
            onClick={(event) => {
              event.currentTarget
                .querySelector<HTMLButtonElement>('[data-focus-key$="-open"]')
                ?.focus();
              onOpenTimer();
            }}
          >
            {timerVisual}
          </div>
        </li>
      );
    }
    const actionLabel = isWardrobeMode
      ? "Kostüm seç"
      : isFocusTargetSelectionMode && item.kind === "book"
        ? "Odak hedefi seç"
        : isArranging
          ? "Yerini değiştir"
          : item.kind === "book"
            ? "Çalışma defteri"
            : item.kind === "timer"
              ? "Odak saati"
              : item.kind === "sticky"
                ? "Görevler"
                : "Yerini değiştir";

    return (
      <li
        key={item.id}
        className={`mobile-library-entry mobile-library-entry--${item.kind}`}
      >
        <button
          type="button"
          className="mobile-library-item"
          aria-label={
            isArranging && !isWardrobeMode && !isFocusTargetSelectionMode
              ? `${item.title}: yerini değiştir`
              : item.title
          }
          aria-pressed={
            isWardrobeMode ||
            (isFocusTargetSelectionMode && item.kind === "book")
              ? isSelected
              : undefined
          }
          {...itemAttributes}
          onClick={() => {
            if (isWardrobeMode) onSelectWardrobeItem(item.id);
            else if (isFocusTargetSelectionMode && item.kind === "book")
              onSelectFocusBook(item.id);
            else if (isArranging) setMovingItemId(item.id);
            else if (item.kind === "book") onOpenBook(item.id);
            else if (item.kind === "timer") onOpenTimer();
            else if (item.kind === "sticky") onOpenTasks();
            else setMovingItemId(item.id);
          }}
        >
          <span className="mobile-library-object-space" aria-hidden>
            <span
              className={`library-item library-item--${item.kind} ${item.kind === "book" ? `bg-gradient-to-b ${item.color}` : ""} ${costume.className} mobile-library-object`}
              style={
                item.kind === "sticky"
                  ? ({
                      "--mobile-note-rows": Math.ceil(item.heightUnits),
                    } as CSSProperties)
                  : undefined
              }
            >
              {timerVisual ?? (
                <LibraryItemVisual
                  costume={costume}
                  item={item}
                  tasks={tasks}
                  timerText={timerText}
                  isTimerRunning={isTimerRunning}
                  selectedFocusBookTitle={selectedFocusBookTitle}
                />
              )}
            </span>
            {isSelected ? (
              <span className="mobile-library-selection">
                <Check size={14} />
              </span>
            ) : null}
          </span>
          <span className="mobile-library-item-title">
            {item.kind === "timer" ? "Odak saati" : item.title}
          </span>
          <span className="mobile-library-item-hint">{actionLabel}</span>
        </button>
      </li>
    );
  };

  return (
    <section
      className="mobile-library-scene"
      aria-label={`${shelf.title} kitaplığı`}
      data-mobile-library
    >
      <div className="mobile-library-toolbar">
        <span className="library-eyebrow">Kitaplığın</span>
        <button
          className="library-button library-button--quiet"
          type="button"
          aria-pressed={isArranging}
          disabled={isWardrobeMode || isFocusTargetSelectionMode}
          onClick={() => setIsArranging((current) => !current)}
        >
          {isArranging ? (
            <Check aria-hidden size={15} />
          ) : (
            <Move aria-hidden size={15} />
          )}
          {isArranging ? "Düzenlemeyi bitir" : "Rafı düzenle"}
        </button>
      </div>
      {isArranging && !isWardrobeMode && !isFocusTargetSelectionMode ? (
        <p className="mobile-library-instruction">
          Yerini değiştirmek istediğin nesneye dokun.
        </p>
      ) : null}
      <div className="mobile-library-case">
        {rows.map(({ row, items: rowItems }) => (
          <section
            className="mobile-library-row"
            key={row}
            aria-label={`${row + 1}. raf katı`}
            data-has-timer={rowItems.some((item) => item.kind === "timer")}
          >
            <span className="mobile-library-row-label">
              {String(row + 1).padStart(2, "0")}
            </span>
            <ul className="mobile-library-objects">
              {rowItems.map(renderItem)}
            </ul>
          </section>
        ))}
        {sideItems.length ? (
          <section
            className="mobile-library-row mobile-library-row--decor"
            aria-label="Notlar ve süslemeler"
          >
            <span className="mobile-library-decor-label">
              Notlar & süslemeler
            </span>
            <ul className="mobile-library-objects">
              {[...sideItems]
                .sort((a, b) => a.sideSlot - b.sideSlot)
                .map(renderItem)}
            </ul>
          </section>
        ) : null}
        {items.every((item) => item.kind === "timer") ? (
          <p className="mobile-library-empty">
            Yeni bir hikâyeye yer var. Kitap ekle veya bir odak seansı tamamla.
          </p>
        ) : null}
      </div>
      {movingItem ? (
        <ItemPlacementDialog
          key={movingItem.id}
          {...props}
          item={movingItem}
          onClose={() => setMovingItemId(null)}
        />
      ) : null}
    </section>
  );
};
