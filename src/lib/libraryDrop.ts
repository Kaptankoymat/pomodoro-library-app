import { resolveDrop, type GridPosition } from "@/lib/gridLogic";
import { isShelfPlacedItem } from "@/lib/sideColumnLogic";
import { isBookItem, type LibraryItem, type LibraryShelf } from "@/types/library";

export const resolveLibraryShelfDrop = (params: {
  itemId: string;
  items: LibraryItem[];
  metrics: { columnCount: number; rowCount: number };
  position: GridPosition;
  shelf: LibraryShelf;
}) => {
  const draggedItem = params.items.find((item) => item.id === params.itemId);
  const shelfItems = params.items.filter(
    (item) => item.shelfId === params.shelf.id && isShelfPlacedItem(item),
  );
  const resolutionItems =
    draggedItem && !isShelfPlacedItem(draggedItem)
      ? [
          ...shelfItems,
          {
            ...draggedItem,
            placement: "shelf" as const,
            sideSlot: undefined,
          },
        ]
      : shelfItems;

  return resolveDrop(params.itemId, params.position, resolutionItems, params.metrics, {
    canSwap: (firstItem, secondItem) =>
      isBookItem(firstItem) && isBookItem(secondItem),
  });
};
