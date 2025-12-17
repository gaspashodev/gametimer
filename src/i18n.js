import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import fr from './locales/fr.json';
import en from './locales/en.json';

const i18n = new I18n({
  fr,
  en,
});

// Gérer le cas où locale est undefined
const deviceLocale = Localization.locale || Localization.getLocales()[0]?.languageCode || 'en';

// Extraire juste la langue (fr-FR → fr)
i18n.locale = deviceLocale.split('-')[0];

// Fallback si traduction manquante
i18n.enableFallback = true;
i18n.defaultLocale = 'fr';

export default i18n;