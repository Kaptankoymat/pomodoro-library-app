"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
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
        const currentValue = currentRecord?.value ?? fallbackValue;
        const nextValue =
          typeof action === "function"
            ? (action as (current: TValue) => TValue)(currentValue)
            : action;
        nextRecord = {
          key,
          revision: (currentRecord?.revision ?? 0) + 1,
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
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Seçilen dosya geçerli bir Pomodoro Library yedeği değil.");
  }

  const candidate = value as Record<string, unknown>;
  if (
    !Array.isArray(candidate.shelves) ||
    !Array.isArray(candidate.items) ||
    !Array.isArray(candidate.tasks)
  ) {
    throw new Error("Yedekte raf, eşya veya görev verisi eksik.");
  }

  return value as TValue;
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
    const channel =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel(SYNC_CHANNEL_NAME);

    const load = async () => {
      let legacyRawValue: string | null = null;

      try {
        let record = await readRecord<TValue>(key);

        if (!record) {
          legacyRawValue = window.localStorage.getItem(key);
          let migratedValue = initialValue;

          if (legacyRawValue) {
            const backupKey = `${key}:legacy-backup`;
            if (!window.localStorage.getItem(backupKey)) {
              window.localStorage.setItem(backupKey, legacyRawValue);
            }
            migratedValue = assertImportValue<TValue>(JSON.parse(legacyRawValue));
          }

          record = await writeRecord(key, migratedValue, initialValue);
        }

        if (!cancelled) {
          valueRef.current = record.value;
          readyRef.current = true;
          recoveryRawValueRef.current = null;
          setValue(record.value);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          recoveryRawValueRef.current = legacyRawValue;
          setError(
            `Kayıt açılamadı: ${getErrorMessage(loadError)} Mevcut veri değiştirilmedi.`,
          );
        }
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    };

    if (channel) {
      channel.onmessage = async (event: MessageEvent<{ key?: string }>) => {
        if (event.data?.key !== key) {
          return;
        }

        try {
          const record = await readRecord<TValue>(key);
          if (record && !cancelled) {
            valueRef.current = record.value;
            setValue(record.value);
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
        valueRef.current = record.value;
        setValue(record.value);
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
      const parsed = JSON.parse(rawValue) as { app?: string; data?: unknown };
      if (parsed.app !== "pomodoro-library" || !("data" in parsed)) {
        throw new Error("Seçilen dosya geçerli bir Pomodoro Library yedeği değil.");
      }

      const importedValue = assertImportValue<TValue>(parsed.data);
      window.localStorage.setItem(
        `${key}:pre-import-backup:${Date.now()}`,
        JSON.stringify(valueRef.current),
      );
      const record = await writeRecord(key, importedValue, valueRef.current);
      readyRef.current = true;
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
    const action = pendingActionRef.current;
    if (!action) {
      setError(null);
      return true;
    }

    try {
      const record = await writeRecord(key, action, valueRef.current);
      pendingActionRef.current = null;
      pendingValueRef.current = null;
      valueRef.current = record.value;
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
