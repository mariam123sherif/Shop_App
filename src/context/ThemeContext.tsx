import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_KEY = 'user_theme_preference';

const lightColors = {
  primary:      '#185FA5',
  primaryLight: '#E6F1FB',
  background:   '#F5F7FA',
  card:         '#FFFFFF',
  text:         '#111827',
  subtext:      '#6B7280',
  inputBg:      '#F3F4F6',
  border:       '#E5E7EB',
  tabBar:       '#FFFFFF',
  success:      '#1D9E75',
  danger:       '#EF4444',
};

const darkColors = {
  primary:      '#4A9FE0',
  primaryLight: '#1A2D40',
  background:   '#0F1117',
  card:         '#1C1F26',
  text:         '#F3F4F6',
  subtext:      '#9CA3AF',
  inputBg:      '#252830',
  border:       '#2E3340',
  tabBar:       '#1C1F26',
  success:      '#34D399',
  danger:       '#F87171',
};

interface ThemeContextType {
  isDark: boolean;
  colors: typeof lightColors;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: lightColors,
  themeMode: 'system',
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeModeState(saved);
      }
    });
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_KEY, mode);
  };

  const isDark =
    themeMode === 'dark' ||
    (themeMode === 'system' && systemScheme === 'dark');

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, colors, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}