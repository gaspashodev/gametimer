import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft,
  LogIn,
  User,
  UserCheck,
} from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import ApiService from '../services/ApiService';
import StorageService from '../services/StorageService';
import LoadingOverlay from '../components/LoadingOverlay';
import { useLanguage } from '../contexts/LanguageContext';

const JoinScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [step, setStep] = useState(1); // 1: code+pseudo, 2: sélection joueur
  const [joinCode, setJoinCode] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const [loadingMessage, setLoadingMessage] = useState(t('join.lookingGame'));
  const [sessionData, setSessionData] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    loadSavedPseudo();
  }, []);

  const loadSavedPseudo = async () => {
    const savedPseudo = await StorageService.getPseudo();
    if (savedPseudo) {
      setPseudo(savedPseudo);
    }
  };

  const isSlowWakeupTime = () => {
    const hour = new Date().getHours();
    return hour >= 0 && hour < 9;
  };

  const handleJoinSession = async () => {
    if (joinCode.length < 6) {
      Alert.alert(t('join.error'), t('join.validCode'));
      return;
    }

if (!pseudo.trim()) {
  Alert.alert(t('join.error'), t('join.homePseudo'));
  navigation.navigate('Home');
  return;
}

    setLoading(true);
    
    if (isSlowWakeupTime()) {
      setLoadingMessage(t('join.awakeServer'));
    } else {
      setLoadingMessage(t('join.lookingGame'));
    }

    try {
      const data = await ApiService.joinSession(joinCode);
      setSessionData(data);
      setLoading(false);

      if (data.session.displayMode === 'shared') {
        navigation.navigate('GameShared', {
          sessionId: data.sessionId,
          joinCode: joinCode,
          mode: data.session.mode,
        });
      } else {
        setStep(2);
      }
    } catch (error) {
      setLoading(false);
      Alert.alert(t('join.error'), t('join.verifCode'));
    }
  };

  const handleSelectPlayer = () => {
    if (selectedPlayer === null) {
      Alert.alert(t('join.error'), t('join.anotherPlayer'));
      return;
    }

    const isAlreadyConnected = sessionData.session.connectedPlayers?.includes(selectedPlayer);
    if (isAlreadyConnected) {
      Alert.alert(t('join.error'), t('join.playerAlreadyConnected'));
      return;
    }

    navigation.navigate('GameDistributed', {
      sessionId: sessionData.sessionId,
      joinCode: joinCode,
      mode: sessionData.session.mode,
      myPlayerId: selectedPlayer,
    });
  };

  // Step 2: Sélection joueur (mode distribué)
  if (step === 2 && sessionData && sessionData.session.displayMode === 'distributed') {
    return (
      <LinearGradient colors={colors.background} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.card }]}
              onPress={() => {
                setStep(1);
                setSessionData(null);
                setSelectedPlayer(null);
              }}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('join.choosePlayer')}</Text>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('join.selectPlayer')}
            </Text>

            <View style={styles.playersContainer}>
              {sessionData.session.players.map((player) => {
                const isAlreadyConnected = sessionData.session.connectedPlayers?.includes(player.id);
                const isSelected = selectedPlayer === player.id;
                const PlayerIcon = isAlreadyConnected ? UserCheck : User;

                return (
                  <TouchableOpacity
                    key={player.id}
                    style={[
                      styles.playerButton,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : isAlreadyConnected
                            ? colors.disabled
                            : colors.card,
                        borderColor: isSelected ? colors.primary : colors.cardBorder,
                      },
                    ]}
                    onPress={() => !isAlreadyConnected && setSelectedPlayer(player.id)}
                    disabled={isAlreadyConnected}
                    activeOpacity={0.7}
                  >
                    <PlayerIcon
                      size={32}
                      color={
                        isSelected
                          ? '#fff'
                          : isAlreadyConnected
                          ? colors.textTertiary
                          : colors.text
                      }
                      strokeWidth={2}
                    />
                    <Text
                      style={[
                        styles.playerButtonText,
                        {
                          color: isSelected ? '#fff' : isAlreadyConnected ? colors.textTertiary : colors.text,
                        },
                      ]}
                    >
                      {player.name}
                      {isAlreadyConnected && ' (Occupé)'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.confirmButton, selectedPlayer === null && { opacity: 0.5 }]}
              onPress={handleSelectPlayer}
              disabled={selectedPlayer === null}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={selectedPlayer !== null ? colors.primaryGradient : [colors.disabled, colors.disabled]}
                style={styles.confirmButtonGradient}
              >
                <Text style={styles.confirmButtonText}>{t('join.confirm')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Step 1: Code + Pseudo
  return (
    <LinearGradient colors={colors.background} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('join.joinButton')}</Text>
          <View style={{ width: 44 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <LogIn size={80} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.title, { color: colors.text }]}>{t('join.title')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('join.subtitle')}
            </Text>

            <TextInput
              style={[styles.codeInput, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
              placeholder={t('join.codePlaceHolder')}
              placeholderTextColor={colors.textSecondary}
              value={joinCode}
              onChangeText={(text) => setJoinCode(text.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.joinButton, !joinCode.trim() && { opacity: 0.5 }]}
              onPress={handleJoinSession}
              disabled={!joinCode.trim() || loading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={joinCode.trim() ? colors.secondaryGradient : [colors.disabled, colors.disabled]}
                style={styles.joinButtonGradient}
              >
                <Text style={styles.joinButtonText}>{t('join.joinButton')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

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
  content: {
    padding: 24,
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 40,
    textAlign: 'center',
  },
  codeInput: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 16,
  },
  joinButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  joinButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  playersContainer: {
    width: '100%',
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
  },
  playerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    gap: 16,
  },
  playerButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  confirmButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default JoinScreen;