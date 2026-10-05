import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { ColorScheme, darkColors, lightColors, ThemeColors } from '../theme';

const STORAGE_KEY = '@focuslock/colorScheme';

type ThemeContextValue = {
  scheme: ColorScheme;
  colors: ThemeColors;
  setScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Dark by default, regardless of the device's system setting, until the
  // user explicitly picks a scheme during onboarding.
  const [scheme, setSchemeState] = useState<ColorScheme>('dark');

  // Only used before the user has ever picked a scheme themselves.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark') setSchemeState(saved);
    });
  }, []);

  const setScheme = useCallback((next: ColorScheme) => {
    setSchemeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const colors = scheme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ scheme, colors, setScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
