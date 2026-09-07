"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseLibraryBackup, readLibraryState } from "@/lib/libraryBackup";

const DATABASE_NAME = "pomodoro-library";
const DATABASE_VERSION = 1;
const STORE_NAME = "states";
const SYNC_CHANNEL_NAME = "pomodoro-library-sync";

type StoredRecord<TValue> = {
  key: string;
  revision: number;
  updatedAt: number;
  value: TValue;
};

export type PersistedStateSetter<TValue> = (
  action: TValue | ((current: TValue) => TValue),
) => Promise<TValue>;

export type PersistenceStatus<TValue> = {
  clearError: () => void;
  error: string | null;
  exportData: () => string;
  importData: (rawValue: string) => Promise<TValue>;
  isHydrated: boolean;
  retryLastSave: () => Promise<boolean>;
};

let databasePromise: Promise<IDBDatabase> | null = null;

const openDatabase = (): Promise<IDBDatabase> => {
  if (databasePromise) {
    return databasePromise;
  }

  const nextDatabasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    let blocked = false;

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      if (blocked) {
        database.close();
        return;
      }
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      database.onclose = () => { databasePromise = null; };
      resolve(database);
    };
    request.onblocked = () => {
      blocked = true;
      reject(new Error("Veri deposu başka bir sekmede açık. Diğer sekmeyi kapatıp tekrar dene."));
    };
    request.onerror = () => reject(request.error ?? new Error("Yerel veri deposu açılamadı."));
  });
  databasePromise = nextDatabasePromise;
  void nextDatabasePromise.catch(() => {
    if (databasePromise === nextDatabasePromise) {
      databasePromise = null;
    }
  });

  return databasePromise;
};

const readRecord = async <TValue,>(key: string): Promise<StoredRecord<TValue> | null> => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(key);

    request.onsuccess = () =>
      resolve((request.result as StoredRecord<TValue> | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Yerel kayıt okunamadı."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Yerel kayıt okunamadı."));
    transaction.onerror = () => reject(transaction.error ?? new Error("Yerel kayıt okunamadı."));
  });
};

const writeRecord = async <TValue,>(
  key: string,
  action: TValue | ((current: TValue) => TValue),
  fallbackValue: TValue,
): Promise<StoredRecord<TValue>> => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    let nextRecord: StoredRecord<TValue> | null = null;

    request.onsuccess = () => {
      try {
        const currentRecord = request.result as StoredRecord<TValue> | undefined;
        const currentValue = assertImportValue<TValue>(currentRecord?.value ?? fallbackValue);
        const nextValue = assertImportValue<TValue>(
          typeof action === "function"
            ? (action as (current: TValue) => TValue)(currentValue)
            : action,
        );
        if (currentRecord && nextValue === currentRecord.value) {
          nextRecord = currentRecord;
          return;
        }
        nextRecord = {
          key,
          revision: (Number.isSafeInteger(currentRecord?.revision) ? currentRecord!.revision : 0) + 1,
          updatedAt: Date.now(),
          value: nextValue,
        };
        store.put(nextRecord);
      } catch (error) {
        transaction.abort();
        reject(error);
      }
    };
    request.onerror = () => reject(request.error ?? new Error("Yerel kayıt okunamadı."));
    transaction.oncomplete = () => {
      if (nextRecord) {
        resolve(nextRecord);
      }
    };
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Değişiklik kaydedilemedi."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Değişiklik kaydedilemedi."));
  });
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Değişiklik kaydedilemedi.";

const notifyOtherTabs = (key: string, revision: number): void => {
  if (typeof BroadcastChannel === "undefined") return;

  try {
    const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    channel.postMessage({ key, revision });
    channel.close();
  } catch {
    // The data is already persisted; tab synchronization is best-effort.
  }
};

const assertImportValue = <TValue,>(value: unknown): TValue => {
  return readLibraryState(value) as TValue;
};

