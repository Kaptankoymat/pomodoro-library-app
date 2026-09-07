"use client";

import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

export const useLocalStorageState = <TValue>(
  key: string,
  initialValue: TValue,
): [TValue, Dispatch<SetStateAction<TValue>>] => {
  const [value, setValue] = useState<TValue>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      try {
        const rawValue = window.localStorage.getItem(key);

        if (rawValue) {
          setValue(JSON.parse(rawValue) as TValue);
        }
      } catch {
        setValue(initialValue);
      } finally {
        setIsHydrated(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [initialValue, key]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // LocalStorage can fail in private browsing or quota-limited contexts.
    }
  }, [isHydrated, key, value]);

  const setStoredValue = useCallback<Dispatch<SetStateAction<TValue>>>((action) => {
    setValue(action);
  }, []);

  return [value, setStoredValue];
};
