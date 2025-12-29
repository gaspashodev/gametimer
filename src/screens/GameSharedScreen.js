import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Hourglass,
  Timer,
  PauseCircle,
  RefreshCw,
  BarChart3,
  DoorOpen,
  Play,
  Pause,
} from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import ApiService from '../services/ApiService';
import { formatTime } from '../utils/helpers';
import { useLanguage } from '../contexts/LanguageContext';

const getPlayerColor = (player, session, colors) => {
  if (player.isEliminated) {
    return '#991B1B'; // Rouge foncé (éliminé)
  }
  
  if (!session.timeLimit) return colors.secondary;
  
  const percentage = (player.time / session.timeLimit) * 100;
  
  if (percentage <= 10) {
    return '#DC2626'; // Rouge (< 10%)
  } else if (percentage <= 25) {
    return '#F59E0B'; // Orange (< 25%)
  } else if (player.isRunning) {
    return colors.secondary; // Vert (normal actif)
  } else {
    return colors.primary; // Violet (normal inactif)
  }
};

const GameSharedScreen = ({ route, navigation }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { sessionId, joinCode, mode } = route.params;
  const [players, setPlayers] = useState([]);
  const [globalTime, setGlobalTime] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState(null); // ✅ AJOUTÉ : Stocker la session
  const { t } = useLanguage();

  const playerIntervalsRef = useRef({});
  const globalTimeRef = useRef(0);
  const playersRef = useRef([]);

  useEffect(() => {
    globalTimeRef.current = globalTime;
  }, [globalTime]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    const callbacks = {
      onConnect: () => setIsConnected(true),
      onDisconnect: () => setIsConnected(false),
      onSessionUpdate: (session) => {
        setSession(session); // ✅ AJOUTÉ : Stocker la session
        const updatedPlayers = session.players.map(serverPlayer => {
          const localPlayer = playersRef.current.find(p => p.id === serverPlayer.id);
          
          if (localPlayer && localPlayer.isRunning && serverPlayer.isRunning) {
            return { 
              ...serverPlayer, 
              time: Math.max(localPlayer.time, serverPlayer.time)
            };
          }
          
          return serverPlayer;
        });
        
        setPlayers(updatedPlayers);
        setCurrentPlayerIndex(session.currentPlayerIndex);
        
        // Marquer comme chargé dès qu'on a les données
        if (isLoading && updatedPlayers.length > 0) {
          setIsLoading(false);
        }

        // ✅ Check si tous éliminés
          if (session.status === 'finished') {
            Alert.alert(
              t('distributed.allEliminated'),
              t('distributed.viewStats'),
              [{
                text: 'OK',
                onPress: () => navigation.replace('PartyStats', { sessionId })
              }]
            );
          }
      },
    };

    ApiService.connectSocket(sessionId, callbacks);

    return () => {
      ApiService.disconnectSocket();
      Object.values(playerIntervalsRef.current).forEach(clearInterval);
    };
  }, [sessionId]);

  useEffect(() => {
    const total = players.reduce((sum, player) => sum + player.time, 0);
    setGlobalTime(total);
    
    if (total % 3 === 0 && total > 0) {
      ApiService.updateGlobalTime(sessionId, total);
    }
  }, [players, sessionId]);

  useEffect(() => {
    players.forEach((player) => {
      if (player.isRunning && !playerIntervalsRef.current[player.id]) {
        playerIntervalsRef.current[player.id] = setInterval(() => {
          setPlayers((prev) => {
            const newPlayers = prev.map((p) =>
              p.id === player.id ? { ...p, time: Math.max(0, p.time - 1) } : p
            );

            const updatedPlayer = newPlayers.find((p) => p.id === player.id);
            if (updatedPlayer.time % 3 === 0) {
              ApiService.updateTime(sessionId, player.id, updatedPlayer.time);
            }

            return newPlayers;
          });
        }, 1000);
      } else if (!player.isRunning && playerIntervalsRef.current[player.id]) {
        clearInterval(playerIntervalsRef.current[player.id]);
        delete playerIntervalsRef.current[player.id];
      }
    });

    return () => {
      Object.values(playerIntervalsRef.current).forEach(clearInterval);
      playerIntervalsRef.current = {};
    };
  }, [players, sessionId]);

  const togglePlayer = (playerId) => {
    const player = players.find(p => p.id === playerId);
    
    // ✅ AJOUTÉ : Vérifier si le joueur est éliminé
    if (player?.isEliminated) {
      Alert.alert(
        t('distributed.eliminated'),
        t('distributed.timeUp')
      );
      return;
    }
    if (player && player.isRunning) {
      ApiService.updateTime(sessionId, playerId, player.time);
    }
    
    ApiService.updateGlobalTime(sessionId, globalTime);
    ApiService.togglePlayer(sessionId, playerId);
  };

  const pauseAll = () => {
    players.forEach(player => {
      if (player.isRunning) {
        ApiService.updateTime(sessionId, player.id, player.time);
      }
    });

    ApiService.pauseAll(sessionId);
  };

  const handleReset = () => {
    Alert.alert(
      t('distributed.reset'),
      t('distributed.resetTimers'),
      [
        { text: t('distributed.cancel'), style: 'cancel' },
        {
          text: t('distributed.reset'),
          style: 'destructive',
          onPress: () => ApiService.resetSession(sessionId),
        },
      ]
    );
  };

  const handleQuit = () => {
    Alert.alert(t('distributed.leave'), t('distributed.verifOut'), [
      { text: t('distributed.cancel'), style: 'cancel' },
      {
        text: t('distributed.leave'),
        style: 'destructive',
        onPress: () => {
          ApiService.disconnectSocket();
          navigation.navigate('Home');
        },
      },
    ]);
  };

  const renderPlayer = ({ item: player, index }) => {
    const isCurrentTurn = mode === 'sequential' && index === currentPlayerIndex;
    const canInteract = mode === 'independent' || isCurrentTurn;
    const ActionIcon = player.isRunning ? Pause : Play;
    const isEliminated = player.isEliminated;
    const playerColor = getPlayerColor(player, { timeLimit: session?.timeLimit }, colors);

    return (
      <View style={styles.playerCardWrapper}>
        <View
          style={[
            styles.playerCard,
            player.isRunning && styles.playerCardActive,
            isCurrentTurn && !player.isRunning && styles.playerCardTurn,
            isEliminated && styles.playerCardEliminated, // ✅ NOUVEAU
          ]}
        >
          <Text style={[styles.playerName, { color: player.isRunning || isCurrentTurn ? '#fff' : colors.text }]}>
            {player.name}
          </Text>
          <Text style={[styles.playerTime, { color: player.isRunning || isCurrentTurn ? '#fff' : colors.text }]}>
            {formatTime(player.time)}
          </Text>
          
          <TouchableOpacity
            style={[
                styles.playerButton,
                { backgroundColor: playerColor },
                isEliminated && styles.playerButtonDisabled,
              ]}
            onPress={() => togglePlayer(player.id)}
            disabled={!canInteract || isEliminated}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                !canInteract
                  ? [colors.disabled, colors.disabled]
                  : player.isRunning
                    ? ['#F59E0B', '#D97706']
                    : colors.primaryGradient
              }
              style={styles.playerButtonGradient}
            >
              <ActionIcon size={20} color="#fff" strokeWidth={2} />

              <Text style={styles.playerButtonText}>
                {isEliminated ? t('distributed.eliminated') : (player.isRunning
                  ? mode === 'sequential'
                    ? t('distributed.skipToNext')
                    : t('distributed.pause')
                  : t('distributed.start'))}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={colors.background} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Afficher loading tant que pas de données */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Hourglass size={64} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              {t('distributed.loading')}
            </Text>
          </View>
        ) : (
          <>
            {/* Header FIXE (non scrollable) */}
            <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
          <View style={styles.headerTop}>
            <View style={styles.connectionStatus}>
              <View style={[
                styles.connectionDot,
                { backgroundColor: isConnected ? colors.success : colors.danger }
              ]} />
              <Text style={[styles.codeText, { color: colors.textSecondary }]}>
                 {t('distributed.code')} {joinCode}
              </Text>
            </View>

            <View style={styles.headerButtons}>
              {players.some(p => p.isRunning) && (
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: colors.card }]}
                  onPress={pauseAll}
                  activeOpacity={0.7}
                >
                  <PauseCircle size={22} color={colors.warning} strokeWidth={2} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: colors.card }]}
                onPress={handleReset}
                activeOpacity={0.7}
              >
                <RefreshCw size={22} color={colors.danger} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: colors.card }]}
                onPress={() => navigation.navigate('PartyStats', { sessionId })}
                activeOpacity={0.7}
              >
                <BarChart3 size={22} color={colors.primary} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: colors.card }]}
                onPress={handleQuit}
                activeOpacity={0.7}
              >
                <DoorOpen size={22} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Temps global - Dégradé sur élément principal */}
          <LinearGradient
            colors={colors.primaryGradient}
            style={styles.globalTimeCard}
          >
            <Text style={styles.globalTimeLabel}>Temps Total</Text>
            <Text style={styles.globalTime}>{formatTime(globalTime)}</Text>
          </LinearGradient>

          {mode === 'sequential' && (
            <View style={[styles.turnBadge, { backgroundColor: colors.card }]}>
              <Timer size={20} color={colors.text}  strokeWidth={2} />
              <Text style={[styles.turnText, { color: colors.text }]}>
                {t('distributed.turnOf', { player: players[currentPlayerIndex]?.name })}
              </Text>
            </View>
          )}
        </View>

        {/* Grille scrollable séparée */}
        <FlatList
          data={players}
          renderItem={renderPlayer}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.playersGrid}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
        />
          </>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  globalTimeCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  globalTimeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  globalTime: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
  },
  turnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'center',
  },
  turnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  playersGrid: {
    padding: 16,
    paddingBottom: 32,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  // ✅ FIX : Wrapper pour forcer 50% même avec joueurs impairs
  playerCardWrapper: {
    flex: 1,
    maxWidth: '50%',
  },
  playerCard: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '700',
  },
  playerTime: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  playerButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  playerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  playerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  playerCardEliminated: {
    backgroundColor: 'rgba(153, 27, 27, 0.2)',
    borderColor: '#DC2626',
    opacity: 0.7,
  },
  playerButtonDisabled: {
    opacity: 0.5,
  },
});

export default GameSharedScreen;