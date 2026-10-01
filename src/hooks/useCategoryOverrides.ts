import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import type { AppCategory } from '../data/appCategories';

const STORAGE_KEY = '@focuslock/categoryOverrides';

/**
 * Lets the user correct a wrongly auto-categorized app (no static list can
 * cover every bank, messenger, etc. in the world). Persisted locally so it
 * survives restarts without needing an app update.
 */
export function useCategoryOverrides() {
  const [overrides, setOverrides] = useState<Record<string, AppCategory>>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) setOverrides(JSON.parse(raw));
    });
  }, []);

  const persist = useCallback((next: Record<string, AppCategory>) => {
    setOverrides(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setOverride = useCallback(
    (packageName: string, category: AppCategory) => {
      persist({ ...overrides, [packageName]: category });
    },
    [overrides, persist],
  );

  const clearOverride = useCallback(
    (packageName: string) => {
      const next = { ...overrides };
      delete next[packageName];
      persist(next);
    },
    [overrides, persist],
  );

  return { overrides, setOverride, clearOverride };
}
