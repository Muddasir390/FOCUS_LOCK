export type ColorScheme = 'light' | 'dark';

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  accent: string;
  blue: string;
  warning: string;
  danger: string;
};

export const darkColors: ThemeColors = {
  bg: '#0A0B1E',
  surface: '#14162E',
  surfaceAlt: '#1C1F3D',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.18)',
  text: '#F4F5FF',
  textMuted: '#8B90B8',
  primary: '#7C5CFF',
  primarySoft: 'rgba(124, 92, 255, 0.2)',
  accent: '#22D3EE',
  blue: '#226EFF',
  warning: '#FFB020',
  danger: '#FF5C7A',
};

// Brand hues (primary, blue) stay the same as dark mode. accent/warning/danger are
// deepened here because they also double as *text* colors in several components
// (e.g. links, "Remove" buttons) and the dark-mode values are too light to read on
// a white background.
export const lightColors: ThemeColors = {
  bg: '#F5F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F8',
  border: 'rgba(10, 11, 30, 0.08)',
  borderStrong: 'rgba(10, 11, 30, 0.18)',
  text: '#14162E',
  textMuted: '#6B7094',
  primary: '#7C5CFF',
  primarySoft: 'rgba(124, 92, 255, 0.12)',
  accent: '#0C8599',
  blue: '#2563EB',
  warning: '#B45309',
  danger: '#DC2626',
};

export const radius = {
  md: 16,
  lg: 22,
  pill: 999,
};
