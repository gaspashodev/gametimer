import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Timer,
  AlarmClockPlus,
  LogIn,
  Settings,
  UserCircle,
  X,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import StorageService from '../services/StorageService';
import { useLanguage } from '../contexts/LanguageContext';

const HomeScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [pseudo, setPseudo] = useState('');
  const { t } = useLanguage();

  // ✅ Charger le pseudo sauvegardé au démarrage
  useEffect(() => {
    loadSavedPseudo();
  }, []);

  const loadSavedPseudo = async () => {
    const saved = await StorageService.getPseudo();
    if (saved) {
      setPseudo(saved);
    }
  };

  // ✅ Sauvegarder automatiquement quand le pseudo change
  const handlePseudoChange = async (text) => {
    setPseudo(text);
    if (text.trim()) {
      await StorageService.savePseudo(text.trim());
    }
  };

  const handleNavigateToConfig = () => {
    Keyboard.dismiss();
    navigation.navigate('Config');
  };

  const handleNavigateToJoin = () => {
    Keyboard.dismiss();
    navigation.navigate('Join');
  };

  return (
    <LinearGradient
      colors={colors.background}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.content}>
          {/* Theme toggle button */}
        <View style={styles.settingsButtonContainer}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.7}
            >
              <Settings size={24} color={colors.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>

        {/* Contenu centré verticalement */}
        <View style={styles.centeredContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={colors.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <Timer size={64} color="#fff" strokeWidth={2} />
              </LinearGradient>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{t('home.title')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('home.subtitle')}
            </Text>
          </View>

          {/* ✨ NOUVEAU : Input pseudo sur la home */}
          <View style={styles.pseudoSection}>
            <View style={[styles.pseudoInputCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <UserCircle size={22} color={colors.textSecondary} strokeWidth={2} />
              <TextInput
                style={[styles.pseudoInput, { color: colors.text }]}
                placeholder={t('home.pseudoPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={pseudo}
                onChangeText={handlePseudoChange}
                maxLength={20}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              {pseudo.trim() && (
                <TouchableOpacity
                  onPress={() => handlePseudoChange('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color={colors.textTertiary} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Cartes */}
          <View style={styles.cardsContainer}>
            <TouchableOpacity
              style={[
                styles.card,
                { 
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                }
              ]}
              onPress={handleNavigateToConfig}
              activeOpacity={0.7}
            >
              <View style={styles.cardContent}>
                <View style={[styles.cardIconCircle, { backgroundColor: colors.primary }]}>
                  <AlarmClockPlus size={28} color="#fff" strokeWidth={2} />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{t('home.newGame')}</Text>
                  <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>{t('home.newGameDesc')}</Text>
                </View>
                  <ChevronRight size={24} color={colors.textTertiary} strokeWidth={2} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.card,
                { 
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                }
              ]}
              onPress={handleNavigateToJoin}
              activeOpacity={0.7}
            >
              <View style={styles.cardContent}>
                <View style={[styles.cardIconCircle, { backgroundColor: colors.secondary }]}>
                  <LogIn size={28} color="#fff" strokeWidth={2} />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{t('home.join')}</Text>
                  <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>{t('home.joinDesc')}</Text>
                </View>
                  <ChevronRight size={24} color={colors.textTertiary} strokeWidth={2} />              
                  </View>
            </TouchableOpacity>
          </View>
        </View>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  settingsButtonContainer: {
    alignItems: 'flex-end',
    paddingTop: 16,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  pseudoSection: {
    marginBottom: 24,
  },
  pseudoLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  pseudoInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  pseudoInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  cardsContainer: {
    gap: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
  },
});

export default HomeScreen;