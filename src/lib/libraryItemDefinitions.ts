import type { GridSize } from "@/lib/gridLogic";
import type { LibraryItem, LibraryItemKind } from "@/types/library";

type LibraryItemDesign = GridSize & {
  color: string;
};

export const ITEM_DESIGN_VERSION = 6;

export const ITEM_DESIGNS = {
  book: {
    widthUnits: 1,
    heightUnits: 0.95,
    color: "from-rose-800 to-rose-950",
  },
  timer: {
    widthUnits: 4,
    heightUnits: 0.5,
    color: "from-[#7a4a24] to-[#3e2311]",
  },
  painting: {
    widthUnits: 3.5,
    heightUnits: 0.75,
    color: "from-sky-800 to-stone-950",
  },
  plant: {
    widthUnits: 1,
    heightUnits: 1,
    color: "from-green-800 to-green-950",
  },
  sticky: {
    widthUnits: 4,
    heightUnits: 1,
    color: "from-amber-300 to-yellow-600",
  },
} satisfies Record<LibraryItemKind, LibraryItemDesign>;

export const getLibraryItemDesign = (
  kind: LibraryItemKind,
): LibraryItemDesign => ITEM_DESIGNS[kind];

export const getItemGridSize = (kind: LibraryItemKind): GridSize => {
  const design = getLibraryItemDesign(kind);

  return {
    widthUnits: design.widthUnits,
    heightUnits: design.heightUnits,
  };
};

export const applyLibraryItemDesign = <TItem extends LibraryItem>(
  item: TItem,
): TItem => {
  const design = getLibraryItemDesign(item.kind);
  const nextColor = item.kind === "book" ? item.color || design.color : design.color;

  if (
    item.widthUnits === design.widthUnits &&
    item.heightUnits === design.heightUnits &&
    item.color === nextColor
  ) {
    return item;
  }

  return {
    ...item,
    widthUnits: design.widthUnits,
    heightUnits: design.heightUnits,
    color: nextColor,
  } as TItem;
};

export const normalizeLibraryItemDesigns = <TItem extends LibraryItem>(
  items: TItem[],
): TItem[] => {
  let changed = false;
  const normalizedItems = items.map((item) => {
    const normalizedItem = applyLibraryItemDesign(item);

    changed = changed || normalizedItem !== item;
    return normalizedItem;
  });

  return changed ? normalizedItems : items;
};
