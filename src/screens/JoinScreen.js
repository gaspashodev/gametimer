import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import ApiService from '../services/ApiService';

const JoinScreen = ({ navigation }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const [step, setStep] = useState(1); // 1: code+pseudo, 2: sélection joueur
  const [joinCode, setJoinCode] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Recherche de la partie...');
  const [sessionData, setSessionData] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Fonction pour vérifier si on est dans les heures de réveil lent
  const isSlowWakeupTime = () => {
    const hour = new Date().getHours();
    // Entre 2h et 11h du matin (réveil lent)
    return hour >= 2 && hour < 11;
  };

  const handleJoinSession = async () => {
    if (joinCode.length < 6) {
      Alert.alert('Erreur', 'Veuillez entrer un code valide');
      return;
    }

    if (!pseudo.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre pseudo');
      return;
    }

    setLoading(true);
    
    // Message adaptatif selon l'heure
    if (isSlowWakeupTime()) {
      setLoadingMessage('Réveil du serveur en cours (15-20 secondes)...');
    } else {
      setLoadingMessage('Recherche de la partie...');
    }
    
    try {
      const data = await ApiService.joinSession(joinCode.toUpperCase());
      setSessionData(data);
      setLoading(false);

      // Si mode partagé, aller directement au jeu
      if (data.session.displayMode === 'shared') {
        navigation.navigate('GameShared', {
          sessionId: data.sessionId,
          joinCode: joinCode.toUpperCase(),
          mode: data.session.mode,
        });
      } else {
        // Mode distribué, passer à la sélection de joueur
        setStep(2);
      }
    } catch (error) {
      setLoading(false);
      console.error('Erreur recherche partie:', error);
      Alert.alert(
        'Partie introuvable',
        'Impossible de trouver la partie. Vérifiez le code ou votre connexion.',
        [{ text: 'Réessayer' }]
      );
    }
  };

  const handleSelectPlayer = () => {
    if (selectedPlayer === null) {
      Alert.alert('Erreur', 'Veuillez sélectionner votre slot');
      return;
    }

    const isAlreadyConnected = sessionData.session.connectedPlayers?.includes(selectedPlayer);
    if (isAlreadyConnected) {
      Alert.alert('Erreur', 'Ce slot est déjà occupé. Choisissez-en un autre.');
      return;
    }

    // Mettre à jour le pseudo du joueur
    ApiService.updatePlayerName(sessionData.sessionId, selectedPlayer, pseudo.trim());

    navigation.navigate('GameDistributed', {
      sessionId: sessionData.sessionId,
      joinCode: joinCode.toUpperCase(),
      mode: sessionData.session.mode,
      myPlayerId: selectedPlayer,
    });
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSessionData(null);
      setSelectedPlayer(null);
    } else {
      navigation.goBack();
    }
  };

  const canJoin = joinCode.length >= 6 && pseudo.trim().length > 0;

  // ÉTAPE 1 : Code + Pseudo
  if (step === 1) {
    return (
      <LinearGradient colors={colors.background} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
            <TouchableOpacity 
              style={[styles.backButton, { backgroundColor: colors.card }]}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Icon name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Rejoindre</Text>
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

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView 
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Icône */}
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={colors.secondaryGradient}
                  style={styles.iconGradient}
                >
                  <Icon name="login-variant" size={56} color="#fff" />
                </LinearGradient>
                <View style={[styles.iconGlow, { backgroundColor: colors.secondary }]} />
              </View>

              <Text style={[styles.title, { color: colors.text }]}>Rejoindre une partie</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Entrez le code de la partie et votre pseudo
              </Text>

              {/* Code */}
              <View style={styles.section}>
                <Text style={[styles.label, { color: colors.text }]}>Code de la partie</Text>
                <View style={[styles.inputCard, { borderColor: colors.cardBorder }]}>
                  <View style={[styles.inputGradient, { backgroundColor: colors.card }]}>
                    <View style={styles.inputIconWrapper}>
                      <Icon name="key-variant" size={24} color={colors.textSecondary} />
                    </View>
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="ABCDEF"
                      placeholderTextColor={colors.textHint}
                      value={joinCode}
                      onChangeText={(text) => setJoinCode(text.toUpperCase())}
                      maxLength={6}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                  </View>
                </View>
              </View>

              {/* Pseudo */}
              <View style={styles.section}>
                <Text style={[styles.label, { color: colors.text }]}>Votre pseudo</Text>
                <View style={[styles.inputCard, { borderColor: colors.cardBorder }]}>
                  <View style={[styles.inputGradient, { backgroundColor: colors.card }]}>
                    <View style={styles.inputIconWrapper}>
                      <Icon name="account-outline" size={24} color={colors.textSecondary} />
                    </View>
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Entrez votre nom"
                      placeholderTextColor={colors.textHint}
                      value={pseudo}
                      onChangeText={setPseudo}
                      maxLength={20}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              </View>

              {/* Bouton rejoindre */}
              {canJoin ? (
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={handleJoinSession}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={colors.secondaryGradient}
                    style={styles.joinButtonGradient}
                  >
                    {loading ? (
                      <View style={{ alignItems: 'center', gap: 12 }}>
                        <ActivityIndicator color="#fff" size="large" />
                        <Text style={[styles.joinButtonText, { fontSize: 14, opacity: 0.9 }]}>
                          {loadingMessage}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Icon name="login" size={28} color="#fff" />
                        <Text style={styles.joinButtonText}>Rejoindre</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={[styles.joinButton, styles.joinButtonDisabled]}>
                  <View style={[styles.joinButtonDisabledBg, { backgroundColor: colors.disabled }]}>
                    <Icon name="login" size={28} color={colors.disabledText} />
                    <Text style={[styles.joinButtonText, { color: colors.disabledText }]}>
                      Rejoindre
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ÉTAPE 2 : Sélection du slot joueur
  return (
    <LinearGradient colors={colors.background} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.card }]}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Choisir un slot</Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>Sélectionnez votre slot</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Choisissez quel joueur vous êtes
          </Text>

          {/* Liste des slots */}
          <View style={styles.slotsContainer}>
            {sessionData.session.players.map((player) => {
              const isOccupied = sessionData.session.connectedPlayers?.includes(player.id);
              const isSelected = selectedPlayer === player.id;

              return (
                <TouchableOpacity
                  key={player.id}
                  style={[
                    styles.slotCard,
                    { 
                      backgroundColor: colors.card,
                      borderColor: isSelected ? colors.secondary : colors.cardBorder,
                    },
                    isOccupied && styles.slotCardOccupied,
                  ]}
                  onPress={() => !isOccupied && setSelectedPlayer(player.id)}
                  disabled={isOccupied}
                  activeOpacity={0.7}
                >
                  <View style={styles.slotLeft}>
                    <View style={[
                      styles.slotNumber,
                      { 
                        backgroundColor: isSelected 
                          ? colors.secondary 
                          : isOccupied 
                            ? colors.disabled 
                            : colors.card,
                        borderWidth: isSelected || isOccupied ? 0 : 2,
                        borderColor: colors.cardBorder,
                      }
                    ]}>
                      <Text style={[
                        styles.slotNumberText,
                        { color: isSelected ? '#fff' : isOccupied ? colors.disabledText : colors.text }
                      ]}>
                        {player.id + 1}
                      </Text>
                    </View>
                    <Text style={[
                      styles.slotName,
                      { color: isOccupied ? colors.disabledText : colors.text }
                    ]}>
                      {player.name}
                    </Text>
                  </View>
                  {isOccupied ? (
                    <Icon name="lock" size={24} color={colors.disabledText} />
                  ) : isSelected ? (
                    <Icon name="check-circle" size={24} color={colors.secondary} />
                  ) : (
                    <Icon name="chevron-right" size={24} color={colors.textTertiary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bouton confirmer */}
          {selectedPlayer !== null ? (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleSelectPlayer}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={colors.secondaryGradient}
                style={styles.confirmButtonGradient}
              >
                <Icon name="check-circle" size={28} color="#fff" />
                <Text style={styles.confirmButtonText}>Confirmer</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={[styles.confirmButton, styles.confirmButtonDisabled]}>
              <View style={[styles.confirmButtonDisabledBg, { backgroundColor: colors.disabled }]}>
                <Icon name="check-circle" size={28} color={colors.disabledText} />
                <Text style={[styles.confirmButtonText, { color: colors.disabledText }]}>
                  Confirmer
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
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  iconContainer: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 32,
    marginTop: 20,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#11998e',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  iconGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    opacity: 0.2,
    transform: [{ scale: 1.3 }],
    zIndex: -1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputCard: {
    borderRadius: 16,
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
  joinButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#11998e',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 15,
    marginTop: 16,
  },
  joinButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  joinButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 14,
  },
  joinButtonDisabledBg: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 14,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  slotsContainer: {
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
  },
  slotCardOccupied: {
    opacity: 0.5,
  },
  slotLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  slotNumber: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  slotName: {
    fontSize: 17,
    fontWeight: '600',
  },
  confirmButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#11998e',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 15,
  },
  confirmButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 14,
  },
  confirmButtonDisabledBg: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 14,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default JoinScreen;