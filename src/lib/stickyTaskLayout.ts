import type { GridSize } from "@/lib/gridLogic";
import type { LibraryItem, LibraryTask } from "@/types/library";

export const STICKY_VISIBLE_TASK_LIMIT = 9;

export const getActiveTasks = (tasks: LibraryTask[]): LibraryTask[] =>
  tasks.filter((task) => !task.done);

export const getStickyTaskGridSize = (tasks: LibraryTask[]): GridSize => {
  const activeCount = getActiveTasks(tasks).length;

  return {
    widthUnits: 2,
    heightUnits: Math.min(3, Math.max(1, Math.ceil(Math.max(activeCount, 1) / 3))),
  };
};

export const applyStickyTaskSize = <TItem extends LibraryItem>(
  items: TItem[],
  tasks: LibraryTask[],
): TItem[] => {
  const size = getStickyTaskGridSize(tasks);
  let changed = false;
  const nextItems = items.map((item) => {
    if (item.kind !== "sticky" || item.placement !== "shelf") {
      return item;
    }

    if (
      item.widthUnits === size.widthUnits &&
      item.heightUnits === size.heightUnits
    ) {
      return item;
    }

    changed = true;
    return {
      ...item,
      widthUnits: size.widthUnits,
      heightUnits: size.heightUnits,
    };
  });

  return changed ? nextItems : items;
};
