import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', 'system'
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  // Charger la préférence au démarrage
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Appliquer le thème selon la préférence
  useEffect(() => {
    if (themeMode === 'system') {
      setIsDark(systemColorScheme === 'dark');
    } else {
      setIsDark(themeMode === 'dark');
    }
  }, [themeMode, systemColorScheme]);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem('themeMode');
      if (saved) {
        setThemeMode(saved);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const saveThemePreference = async (mode) => {
    try {
      await AsyncStorage.setItem('themeMode', mode);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const toggleTheme = () => {
    const newMode = isDark ? 'light' : 'dark';
    setThemeMode(newMode);
    saveThemePreference(newMode);
  };

  const setTheme = (mode) => {
    setThemeMode(mode);
    saveThemePreference(mode);
  };

  // Palette de couleurs
  const colors = isDark ? {
    // Dark theme
    background: ['#0F0F1E', '#1A1A2E', '#16213E'],
    backgroundSolid: '#0F0F1E',
    card: 'rgba(255, 255, 255, 0.05)',
    cardBorder: 'rgba(255, 255, 255, 0.1)',
    text: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.6)',
    textTertiary: 'rgba(255, 255, 255, 0.4)',
    textHint: 'rgba(255, 255, 255, 0.3)',
    primary: '#667eea',
    primaryGradient: ['#667eea', '#764ba2'],
    secondary: '#11998e',
    secondaryGradient: ['#11998e', '#38ef7d'],
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    disabled: 'rgba(255, 255, 255, 0.15)',
    disabledText: 'rgba(255, 255, 255, 0.4)',
  } : {
    // Light theme
    background: ['#F9FAFB', '#FFFFFF', '#F3F4F6'],
    backgroundSolid: '#F9FAFB',
    card: '#FFFFFF',
    cardBorder: '#E5E7EB',
    text: '#1F2937',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    textHint: '#D1D5DB',
    primary: '#667eea',
    primaryGradient: ['#667eea', '#764ba2'],
    secondary: '#11998e',
    secondaryGradient: ['#11998e', '#38ef7d'],
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    disabled: '#E5E7EB',
    disabledText: '#9CA3AF',
  };

  const value = {
    isDark,
    themeMode,
    colors,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};