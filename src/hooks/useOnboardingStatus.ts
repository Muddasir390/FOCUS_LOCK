import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = '@focuslock/onboardingComplete';

/** Whether the user has already been through onboarding + the subscription screen. */
export function useOnboardingStatus() {
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw === 'true') setComplete(true);
    });
  }, []);

  const markComplete = useCallback(async () => {
    setComplete(true);
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  return { complete, markComplete };
}
