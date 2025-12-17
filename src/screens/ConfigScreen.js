import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft,
  CircleArrowUp,
  CircleFadingArrowUp,
  Smartphone,
  Wifi,
  Minus,
  Plus,
} from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import ApiService from '../services/ApiService';
import StorageService from '../services/StorageService';
import LoadingOverlay from '../components/LoadingOverlay';
import { useLanguage } from '../contexts/LanguageContext';

const ConfigScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [mode, setMode] = useState('sequential');
  const [displayMode, setDisplayMode] = useState('shared');
  const [numPlayers, setNumPlayers] = useState(4);
  const [creatorName, setCreatorName] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const [loadingMessage, setLoadingMessage] = useState(t('join.creatingGame'));

  // ✅ Charger le pseudo sauvegardé au démarrage
  useEffect(() => {
    loadSavedPseudo();
  }, []);

  const loadSavedPseudo = async () => {
    const savedPseudo = await StorageService.getPseudo();
    if (savedPseudo) {
      setCreatorName(savedPseudo);
    }
  };

  const incrementPlayers = () => {
    if (numPlayers < 10) setNumPlayers(numPlayers + 1);
  };

  const decrementPlayers = () => {
    if (numPlayers > 2) setNumPlayers(numPlayers - 1);
  };

  const createSession = async () => {
    if (numPlayers < 2 || numPlayers > 10) {
      Alert.alert(t('join.error'), t('config.numberPlayers'));
      return;
    }

    if (!creatorName.trim()) {
      Alert.alert(t('join.error'), t('config.selectPseudo'));
      return;
    }

    setLoading(true);
    
    // Message adaptatif selon l'heure
    const isSlowWakeupTime = () => {
      const hour = new Date().getHours();
      return hour >= 0 && hour < 9;
    };
    
    if (isSlowWakeupTime()) {
      setLoadingMessage(t('join.awakeServer'));
    } else {
      setLoadingMessage(t('config.creatingGame'));
    }
    
    try {
      const playerNames = [creatorName.trim()];
      for (let i = 1; i < numPlayers; i++) {
        playerNames.push(t('config.player')` ${i + 1}`);
      }
      
      const data = await ApiService.createSession(
        mode,
        numPlayers,
        displayMode,
        playerNames
      );

      setLoading(false);

      if (displayMode === 'shared') {
        navigation.navigate('GameShared', {
          sessionId: data.sessionId,
          joinCode: data.joinCode,
          mode: mode,
        });
      } else {
        navigation.navigate('GameDistributed', {
          sessionId: data.sessionId,
          joinCode: data.joinCode,
          mode: mode,
          myPlayerId: 0,
        });
      }
    } catch (error) {
      setLoading(false);
      Alert.alert(
        t('config.noConnection'),
        t('config.errorCreatingGame'),
        [{ text: t('config.retry'), onPress: () => {} }]
      );
    }
  };

  const canCreate = creatorName.trim().length > 0 && !loading;

  return (
    <LinearGradient
      colors={colors.background}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header avec switch thème */}
        <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.card }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
          <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('home.newGame')}</Text>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >

            {/* Mode d'affichage */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('config.displayMode')}</Text>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    { 
                      backgroundColor: displayMode === 'shared' 
                        ? (isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)')
                        : colors.card,
                      borderColor: displayMode === 'shared' ? colors.secondary : colors.cardBorder 
                    }
                  ]}
                  onPress={() => setDisplayMode('shared')}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.iconCircle,
                    { backgroundColor: displayMode === 'shared' ? colors.secondary : 'rgba(16, 185, 129, 0.1)' }
                  ]}>
                    <Smartphone 
                      size={32} 
                      color={displayMode === 'shared' ? '#fff' : colors.secondary}
                      strokeWidth={2}
                    />
                  </View>
                  <Text style={[
                    styles.optionTitle,
                    { color: colors.text }
                  ]}>
                    {t('config.singleScreen')}
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    {t('config.singleScreenDesc')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    { 
                      backgroundColor: displayMode === 'distributed' 
                        ? (isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)')
                        : colors.card,
                      borderColor: displayMode === 'distributed' ? colors.secondary : colors.cardBorder 
                    }
                  ]}
                  onPress={() => setDisplayMode('distributed')}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.iconCircle,
                    { backgroundColor: displayMode === 'distributed' ? colors.secondary : 'rgba(16, 185, 129, 0.1)' }
                  ]}>
                    <Wifi
                      size={32} 
                      color={displayMode === 'distributed' ? '#fff' : colors.secondary}
                      strokeWidth={2}
                    />
                  </View>
                  <Text style={[
                    styles.optionTitle,
                    { color: colors.text }
                  ]}>
                    {t('config.eachScreen')}
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    {t('config.eachScreenDesc')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

          {/* Mode de jeu */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Mode de jeu</Text>
              <View style={styles.optionRow}>
                {/* Suppression du LinearGradient imbriqué */}
                <TouchableOpacity
                  style={[
                    styles.optionCard, 
                    { 
                      backgroundColor: mode === 'sequential' 
                        ? (isDark ? 'rgba(79, 70, 229, 0.15)' : 'rgba(79, 70, 229, 0.08)')
                        : colors.card,
                      borderColor: mode === 'sequential' ? colors.primary : colors.cardBorder 
                    }
                  ]}
                  onPress={() => setMode('sequential')}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.iconCircle, 
                    { backgroundColor: mode === 'sequential' ? colors.primary : 'rgba(79, 70, 229, 0.1)' }
                  ]}>
                  <CircleFadingArrowUp
                    size={32} 
                    color={mode === 'sequential' ? '#fff' : colors.primary}
                    strokeWidth={2}
                  />
                  </View>
                  <Text style={[
                    styles.optionTitle, 
                    { color: colors.text }
                  ]}>
                    {t('config.turnByTurn')}
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    {t('config.turnByTurnDesc')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    { 
                      backgroundColor: mode === 'independent' 
                        ? (isDark ? 'rgba(79, 70, 229, 0.15)' : 'rgba(79, 70, 229, 0.08)')
                        : colors.card,
                      borderColor: mode === 'independent' ? colors.primary : colors.cardBorder 
                    }
                  ]}
                  onPress={() => setMode('independent')}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.iconCircle,
                    { backgroundColor: mode === 'independent' ? colors.primary : 'rgba(79, 70, 229, 0.1)' }
                  ]}>
                  <CircleArrowUp
                    size={32} 
                    color={mode === 'independent' ? '#fff' : colors.primary}
                    strokeWidth={2}
                  />
                  </View>
                  <Text style={[
                    styles.optionTitle,
                    { color: colors.text }
                  ]}>
                    {t('config.simultaneous')}
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    {t('config.simultaneousDesc')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Nombre de joueurs */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('config.playerCount')} : {numPlayers}
              </Text>
              {/* Pas de LinearGradient imbriqué */}
              <View style={[styles.playerSelectorCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <TouchableOpacity
                  style={[
                    styles.playerControlButton,
                    { backgroundColor: numPlayers <= 2 ? colors.disabled : 'rgba(79, 70, 229, 0.1)' }
                  ]}
                  onPress={decrementPlayers}
                  disabled={numPlayers <= 2}
                  activeOpacity={0.7}
                >
                  <Minus size={24} color={colors.text} strokeWidth={2} />
                </TouchableOpacity>

                <Text style={[styles.playerCount, { color: colors.text }]}>
                  {numPlayers}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.playerControlButton,
                    { backgroundColor: numPlayers >= 10 ? colors.disabled : 'rgba(79, 70, 229, 0.1)' }
                  ]}
                  onPress={incrementPlayers}
                  disabled={numPlayers >= 10}
                  activeOpacity={0.7}
                >
                  <Plus size={24} color={colors.text} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
        </ScrollView>

        {/* Bouton créer - Dégradé sur CTA principal */}
        <View style={[styles.footer, { backgroundColor: colors.backgroundSolid }]}>
          <TouchableOpacity
            style={[styles.createButton, !canCreate && { opacity: 0.5 }]}
            onPress={createSession}
            disabled={!canCreate}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={canCreate ? colors.primaryGradient : [colors.disabled, colors.disabled]}
              style={styles.createButtonGradient}
            >
              <Text style={styles.createButtonText}>{t('config.createGame')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* LoadingOverlay progressif */}
      <LoadingOverlay visible={loading} initialMessage={loadingMessage} />
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
  themeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    padding: 15,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  optionDescription: {
    fontSize: 11,
    textAlign: 'center',
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    marginTop: 8,
  },
  playerSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  playerControlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerCount: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 32,
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default ConfigScreen;