import React, { createContext, useState, useContext, useEffect } from 'react';
import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import fr from '../locales/fr.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import de from '../locales/de.json';
import it from '../locales/it.json';
import pt from '../locales/pt.json'; 

const i18n = new I18n({
  fr,
  en,
  es,
  de,
  it,
  pt,
});

i18n.enableFallback = true;
i18n.defaultLocale = 'fr';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState('fr');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const saved = await AsyncStorage.getItem('@app_language');
      if (saved) {
        i18n.locale = saved;
        setLocale(saved);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (newLocale) => {
    try {
      i18n.locale = newLocale;
      setLocale(newLocale);
      await AsyncStorage.setItem('@app_language', newLocale);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key, params) => i18n.t(key, params);

  return (
    <LanguageContext.Provider value={{ locale, changeLanguage, t, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};