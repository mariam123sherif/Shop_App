import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  colors: typeof lightColors;
}

const lightColors = {
  background: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  subtext: '#6B7280',
  primary: '#185FA5',
  primaryLight: '#E6F1FB',
  border: '#E5E7EB',
  success: '#1D9E75',
  danger: '#E24B4A',
  warning: '#BA7517',
  inputBg: '#F3F4F6',
  tabBar: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.5)',
};

const darkColors = {
  background: '#0F0F1A',
  card: '#1A1A2E',
  text: '#F1F5F9',
  subtext: '#94A3B8',
  primary: '#3B82F6',
  primaryLight: '#1E3A5F',
  border: '#2D2D44',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  inputBg: '#252540',
  tabBar: '#1A1A2E',
  overlay: 'rgba(0,0,0,0.7)',
};

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(systemScheme ?? 'light');

  useEffect(() => {
    AsyncStorage.getItem('theme_preference').then((saved) => {
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    });
  }, []);

  const toggleTheme = async () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    await AsyncStorage.setItem('theme_preference', next);
  };

  const isDark = theme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
