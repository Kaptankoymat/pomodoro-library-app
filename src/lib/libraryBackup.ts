import { LIBRARY_SCHEMA_VERSION } from "@/lib/libraryInventory";
import { normalizeLibraryStateForRuntime } from "@/lib/libraryStateMigration";
import type { LibraryState } from "@/types/library";

function invalidBackup(detail: string): never {
  throw new Error(`Geçersiz kütüphane verisi: ${detail}. Mevcut kayıt değiştirilmedi.`);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isId = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const assertOptionalNumber = (record: Record<string, unknown>, field: string) => {
  if (record[field] !== undefined && !isNonNegativeNumber(record[field])) {
    invalidBackup(`${field} sayısal olmalı`);
  }
};

const assertOptionalString = (record: Record<string, unknown>, field: string) => {
  if (record[field] !== undefined && typeof record[field] !== "string") {
    invalidBackup(`${field} metin olmalı`);
  }
};

const assertTimestamp = (record: Record<string, unknown>, field: string) => {
  assertOptionalNumber(record, field);
  if (typeof record[field] === "number" && record[field] > 8_640_000_000_000_000) {
    invalidBackup(`${field} geçerli bir tarih olmalı`);
  }
};

const assertUniqueIds = (records: unknown[], label: string) => {
  const ids = new Set<string>();
  for (const record of records) {
    if (!isRecord(record) || !isId(record.id) || ids.has(record.id)) {
      invalidBackup(`${label} kimlikleri eksik veya yinelenmiş`);
    }
    ids.add(record.id);
  }
};

/** Validate persisted data before any component or state updater can consume it. */
export const readLibraryState = (value: unknown): LibraryState => {
  if (!isRecord(value)) invalidBackup("kütüphane nesnesi eksik");
  for (const key of ["shelves", "items", "tasks"] as const) {
    if (!Array.isArray(value[key])) invalidBackup(`${key} listesi eksik`);
  }
  if (
    value.schemaVersion !== undefined &&
    (!isNonNegativeNumber(value.schemaVersion) || !Number.isInteger(value.schemaVersion) ||
      value.schemaVersion > LIBRARY_SCHEMA_VERSION)
  ) {
    invalidBackup("bu yedek desteklenmeyen bir uygulama sürümüne ait");
  }
  for (const field of ["shelfColumnCount", "sideColumnSlotCount"]) {
    if (value[field] !== undefined && (
      !isNonNegativeNumber(value[field]) || !Number.isInteger(value[field]) || value[field] === 0
    )) invalidBackup(`${field} pozitif bir tam sayı olmalı`);
  }

  const shelves = value.shelves as unknown[];
  const items = value.items as unknown[];
  const tasks = value.tasks as unknown[];
  if (shelves.length === 0) invalidBackup("en az bir raf gerekli");
  assertUniqueIds(shelves, "raf");
  assertUniqueIds(items, "eşya");
  assertUniqueIds(tasks, "görev");
  const shelfIds = new Set(shelves.map((shelf) => (shelf as Record<string, unknown>).id));

  for (const shelf of shelves as Record<string, unknown>[]) {
    if (typeof shelf.title !== "string") invalidBackup("raf başlığı eksik");
  }

  const validateItem = (item: unknown, archived = false) => {
    if (!isRecord(item)) invalidBackup("eşya kaydı eksik");
    if (
      !["book", "timer", "plant", "painting", "sticky"].includes(String(item.kind)) ||
      (archived && item.kind !== "book") ||
      typeof item.title !== "string" ||
      !isId(item.shelfId) ||
      (!archived && !shelfIds.has(item.shelfId))
    ) {
      invalidBackup("eşya türü, başlığı veya rafı geçersiz");
    }
    for (const field of ["row", "col"]) {
      if (typeof item[field] !== "number" || !Number.isFinite(item[field])) {
        invalidBackup("eşya konumu geçersiz");
      }
    }
    for (const field of ["xp", "level"]) assertOptionalNumber(item, field);
    for (const field of ["color", "note", "costumeId", "skin"]) {
      assertOptionalString(item, field);
    }
    for (const field of ["createdAt", "noteUpdatedAt", "lastStudiedAt", "archivedAt"]) {
      assertTimestamp(item, field);
    }
    if (item.unlockedSkins !== undefined && (
      !Array.isArray(item.unlockedSkins) ||
      !item.unlockedSkins.every((skin) => typeof skin === "string")
    )) {
      invalidBackup("kitap kostümleri listesi geçersiz");
    }
  };
  items.forEach((item) => validateItem(item));
  for (const task of tasks as Record<string, unknown>[]) {
    if (typeof task.title !== "string" || typeof task.done !== "boolean") {
      invalidBackup("görev başlığı veya tamamlanma durumu geçersiz");
    }
    for (const field of ["createdAt", "updatedAt", "completedAt"]) assertTimestamp(task, field);
  }

  for (const key of ["archivedBooks", "focusSessions"] as const) {
    if (value[key] !== undefined) {
      if (!Array.isArray(value[key])) invalidBackup(`${key} listesi geçersiz`);
      assertUniqueIds(value[key] as unknown[], key);
    }
  }
  assertUniqueIds([...items, ...((value.archivedBooks ?? []) as unknown[])], "kitap ve eşya");
  for (const item of (value.archivedBooks ?? []) as unknown[]) validateItem(item, true);
  for (const session of (value.focusSessions ?? []) as Record<string, unknown>[]) {
    for (const field of ["durationSeconds", "awardedXp", "startedAt", "completedAt"]) {
      if (!isNonNegativeNumber(session[field])) invalidBackup("odak geçmişi geçersiz");
    }
    assertTimestamp(session, "startedAt");
    assertTimestamp(session, "completedAt");
    if (session.targetBookId !== null && !isId(session.targetBookId)) {
      invalidBackup("odak geçmişinin kitap kimliği geçersiz");
    }
  }
  if (value.activeFocusSession !== undefined && value.activeFocusSession !== null) {
    const session = value.activeFocusSession;
    if (!isRecord(session) || !isId(session.id)) invalidBackup("etkin odak oturumu geçersiz");
    if (session.targetBookId !== null && !isId(session.targetBookId)) {
      invalidBackup("etkin odak oturumunun kitabı geçersiz");
    }
  }

  if (value.dailyFocus !== undefined) {
    if (
      !isRecord(value.dailyFocus) ||
      typeof value.dailyFocus.dateKey !== "string" ||
      !isNonNegativeNumber(value.dailyFocus.xp)
    ) invalidBackup("günlük odak kaydı geçersiz");
  }
  assertOptionalString(value, "searchQuery");
  if (value.focusMode !== undefined && typeof value.focusMode !== "boolean") {
    invalidBackup("odak modu geçersiz");
  }
  if (value.wardrobe !== undefined && value.wardrobe !== null) {
    if (!isRecord(value.wardrobe)) invalidBackup("kostüm dolabı geçersiz");
    for (const field of ["unlockedCostumeIds", "revealedSecretCostumeIds"]) {
      if (value.wardrobe[field] !== undefined && !Array.isArray(value.wardrobe[field])) {
        invalidBackup("kostüm listesi geçersiz");
      }
    }
    if (
      value.wardrobe.defaultCostumeByKind !== undefined &&
      !isRecord(value.wardrobe.defaultCostumeByKind)
    ) invalidBackup("varsayılan kostümler geçersiz");
  }

  const needsDefaults = value.dailyFocus === undefined || value.focusMode === undefined ||
    value.searchQuery === undefined;
  return normalizeLibraryStateForRuntime((needsDefaults ? {
      ...value,
      dailyFocus: value.dailyFocus ?? { dateKey: "", xp: 0 },
      focusMode: value.focusMode ?? false,
      searchQuery: value.searchQuery ?? "",
    } : value) as LibraryState);
};

export const parseLibraryBackup = (rawValue: string): LibraryState => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return invalidBackup("dosya okunabilir JSON içermiyor");
  }
  if (!isRecord(parsed) || parsed.app !== "pomodoro-library" || !("data" in parsed)) {
    return invalidBackup("seçilen dosya Pomodoro Library yedeği değil");
  }
  if (parsed.version !== 1) {
    return invalidBackup("bu yedek desteklenmeyen bir dosya sürümüne ait");
  }
  return readLibraryState(parsed.data);
};
