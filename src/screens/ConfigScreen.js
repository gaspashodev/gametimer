import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
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
  Clock,
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
  
  // ✅ Temps limite en secondes
  const [timeLimit, setTimeLimit] = useState(null); // null ou nombre en secondes
  const [customTime, setCustomTime] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Temps prédéfinis en minutes (seront convertis en secondes)
  const presetTimes = [5, 10, 15, 20, 30, 60];

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

  // ✅ Sélectionner un temps prédéfini
  const selectPresetTime = (minutes) => {
    setTimeLimit(minutes * 60); // Convertir minutes en secondes
    setShowCustomInput(false);
    setCustomTime('');
  };

  // ✅ Activer l'input personnalisé
  const enableCustomTime = () => {
    setShowCustomInput(true);
    setTimeLimit(null);
  };

    // ✅ Parser le format MM:SS ou SS
  const parseTimeInput = (input) => {
    // Nettoyer l'input
    const cleaned = input.trim();
    
    // Format MM:SS
    if (cleaned.includes(':')) {
      const parts = cleaned.split(':');
      if (parts.length !== 2) return null;
      
      const minutes = parseInt(parts[0]);
      const seconds = parseInt(parts[1]);
      
      if (isNaN(minutes) || isNaN(seconds) || seconds >= 60 || seconds < 0) {
        return null;
      }
      
      return minutes * 60 + seconds;
    }
    
    // Format secondes uniquement
    const seconds = parseInt(cleaned);
    if (isNaN(seconds) || seconds <= 0) {
      return null;
    }
    
    return seconds;
  };

  // ✅ Valider le temps personnalisé
  const validateCustomTime = () => {
    const time = parseInt(customTime);
    if (isNaN(time) || time <= 0) {
      Alert.alert(t('join.error'), t('config.invalidTime'));
      return;
    }
    setTimeLimit(time);
    setShowCustomInput(false);
  };

    // ✅ Formater le temps pour l'affichage (secondes → MM:SS ou Xmin)
  const formatTimeDisplay = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (secs === 0) {
      return `${mins} ${t('config.minutes')}`;
    }
    
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

    // ✅ Validation : temps obligatoire
    if (!timeLimit || timeLimit <= 0) {
      Alert.alert(t('join.error'), t('config.timeLimitRequired'));
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
        playerNames.push(t('config.player') + ' ' + (i + 1));
      }
      
      // ✅ Passer le temps limite en secondes
      const data = await ApiService.createSession(
        mode,
        numPlayers,
        displayMode,
        playerNames,
        timeLimit * 60 // Convertir minutes en secondes
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

  const canCreate = creatorName.trim().length > 0 && !loading && timeLimit > 0;

  return (
    <LinearGradient
      colors={colors.background}
      style={styles.container}
    >
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
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('config.gameMode')}</Text>
              <View style={styles.optionRow}>
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

            {/* Temps par joueur */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('config.timePerPlayer')}
              </Text>
              
              {/* Boutons temps prédéfinis */}
              <View style={styles.timeGrid}>
                {presetTimes.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeButton,
                      { 
                        backgroundColor: timeLimit === time 
                          ? (isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)')
                          : colors.card,
                        borderColor: timeLimit === time ? '#EF4444' : colors.cardBorder 
                      }
                    ]}
                    onPress={() => selectPresetTime(time)}
                    activeOpacity={0.8}
                  >
                    <Clock 
                      size={20} 
                      color={timeLimit === time ? '#EF4444' : colors.textSecondary}
                      strokeWidth={2}
                    />
                    <Text style={[
                      styles.timeButtonText,
                      { color: timeLimit === time ? '#EF4444' : colors.text }
                    ]}>
                      {time}
                    </Text>
                    <Text style={[
                      styles.timeButtonLabel,
                      { color: timeLimit === time ? '#EF4444' : colors.textSecondary }
                    ]}>
                      min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Bouton temps personnalisé */}
              <TouchableOpacity
                style={[
                  styles.customTimeButton,
                  { 
                    backgroundColor: showCustomInput || (timeLimit && !presetTimes.includes(timeLimit))
                      ? (isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)')
                      : colors.card,
                    borderColor: showCustomInput || (timeLimit && !presetTimes.includes(timeLimit))
                      ? '#EF4444' 
                      : colors.cardBorder 
                  }
                ]}
                onPress={enableCustomTime}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.customTimeButtonText,
                  { color: showCustomInput ? '#EF4444' : colors.text }
                ]}>
                  {t('config.customTime')}
                </Text>
              </TouchableOpacity>

              {/* Input personnalisé */}
              {showCustomInput && (
                <View style={[styles.customInputContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <TextInput
                    style={[styles.customInput, { color: colors.text }]}
                    placeholder="MM:SS ou SS"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numbers-and-punctuation"
                    value={customTime}
                    onChangeText={setCustomTime}
                    maxLength={6}
                  />
                  <TouchableOpacity
                    style={[styles.validateButton, { backgroundColor: '#EF4444' }]}
                    onPress={validateCustomTime}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.validateButtonText}>{t('config.validate')}</Text>
                  </TouchableOpacity>
                </View>
              )}
              {showCustomInput && (
                <Text style={[styles.formatHint, { color: colors.textSecondary }]}>
                  {t('config.timeFormatHint')}
                </Text>
              )}

              {/* Affichage du temps sélectionné */}
              {timeLimit && (
                <View style={[styles.selectedTimeCard, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)' }]}>
                  <Clock size={20} color="#EF4444" strokeWidth={2} />
                  <Text style={[styles.selectedTimeText, { color: colors.text }]}>
                    {t('config.selectedTime')}: {timeLimit} {t('config.minutes')}
                  </Text>
                </View>
              )}
            </View>

            {/* Nombre de joueurs */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('config.playerCount')} : {numPlayers}
              </Text>
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

        {/* Bouton créer */}
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
    textAlign: 'center',
    paddingHorizontal: 8,
    width: '100%', // ✅ Centrage multi-lignes
    lineHeight: 22, // ✅ Centrage multi-lignes
  },
  optionDescription: {
    fontSize: 11,
    textAlign: 'center',
    width: '100%', // ✅ Centrage multi-lignes
    paddingHorizontal: 4, // ✅ Centrage multi-lignes
    lineHeight: 16, // ✅ Centrage multi-lignes
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
  
  // Section temps limite
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 6,
    minWidth: '30%',
    flex: 1,
  },
  timeButtonText: {
    fontSize: 20,
    fontWeight: '700',
  },
  timeButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  customTimeButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    marginBottom: 12,
  },
  customTimeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 12,
  },
  customInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    padding: 8,
  },
  validateButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  validateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  selectedTimeText: {
    fontSize: 14,
    fontWeight: '600',
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