export const useLocalStorageState = <TValue,>(
  key: string,
  initialValue: TValue,
): [TValue, PersistedStateSetter<TValue>, PersistenceStatus<TValue>] => {
  const [value, setValue] = useState<TValue>(initialValue);
  const valueRef = useRef(value);
  const [isHydrated, setIsHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readyRef = useRef(false);
  const revisionRef = useRef(0);
  const reloadRef = useRef<(() => Promise<boolean>) | null>(null);
  const recoveryRawValueRef = useRef<string | null>(null);
  const pendingActionRef = useRef<
    TValue | ((current: TValue) => TValue) | null
  >(null);
  const pendingValueRef = useRef<TValue | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    readyRef.current = false;
    revisionRef.current = 0;
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      }
    } catch {
      // Storage still works in browsers that disallow cross-tab messaging.
    }

    const load = async () => {
      let legacyRawValue: string | null = null;

      try {
        let record = await readRecord<TValue>(key);
        if (record) {
          recoveryRawValueRef.current = JSON.stringify({ app: "pomodoro-library", version: 1, data: record.value });
          record = { ...record, value: assertImportValue<TValue>(record.value) };
        }

        if (!record) {
          legacyRawValue = window.localStorage.getItem(key);
          let migratedValue = initialValue;

          if (legacyRawValue) {
            const backupKey = `${key}:legacy-backup`;
            migratedValue = assertImportValue<TValue>(JSON.parse(legacyRawValue));
            try {
              if (!window.localStorage.getItem(backupKey)) {
                window.localStorage.setItem(backupKey, legacyRawValue);
              }
            } catch {
              // The original legacy key remains intact if backup space is full.
            }
          }

          record = await writeRecord(key, (current) => current, migratedValue);
        }

        if (!cancelled) {
          valueRef.current = record.value;
          revisionRef.current = record.revision;
          readyRef.current = true;
          recoveryRawValueRef.current = null;
          setValue(record.value);
          setError(null);
        }
        return !cancelled;
      } catch (loadError) {
        if (!cancelled) {
          if (legacyRawValue) recoveryRawValueRef.current = legacyRawValue;
          setError(
            `Kayıt açılamadı: ${getErrorMessage(loadError)} Mevcut veri değiştirilmedi.`,
          );
        }
        return false;
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    };
    reloadRef.current = load;

    if (channel) {
      channel.onmessage = async (event: MessageEvent<{ key?: string }>) => {
        if (event.data?.key !== key) {
          return;
        }

        try {
          const record = await readRecord<TValue>(key);
          if (record && !cancelled && record.revision > revisionRef.current) {
            const syncedValue = assertImportValue<TValue>(record.value);
            revisionRef.current = record.revision;
            valueRef.current = syncedValue;
            setValue(syncedValue);
          }
        } catch (syncError) {
          if (!cancelled) {
            setError(
              `Diğer sekmedeki değişiklik okunamadı: ${getErrorMessage(syncError)}`,
            );
          }
        }
      };
    }

    void load();

    return () => {
      cancelled = true;
      reloadRef.current = null;
      channel?.close();
    };
  }, [initialValue, key]);

  const setStoredValue = useCallback<PersistedStateSetter<TValue>>(
    async (action) => {
      if (!readyRef.current) {
        setError("Veri yüklenmeden değişiklik yapılamaz. Lütfen kısa bir süre sonra tekrar dene.");
        return valueRef.current;
      }

      let attemptedValue: TValue | null = null;

      try {
        const record = await writeRecord(
          key,
          (currentValue) => {
            attemptedValue =
              typeof action === "function"
                ? (action as (current: TValue) => TValue)(currentValue)
                : action;
            return attemptedValue;
          },
          valueRef.current,
        );
        if (record.revision >= revisionRef.current) {
          revisionRef.current = record.revision;
          valueRef.current = record.value;
          setValue(record.value);
        }
        setError(null);
        pendingActionRef.current = null;
        pendingValueRef.current = null;

        notifyOtherTabs(key, record.revision);
        return record.value;
      } catch (saveError) {
        pendingActionRef.current = action;
        pendingValueRef.current = attemptedValue;
        setError(`Değişiklik kaydedilemedi: ${getErrorMessage(saveError)}`);
        return valueRef.current;
      }
    },
    [key],
  );

  const exportData = useCallback(
    () => {
      if (recoveryRawValueRef.current) {
        return recoveryRawValueRef.current;
      }

      const exportValue = pendingValueRef.current ?? valueRef.current;

      return JSON.stringify(
        {
          app: "pomodoro-library",
          exportedAt: new Date().toISOString(),
          version: 1,
          data: exportValue,
        },
        null,
        2,
      );
    },
    [],
  );

  const importData = useCallback(
    async (rawValue: string) => {
      const importedValue = parseLibraryBackup(rawValue) as TValue;
      window.localStorage.setItem(
        `${key}:pre-import-backup:${Date.now()}`,
        JSON.stringify(valueRef.current),
      );
      const record = await writeRecord(key, importedValue, valueRef.current);
      readyRef.current = true;
      revisionRef.current = record.revision;
      recoveryRawValueRef.current = null;
      valueRef.current = record.value;
      setValue(record.value);
      setError(null);
      pendingActionRef.current = null;
      pendingValueRef.current = null;
      notifyOtherTabs(key, record.revision);
      return record.value;
    },
    [key],
  );

  const retryLastSave = useCallback(async () => {
    if (!readyRef.current) return await reloadRef.current?.() ?? false;
    const action = pendingActionRef.current;
    if (action === null) {
      setError(null);
      return true;
    }

    try {
      const record = await writeRecord(key, action, valueRef.current);
      pendingActionRef.current = null;
      pendingValueRef.current = null;
      valueRef.current = record.value;
      revisionRef.current = record.revision;
      setValue(record.value);
      setError(null);
      notifyOtherTabs(key, record.revision);
      return true;
    } catch (retryError) {
      setError(`Değişiklik yine kaydedilemedi: ${getErrorMessage(retryError)}`);
      return false;
    }
  }, [key]);

  return [
    value,
    setStoredValue,
    {
      clearError: () => setError(null),
      error,
      exportData,
      importData,
      isHydrated,
      retryLastSave,
    },
  ];
};
