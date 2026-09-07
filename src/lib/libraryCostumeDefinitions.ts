import { getItemGridSize } from "@/lib/libraryItemDefinitions";
import type {
  BookSkin,
  CostumeAssetMode,
  CostumeId,
  CostumeSource,
  CostumeVisibility,
  LibraryItem,
  LibraryItemKind,
  LibraryWardrobeState,
} from "@/types/library";
import type { GridSize } from "@/lib/gridLogic";

export type CostumeRarity = "common" | "rare" | "secret";

export type CostumeDefinition = {
  id: CostumeId;
  kind: LibraryItemKind;
  name: string;
  description: string;
  rarity: CostumeRarity;
  source: CostumeSource;
  visibility: CostumeVisibility;
  assetMode: CostumeAssetMode;
  className: string;
  contentClassName?: string;
  frameClassName?: string;
  pngSrc?: string;
  svgKey?: string;
  pixelated?: boolean;
  size?: GridSize;
  unlockHint?: string;
  unlockLevel?: number;
};

const costume = (definition: CostumeDefinition): CostumeDefinition => definition;

export const COSTUME_DEFINITIONS = [
  costume({
    id: "book:classic",
    kind: "book",
    name: "Classic Tome",
    description: "Klasik lo-fi çalışma kitabı.",
    rarity: "common",
    source: "default",
    visibility: "visible",
    assetMode: "css",
    className: "",
  }),
  costume({
    id: "book:arcane",
    kind: "book",
    name: "Arcane Tome",
    description: "Altın çizgili mistik kitap cildi.",
    rarity: "rare",
    source: "focus-drop",
    visibility: "visible",
    assetMode: "css",
    className:
      "ring-1 ring-amber-300/70 shadow-[inset_2px_0_4px_rgba(255,255,255,0.28),inset_-2px_0_4px_rgba(0,0,0,0.28),0_0_14px_rgba(251,191,36,0.24)]",
    contentClassName: "after:absolute after:inset-x-1 after:top-1/2 after:h-px after:bg-amber-200/50",
    size: { widthUnits: 1, heightUnits: 0.95 },
    unlockHint: "Focus hedefi level 2 olunca düşebilir.",
    unlockLevel: 2,
  }),
  costume({
    id: "book:secret",
    kind: "book",
    name: "Moon Archive",
    description: "Gizli ay ışığı arşivi.",
    rarity: "secret",
    source: "focus-drop",
    visibility: "secret",
    assetMode: "png",
    pngSrc: "/costumes/book_moon_archive.png",
    pixelated: true,
    className:
      "ring-1 ring-cyan-200/70 shadow-[inset_2px_0_4px_rgba(255,255,255,0.22),inset_-2px_0_4px_rgba(0,0,0,0.35),0_0_18px_rgba(125,211,252,0.28)]",
    unlockHint: "Nadir focus drop.",
    unlockLevel: 4,
  }),
  costume({
    id: "plant:classic",
    kind: "plant",
    name: "Fern Pot",
    description: "Klasik saksı.",
    rarity: "common",
    source: "default",
    visibility: "visible",
    assetMode: "css",
    className: "",
  }),
  costume({
    id: "plant:arcane",
    kind: "plant",
    name: "Runed Planter",
    description: "Rünlü, daha uzun mistik bitki.",
    rarity: "rare",
    source: "focus-drop",
    visibility: "visible",
    assetMode: "css",
    className: "drop-shadow-[0_0_10px_rgba(52,211,153,0.35)]",
    contentClassName: "brightness-110 saturate-125",
    size: { widthUnits: 1, heightUnits: 2 },
    unlockHint: "Focus hedefi level 2 olunca düşebilir.",
    unlockLevel: 2,
  }),
  costume({
    id: "plant:secret",
    kind: "plant",
    name: "Whispering Sprout",
    description: "Gizli piksel filizi.",
    rarity: "secret",
    source: "focus-drop",
    visibility: "secret",
    assetMode: "png",
    pngSrc: "/costumes/plant_whispering_sprout.png",
    pixelated: true,
    className: "drop-shadow-[0_0_14px_rgba(134,239,172,0.34)]",
    unlockHint: "Nadir focus drop.",
    unlockLevel: 4,
  }),
  costume({
    id: "painting:classic",
    kind: "painting",
    name: "Vintage View",
    description: "Klasik manzara çerçevesi.",
    rarity: "common",
    source: "default",
    visibility: "visible",
    assetMode: "css",
    className: "",
  }),
  costume({
    id: "painting:arcane",
    kind: "painting",
    name: "Astral Frame",
    description: "Genişleyen yıldız haritası çerçevesi.",
    rarity: "rare",
    source: "focus-drop",
    visibility: "visible",
    assetMode: "css",
    className: "ring-1 ring-violet-200/70 shadow-[0_0_18px_rgba(196,181,253,0.22)]",
    contentClassName: "saturate-125 hue-rotate-15",
    size: { widthUnits: 4, heightUnits: 1 },
    unlockHint: "Focus hedefi level 2 olunca düşebilir.",
    unlockLevel: 2,
  }),
  costume({
    id: "painting:secret",
    kind: "painting",
    name: "Hidden Window",
    description: "Gizli yıldız penceresi.",
    rarity: "secret",
    source: "focus-drop",
    visibility: "secret",
    assetMode: "png",
    pngSrc: "/costumes/painting_hidden_window.png",
    pixelated: true,
    className: "ring-1 ring-cyan-200/60 shadow-[0_0_18px_rgba(103,232,249,0.22)]",
    unlockHint: "Nadir focus drop.",
    unlockLevel: 4,
  }),
  costume({
    id: "sticky:classic",
    kind: "sticky",
    name: "Pinned Note",
    description: "Klasik görev notu.",
    rarity: "common",
    source: "default",
    visibility: "visible",
    assetMode: "css",
    className: "",
  }),
  costume({
    id: "sticky:arcane",
    kind: "sticky",
    name: "Spell Note",
    description: "Mühürlü, geniş büyü notu.",
    rarity: "rare",
    source: "focus-drop",
    visibility: "visible",
    assetMode: "css",
    className: "bg-gradient-to-b from-purple-200 to-amber-200 text-[#2d2138] ring-1 ring-violet-300/70",
    contentClassName: "after:absolute after:bottom-2 after:left-3 after:right-3 after:h-px after:bg-violet-700/25",
    size: { widthUnits: 4, heightUnits: 1 },
    unlockHint: "Focus hedefi level 2 olunca düşebilir.",
    unlockLevel: 2,
  }),
  costume({
    id: "sticky:secret",
    kind: "sticky",
    name: "Invisible Errand",
    description: "Gizli mühürlü görev parşömeni.",
    rarity: "secret",
    source: "focus-drop",
    visibility: "secret",
    assetMode: "svg",
    svgKey: "sealed-note",
    className: "bg-gradient-to-b from-stone-100 to-amber-100 ring-1 ring-amber-300/60",
    unlockHint: "Nadir focus drop.",
    unlockLevel: 4,
  }),
  costume({
    id: "timer:classic",
    kind: "timer",
    name: "Focus Dial",
    description: "Klasik çalışma sayacı.",
    rarity: "common",
    source: "default",
    visibility: "visible",
    assetMode: "css",
    className: "",
  }),
  costume({
    id: "timer:arcane",
    kind: "timer",
    name: "Chronomancer",
    description: "Daha büyük, rünlü zaman paneli.",
    rarity: "rare",
    source: "focus-drop",
    visibility: "visible",
    assetMode: "css",
    className:
      "ring-1 ring-amber-300/70 shadow-[inset_0_2px_4px_rgba(255,255,255,0.12),0_0_18px_rgba(251,191,36,0.24)]",
    contentClassName: "text-amber-200",
    size: { widthUnits: 4, heightUnits: 1 },
    unlockHint: "Focus hedefi level 2 olunca düşebilir.",
    unlockLevel: 2,
  }),
  costume({
    id: "timer:secret",
    kind: "timer",
    name: "Midnight Clock",
    description: "Gizli gece sayacı.",
    rarity: "secret",
    source: "focus-drop",
    visibility: "secret",
    assetMode: "png",
    pngSrc: "/costumes/timer_midnight_clock.png",
    pixelated: true,
    className: "ring-1 ring-cyan-200/60 shadow-[0_0_20px_rgba(125,211,252,0.25)]",
    unlockHint: "Nadir focus drop.",
    unlockLevel: 4,
  }),
] as const satisfies CostumeDefinition[];

