import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import ApiService from '../services/ApiService';

const ConfigScreen = ({ navigation }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const [mode, setMode] = useState('sequential');
  const [displayMode, setDisplayMode] = useState('shared');
  const [numPlayers, setNumPlayers] = useState(4);
  const [creatorName, setCreatorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Création de la partie...');

  // Fonction pour vérifier si on est dans les heures de réveil lent
  const isSlowWakeupTime = () => {
    const hour = new Date().getHours();
    // Entre 2h et 11h du matin (réveil lent)
    return hour >= 2 && hour < 11;
  };

  const incrementPlayers = () => {
    if (numPlayers < 10) setNumPlayers(numPlayers + 1);
  };

  const decrementPlayers = () => {
    if (numPlayers > 2) setNumPlayers(numPlayers - 1);
  };

  const createSession = async () => {
    if (numPlayers < 2 || numPlayers > 10) {
      Alert.alert('Erreur', 'Veuillez choisir entre 2 et 10 joueurs');
      return;
    }

    if (!creatorName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre pseudo');
      return;
    }

    setLoading(true);
    
    // Message adaptatif selon l'heure
    if (isSlowWakeupTime()) {
      setLoadingMessage('Réveil du serveur en cours (15-20 secondes)...');
    } else {
      setLoadingMessage('Création de la partie...');
    }
    
    try {
      const playerNames = [creatorName.trim()];
      for (let i = 1; i < numPlayers; i++) {
        playerNames.push(`Joueur ${i + 1}`);
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
      console.error('Erreur création session:', error);
      Alert.alert(
        'Connexion impossible',
        'Impossible de créer la partie. Vérifiez votre connexion internet.',
        [{ text: 'Réessayer', onPress: () => {} }]
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
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Nouvelle Partie</Text>
          <TouchableOpacity 
            style={[styles.themeButton, { backgroundColor: colors.card }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Icon 
              name={isDark ? 'white-balance-sunny' : 'moon-waning-crescent'} 
              size={22} 
              color={colors.text} 
            />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
            {/* Mode de jeu */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Mode de jeu</Text>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={[
                    styles.optionCard, 
                    { borderColor: mode === 'sequential' ? colors.primary : colors.cardBorder }
                  ]}
                  onPress={() => setMode('sequential')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={mode === 'sequential' 
                      ? (isDark ? ['rgba(102, 126, 234, 0.2)', 'rgba(118, 75, 162, 0.2)'] : ['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)'])
                      : [colors.card, colors.card]}
                    style={styles.optionCardGradient}
                  >
                    <View style={[
                      styles.iconCircle, 
                      { backgroundColor: mode === 'sequential' ? colors.primary : colors.card }
                    ]}>
                      <Icon 
                        name="play-circle-outline" 
                        size={32} 
                        color={mode === 'sequential' ? '#fff' : colors.textSecondary} 
                      />
                    </View>
                    <Text style={[
                      styles.optionTitle, 
                      { color: mode === 'sequential' ? colors.text : colors.textSecondary }
                    ]}>
                      Séquentiel
                    </Text>
                    <Text style={[styles.optionDescription, { color: colors.textTertiary }]}>
                      Tour par tour
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    { borderColor: mode === 'independent' ? colors.primary : colors.cardBorder }
                  ]}
                  onPress={() => setMode('independent')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={mode === 'independent' 
                      ? (isDark ? ['rgba(102, 126, 234, 0.2)', 'rgba(118, 75, 162, 0.2)'] : ['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)'])
                      : [colors.card, colors.card]}
                    style={styles.optionCardGradient}
                  >
                    <View style={[
                      styles.iconCircle,
                      { backgroundColor: mode === 'independent' ? colors.primary : colors.card }
                    ]}>
                      <Icon 
                        name="timer-outline" 
                        size={32} 
                        color={mode === 'independent' ? '#fff' : colors.textSecondary} 
                      />
                    </View>
                    <Text style={[
                      styles.optionTitle,
                      { color: mode === 'independent' ? colors.text : colors.textSecondary }
                    ]}>
                      Indépendant
                    </Text>
                    <Text style={[styles.optionDescription, { color: colors.textTertiary }]}>
                      Simultané
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Mode d'affichage */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Affichage</Text>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    { borderColor: displayMode === 'shared' ? colors.secondary : colors.cardBorder }
                  ]}
                  onPress={() => setDisplayMode('shared')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={displayMode === 'shared' 
                      ? (isDark ? ['rgba(17, 153, 142, 0.2)', 'rgba(56, 239, 125, 0.2)'] : ['rgba(17, 153, 142, 0.1)', 'rgba(56, 239, 125, 0.1)'])
                      : [colors.card, colors.card]}
                    style={styles.optionCardGradient}
                  >
                    <View style={[
                      styles.iconCircle,
                      { backgroundColor: displayMode === 'shared' ? colors.secondary : colors.card }
                    ]}>
                      <Icon 
                        name="tablet" 
                        size={32} 
                        color={displayMode === 'shared' ? '#fff' : colors.textSecondary} 
                      />
                    </View>
                    <Text style={[
                      styles.optionTitle,
                      { color: displayMode === 'shared' ? colors.text : colors.textSecondary }
                    ]}>
                      Partagé
                    </Text>
                    <Text style={[styles.optionDescription, { color: colors.textTertiary }]}>
                      Un écran
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    { borderColor: displayMode === 'distributed' ? colors.secondary : colors.cardBorder }
                  ]}
                  onPress={() => setDisplayMode('distributed')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={displayMode === 'distributed' 
                      ? (isDark ? ['rgba(17, 153, 142, 0.2)', 'rgba(56, 239, 125, 0.2)'] : ['rgba(17, 153, 142, 0.1)', 'rgba(56, 239, 125, 0.1)'])
                      : [colors.card, colors.card]}
                    style={styles.optionCardGradient}
                  >
                    <View style={[
                      styles.iconCircle,
                      { backgroundColor: displayMode === 'distributed' ? colors.secondary : colors.card }
                    ]}>
                      <Icon 
                        name="devices" 
                        size={32} 
                        color={displayMode === 'distributed' ? '#fff' : colors.textSecondary} 
                      />
                    </View>
                    <Text style={[
                      styles.optionTitle,
                      { color: displayMode === 'distributed' ? colors.text : colors.textSecondary }
                    ]}>
                      Distribué
                    </Text>
                    <Text style={[styles.optionDescription, { color: colors.textTertiary }]}>
                      Multi-appareils
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Pseudo */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Votre pseudo</Text>
              <View style={[styles.inputCard, { borderColor: colors.cardBorder }]}>
                <LinearGradient
                  colors={[colors.card, colors.card]}
                  style={styles.inputGradient}
                >
                  <View style={styles.inputIconWrapper}>
                    <Icon name="account-outline" size={24} color={colors.textSecondary} />
                  </View>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Entrez votre nom"
                    placeholderTextColor={colors.textHint}
                    value={creatorName}
                    onChangeText={setCreatorName}
                    maxLength={20}
                    autoCapitalize="words"
                  />
                </LinearGradient>
              </View>
              <Text style={[styles.inputHint, { color: colors.textTertiary }]}>
                Les autres entreront leur pseudo en rejoignant
              </Text>
            </View>

            {/* Nombre de joueurs */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Nombre de joueurs</Text>
              <View style={[styles.playerSelectorCard, { borderColor: colors.cardBorder }]}>
                <LinearGradient
                  colors={[colors.card, colors.card]}
                  style={styles.playerSelectorGradient}
                >
                  <TouchableOpacity
                    style={[styles.playerButton, numPlayers <= 2 && styles.playerButtonDisabled]}
                    onPress={decrementPlayers}
                    disabled={numPlayers <= 2}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={numPlayers <= 2 ? [colors.disabled, colors.disabled] : colors.primaryGradient}
                      style={styles.playerButtonGradient}
                    >
                      <Icon name="minus" size={32} color={numPlayers <= 2 ? colors.disabledText : '#fff'} />
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.playerCountContainer}>
                    <Text style={[styles.playerCount, { color: colors.text }]}>{numPlayers}</Text>
                    <Text style={[styles.playerCountLabel, { color: colors.textSecondary }]}>joueurs</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.playerButton, numPlayers >= 10 && styles.playerButtonDisabled]}
                    onPress={incrementPlayers}
                    disabled={numPlayers >= 10}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={numPlayers >= 10 ? [colors.disabled, colors.disabled] : colors.primaryGradient}
                      style={styles.playerButtonGradient}
                    >
                      <Icon name="plus" size={32} color={numPlayers >= 10 ? colors.disabledText : '#fff'} />
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
              <Text style={[styles.playerRange, { color: colors.textTertiary }]}>
                Entre 2 et 10 joueurs
              </Text>
            </View>

            {/* Bouton créer - VRAIMENT CORRIGÉ */}
            {canCreate ? (
              <TouchableOpacity
                style={styles.createButton}
                onPress={createSession}
                disabled={loading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={colors.primaryGradient}
                  style={styles.createButtonGradient}
                >
                  {loading ? (
                    <View style={{ alignItems: 'center', gap: 12 }}>
                      <ActivityIndicator color="#fff" size="large" />
                      <Text style={[styles.createButtonText, { fontSize: 14, opacity: 0.9 }]}>
                        {loadingMessage}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Icon name="rocket-launch-outline" size={28} color="#fff" />
                      <Text style={styles.createButtonText}>Créer la Partie</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={[styles.createButton, styles.createButtonDisabled]}>
                <View style={[styles.createButtonDisabledBg, { backgroundColor: colors.disabled }]}>
                  <Icon name="rocket-launch-outline" size={28} color={colors.disabledText} />
                  <Text style={[styles.createButtonText, { color: colors.disabledText }]}>
                    Créer la Partie
                  </Text>
                </View>
              </View>
            )}
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
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  themeButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 14,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 14,
  },
  optionCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'hidden',
  },
  optionCardGradient: {
    padding: 20,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
  },
  inputCard: {
    borderRadius: 18,
    borderWidth: 2,
    overflow: 'hidden',
  },
  inputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  inputIconWrapper: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 17,
    fontWeight: '500',
  },
  inputHint: {
    fontSize: 13,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  playerSelectorCard: {
    borderRadius: 18,
    borderWidth: 2,
    overflow: 'hidden',
  },
  playerSelectorGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 24,
    paddingHorizontal: 28,
  },
  playerButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  playerButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  playerButtonGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerCountContainer: {
    alignItems: 'center',
    minWidth: 90,
  },
  playerCount: {
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 60,
  },
  playerCountLabel: {
    fontSize: 14,
    marginTop: -6,
  },
  playerRange: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
  },
  createButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 15,
    marginTop: 8,
  },
  createButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 14,
  },
  createButtonDisabledBg: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 14,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
});

export default ConfigScreen;