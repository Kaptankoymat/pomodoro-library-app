import { resolveDrop, type GridPosition } from "@/lib/gridLogic";
import { isShelfPlacedItem } from "@/lib/sideColumnLogic";
import { getStickyTaskGridSize } from "@/lib/stickyTaskLayout";
import { isBookItem, type LibraryItem, type LibraryShelf, type LibraryTask } from "@/types/library";

export const resolveLibraryShelfDrop = (params: {
  itemId: string;
  items: LibraryItem[];
  metrics: { columnCount: number; rowCount: number };
  position: GridPosition;
  shelf: LibraryShelf;
  tasks?: LibraryTask[];
}) => {
  const draggedItem = params.items.find((item) => item.id === params.itemId);
  const shelfItems = params.items.filter(
    (item) => item.shelfId === params.shelf.id && isShelfPlacedItem(item),
  );
  const resolutionItems =
    draggedItem && draggedItem.shelfId === params.shelf.id && !isShelfPlacedItem(draggedItem)
      ? [
          ...shelfItems,
          {
            ...draggedItem,
            ...(draggedItem.kind === "sticky" && params.tasks
              ? getStickyTaskGridSize(params.tasks) : {}),
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