export const COSTUME_BY_ID = new Map<CostumeId, CostumeDefinition>(
  COSTUME_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export const DEFAULT_COSTUME_BY_KIND = Object.fromEntries(
  COSTUME_DEFINITIONS.filter((definition) => definition.source === "default").map(
    (definition) => [definition.kind, definition.id],
  ),
) as Record<LibraryItemKind, CostumeId>;

export const INITIAL_UNLOCKED_COSTUME_IDS = Object.values(DEFAULT_COSTUME_BY_KIND);

const legacyBookSkinCostumeMap: Record<BookSkin, CostumeId> = {
  botanical: "book:arcane",
  classic: "book:classic",
  gilded: "book:arcane",
  moonlit: "book:secret",
  obsidian: "book:secret",
};

export const getCostumeDefinition = (
  costumeId: CostumeId | undefined,
): CostumeDefinition | undefined => (costumeId ? COSTUME_BY_ID.get(costumeId) : undefined);

export const getCostumesForKind = (kind: LibraryItemKind): CostumeDefinition[] =>
  COSTUME_DEFINITIONS.filter((definition) => definition.kind === kind);

export const getDefaultCostumeId = (kind: LibraryItemKind): CostumeId =>
  DEFAULT_COSTUME_BY_KIND[kind];

export const getItemBaseCostumeId = (
  item: LibraryItem,
  wardrobe?: LibraryWardrobeState,
): CostumeId =>
  item.costumeId ??
  wardrobe?.defaultCostumeByKind[item.kind] ??
  getDefaultCostumeId(item.kind);

export const getResolvedCostume = (
  item: LibraryItem,
  wardrobe?: LibraryWardrobeState,
): CostumeDefinition => {
  const costumeId = getItemBaseCostumeId(item, wardrobe);
  const costumeDefinition = getCostumeDefinition(costumeId);

  return costumeDefinition?.kind === item.kind
    ? costumeDefinition
    : getCostumeDefinition(getDefaultCostumeId(item.kind))!;
};

export const getResolvedItemGridSize = (
  item: LibraryItem,
  wardrobe?: LibraryWardrobeState,
): GridSize => getResolvedCostume(item, wardrobe).size ?? getItemGridSize(item.kind);

export const isCostumeUnlocked = (
  wardrobe: LibraryWardrobeState,
  costumeId: CostumeId,
): boolean => wardrobe.unlockedCostumeIds.includes(costumeId);

export const isCostumeRevealed = (
  wardrobe: LibraryWardrobeState,
  definition: CostumeDefinition,
): boolean =>
  definition.visibility === "visible" ||
  isCostumeUnlocked(wardrobe, definition.id) ||
  wardrobe.revealedSecretCostumeIds.includes(definition.id);

export const createInitialWardrobeState = (): LibraryWardrobeState => ({
  defaultCostumeByKind: { ...DEFAULT_COSTUME_BY_KIND },
  revealedSecretCostumeIds: [],
  tokens: 0,
  unlockedCostumeIds: [...INITIAL_UNLOCKED_COSTUME_IDS],
});

const mergeIds = (ids: CostumeId[]): CostumeId[] => Array.from(new Set(ids));

export const normalizeWardrobeState = (
  wardrobe: LibraryWardrobeState | undefined,
): LibraryWardrobeState => {
  const initialWardrobe = createInitialWardrobeState();

  return {
    defaultCostumeByKind: {
      ...DEFAULT_COSTUME_BY_KIND,
      ...(wardrobe?.defaultCostumeByKind ?? {}),
    },
    revealedSecretCostumeIds: mergeIds([
      ...(wardrobe?.revealedSecretCostumeIds ?? []),
    ]),
    tokens: wardrobe?.tokens ?? 0,
    unlockedCostumeIds: mergeIds([
      ...initialWardrobe.unlockedCostumeIds,
      ...(wardrobe?.unlockedCostumeIds ?? []),
    ]),
  };
};

export const areWardrobeStatesEqual = (
  left: LibraryWardrobeState | undefined,
  right: LibraryWardrobeState,
): boolean => {
  if (!left) {
    return false;
  }

  return (
    left.tokens === right.tokens &&
    JSON.stringify(left.defaultCostumeByKind) ===
      JSON.stringify(right.defaultCostumeByKind) &&
    JSON.stringify([...left.revealedSecretCostumeIds].sort()) ===
      JSON.stringify([...right.revealedSecretCostumeIds].sort()) &&
    JSON.stringify([...left.unlockedCostumeIds].sort()) ===
      JSON.stringify([...right.unlockedCostumeIds].sort())
  );
};

export const normalizeItemsForCostumes = (
  items: LibraryItem[],
  wardrobe: LibraryWardrobeState,
): {
  items: LibraryItem[];
  wardrobe: LibraryWardrobeState;
} => {
  let changed = false;
  const unlockedCostumeIds = new Set(wardrobe.unlockedCostumeIds);
  const revealedSecretCostumeIds = new Set(wardrobe.revealedSecretCostumeIds);
  const normalizedItems = items.map((item) => {
    const legacySkin = item.kind === "book" ? item.skin : undefined;
    const legacyUnlockedSkins = item.kind === "book" ? item.unlockedSkins : undefined;
    const legacyCostumeId =
      legacySkin && legacySkin !== "classic"
        ? legacyBookSkinCostumeMap[legacySkin]
        : undefined;
    const defaultCostumeId =
      wardrobe.defaultCostumeByKind[item.kind] ?? getDefaultCostumeId(item.kind);
    const nextCostumeId =
      item.costumeId === defaultCostumeId
        ? undefined
        : item.costumeId ?? legacyCostumeId;
    const resolvedCostume = getCostumeDefinition(nextCostumeId);
    const gridSize = getResolvedItemGridSize(
      {
        ...item,
        costumeId:
          resolvedCostume?.kind === item.kind ? resolvedCostume.id : undefined,
      },
      wardrobe,
    );

    if (legacyUnlockedSkins) {
      for (const skin of legacyUnlockedSkins) {
        const costumeId = legacyBookSkinCostumeMap[skin];

        unlockedCostumeIds.add(costumeId);

        if (getCostumeDefinition(costumeId)?.visibility === "secret") {
          revealedSecretCostumeIds.add(costumeId);
        }
      }
    }

    if (resolvedCostume?.visibility === "secret") {
      revealedSecretCostumeIds.add(resolvedCostume.id);
    }

    const normalizedItem = {
      ...item,
      costumeId: resolvedCostume?.kind === item.kind ? resolvedCostume.id : undefined,
      heightUnits: gridSize.heightUnits,
      level: item.level ?? 1,
      widthUnits: gridSize.widthUnits,
      xp: item.xp ?? 0,
    };

    if (
      normalizedItem.costumeId !== item.costumeId ||
      normalizedItem.heightUnits !== item.heightUnits ||
      normalizedItem.level !== item.level ||
      normalizedItem.widthUnits !== item.widthUnits ||
      normalizedItem.xp !== item.xp
    ) {
      changed = true;
    }

    return normalizedItem;
  });
  const normalizedWardrobe = {
    ...wardrobe,
    revealedSecretCostumeIds: mergeIds([...revealedSecretCostumeIds]),
    unlockedCostumeIds: mergeIds([...unlockedCostumeIds]),
  };

  return {
    items: changed ? normalizedItems : items,
    wardrobe: normalizedWardrobe,
  };
};
