import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';

// Central design tokens. Every screen/component reads colours from the active
// theme instead of hard-coding hex values, so light and dark modes stay in sync.
export interface Theme {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  text: string;
  subtext: string;
  textDim: string; // mid-weight body text (slate-600/300)
  muted: string; // italic placeholders / hints
  primary: string;
  primaryDark: string;
  onPrimary: string;
  teamA: string;
  teamB: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  dangerBg: string;
  dangerBorder: string;
  shadow: string;
  feedRowBg: string;
  feedBorder: string;
  inputBg: string;
  progressBg: string;
  chipBg: string;
  chipText: string;
  tableHeadBg: string;
  tableBorder: string;
  tableRowBorder: string;
}

export const lightTheme: Theme = {
  bg: '#eef2f7',
  surface: '#ffffff',
  surfaceAlt: '#f1f5f9',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  text: '#0f172a',
  subtext: '#64748b',
  textDim: '#475569',
  muted: '#94a3b8',
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  onPrimary: '#ffffff',
  teamA: '#2563eb',
  teamB: '#dc2626',
  accent: '#0d9488',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  dangerBorder: '#fecaca',
  shadow: '#0f172a',
  feedRowBg: '#ffffff',
  feedBorder: '#cbd5e1',
  inputBg: '#ffffff',
  progressBg: '#e2e8f0',
  chipBg: '#f1f5f9',
  chipText: '#64748b',
  tableHeadBg: '#eef2f7',
  tableBorder: '#e0e0e0',
  tableRowBorder: '#eeeeee',
};

export const darkTheme: Theme = {
  bg: '#0b1120',
  surface: '#1e293b',
  surfaceAlt: '#273449',
  border: '#334155',
  borderStrong: '#475569',
  text: '#e2e8f0',
  subtext: '#94a3b8',
  textDim: '#cbd5e1',
  muted: '#64748b',
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  onPrimary: '#ffffff',
  teamA: '#60a5fa',
  teamB: '#f87171',
  accent: '#2dd4bf',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  dangerBg: '#2a1416',
  dangerBorder: '#7f1d1d',
  shadow: '#000000',
  feedRowBg: '#16202e',
  feedBorder: '#475569',
  inputBg: '#0b1120',
  progressBg: '#334155',
  chipBg: '#273449',
  chipText: '#94a3b8',
  tableHeadBg: '#273449',
  tableBorder: '#334155',
  tableRowBorder: '#1e293b',
};

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Best-effort persistence of the user's theme choice via the same dynamic-require
// trick used by the slip store, so a missing backend simply falls back to "system".
const THEME_STORAGE_KEY = 'randovent.themeMode';

function loadStoredMode(): ThemeMode | null {
  return null; // synchronous default; async load happens in the provider effect
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(loadStoredMode() ?? 'system');

  useEffect(() => {
    let active = true;
    const asyncStorageName = '@react-native-async-storage/async-storage';
    const fileSystemName = 'expo-file-system';
    (async () => {
      try {
        const mod = require(asyncStorageName) as unknown;
        const storage = (mod && ((mod as { default?: unknown }).default ?? mod)) as
          | { getItem: (k: string) => Promise<string | null> }
          | undefined;
        if (storage?.getItem) {
          const v = await storage.getItem(THEME_STORAGE_KEY);
          if (active && (v === 'light' || v === 'dark' || v === 'system')) setModeState(v);
          return;
        }
      } catch {
        /* not installed */
      }
      try {
        const fs = require(fileSystemName) as unknown as
          | {
              documentDirectory: string | null;
              getInfoAsync: (p: string) => Promise<{ exists: boolean }>;
              readFileAsync: (p: string, e: string) => Promise<string>;
            }
          | undefined;
        if (fs?.documentDirectory) {
          const path = `${fs.documentDirectory}${THEME_STORAGE_KEY}.json`;
          const info = await fs.getInfoAsync(path);
          if (info.exists) {
            const raw = await fs.readFileAsync(path, 'utf8');
            const v = JSON.parse(raw) as ThemeMode;
            if (active && (v === 'light' || v === 'dark' || v === 'system')) setModeState(v);
          }
        }
      } catch {
        /* not installed */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    const payload = JSON.stringify(next);
    const asyncStorageName = '@react-native-async-storage/async-storage';
    const fileSystemName = 'expo-file-system';
    try {
      const mod = require(asyncStorageName) as unknown;
      const storage = (mod && ((mod as { default?: unknown }).default ?? mod)) as
        | { setItem: (k: string, v: string) => Promise<void> }
        | undefined;
      if (storage?.setItem) {
        void storage.setItem(THEME_STORAGE_KEY, payload);
        return;
      }
    } catch {
      /* not installed */
    }
    try {
      const fs = require(fileSystemName) as unknown as
        | {
            documentDirectory: string | null;
            writeFileAsync: (p: string, c: string, e: string) => Promise<void>;
          }
        | undefined;
      if (fs?.documentDirectory) {
        void fs.writeFileAsync(
          `${fs.documentDirectory}${THEME_STORAGE_KEY}.json`,
          payload,
          'utf8',
        );
      }
    } catch {
      /* not installed */
    }
  };

  const isDark =
    mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx.theme;
}

export function useThemeControls(): { mode: ThemeMode; setMode: (m: ThemeMode) => void; isDark: boolean } {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeControls must be used within a ThemeProvider');
  return { mode: ctx.mode, setMode: ctx.setMode, isDark: ctx.isDark };
}
