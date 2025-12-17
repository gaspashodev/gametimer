import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import { 
  Check,
  Mail,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Moon,
  Sun,
  Earth,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const SettingsScreen = ({ navigation }) => {
const { colors, isDark, toggleTheme } = useTheme();
const { t, locale, changeLanguage } = useLanguage();

  const handleContact = (type) => {
    switch (type) {
      case 'email':
        Linking.openURL('mailto:mathieu@boardgamers.fr'); // ← Change ici
        break;
      case 'website':
        Linking.openURL('https://boardgamers.fr'); // ← Change ici
        break;
    }
  };

  const ThemeIcon = isDark ? Sun : Moon;
  return (
    <LinearGradient colors={colors.background} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings.title')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Section Apparence */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.appearance')}</Text>
            
            <TouchableOpacity
              style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(79, 70, 229, 0.15)' }]}>
                  <ThemeIcon
                    size={24}
                    color={isDark ? '#FBBF24' : colors.primary}
                    strokeWidth={2}
                  />
                </View>
                <View>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>{t('settings.theme')}</Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    {isDark ? 'Mode sombre' : 'Mode clair'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={24} color={colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Section Langue */}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.language')}</Text>
            
            <TouchableOpacity
              style={[
                styles.languageCard,
                { 
                  backgroundColor: locale === 'fr' ? colors.primary : colors.card,
                  borderColor: locale === 'fr' ? colors.primary : colors.cardBorder,
                }
              ]}
              onPress={() => changeLanguage('fr')}
              activeOpacity={0.7}
            >
              <View style={styles.languageLeft}>
                <Text style={styles.languageFlag}>🇫🇷</Text>
                <View>
                  <Text style={[
                    styles.languageTitle,
                    { color: locale === 'fr' ? '#fff' : colors.text }
                  ]}>
                    Français
                  </Text>
                  <Text style={[
                    styles.languageSubtitle,
                    { color: locale === 'fr' ? 'rgba(255,255,255,0.8)' : colors.textSecondary }
                  ]}>
                    French
                  </Text>
                </View>
              </View>
              {locale === 'fr' && (
                <Check size={24} color="#fff" strokeWidth={2} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.languageCard,
                { 
                  backgroundColor: locale === 'en' ? colors.primary : colors.card,
                  borderColor: locale === 'en' ? colors.primary : colors.cardBorder,
                }
              ]}
              onPress={() => changeLanguage('en')}
              activeOpacity={0.7}
            >
              <View style={styles.languageLeft}>
                <Text style={styles.languageFlag}>🇬🇧</Text>
                <View>
                  <Text style={[
                    styles.languageTitle,
                    { color: locale === 'en' ? '#fff' : colors.text }
                  ]}>
                    English
                  </Text>
                  <Text style={[
                    styles.languageSubtitle,
                    { color: locale === 'en' ? 'rgba(255,255,255,0.8)' : colors.textSecondary }
                  ]}>
                    Anglais
                  </Text>
                </View>
              </View>
              {locale === 'en' && (
                <Check size={24} color="#fff" strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>

          {/* Section Contact */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.contact')}</Text>

            {/* Email */}
            <TouchableOpacity
              style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => handleContact('email')}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(79, 70, 229, 0.15)' }]}>
                  <Mail size={24} color={colors.primary} strokeWidth={2} />
                </View>
                <View>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>{t('settings.email')}</Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    mathieu@boardgamers.fr
                  </Text>
                </View>
              </View>
               <ExternalLink size={20}  color={colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>

          {/* Site Internet */}
          <TouchableOpacity
            style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => handleContact('website')}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Earth size={24}  color={colors.secondary} strokeWidth={2} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>{t('settings.website')}</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  boardgamers.fr
                </Text>
              </View>
            </View>
               <ExternalLink size={20}  color={colors.textTertiary} strokeWidth={2} />
          </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    zIndex: 0,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
  },
  messageCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
    gap: 12,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  languageFlag: {
    fontSize: 32,
  },
  languageTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  languageSubtitle: {
    fontSize: 14,
  },
});

export default SettingsScreen;