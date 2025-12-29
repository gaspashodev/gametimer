import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Hourglass,
  UserCheck,
  UserLock,
  Share2,
  ChevronUp,
  ChevronDown,
  Check,
  StepForward,
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

// ✅ Fonction pour déterminer la couleur du timer selon le temps restant
const getPlayerColor = (player, session, colors) => {
  if (player.isEliminated) {
    return '#991B1B'; // Rouge foncé (éliminé)
  }
  
  if (!session.timeLimit) return colors.secondary;
  
  const percentage = (player.time / session.timeLimit) * 100;
  
  if (percentage <= 10) {
    return '#DC2626'; // Rouge (critique)
  } else if (percentage <= 25) {
    return '#F59E0B'; // Orange (warning)
  } else if (player.isRunning) {
    return colors.secondary; // Vert (en cours)
  } else {
    return colors.primary; // Violet (inactif)
  }
};

const GameDistributedScreen = ({ route, navigation }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { sessionId, joinCode, mode, myPlayerId } = route.params;
  const [players, setPlayers] = useState([]);
  const [globalTime, setGlobalTime] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionStatus, setSessionStatus] = useState('lobby');
  const [connectedPlayers, setConnectedPlayers] = useState([]);
  const [playerOrder, setPlayerOrder] = useState([]); // Ordre personnalisé des joueurs dans le lobby
  const [session, setSession] = useState(null);
  const { t } = useLanguage();

  const myPlayer = players.find((p) => p.id === myPlayerId);
  const isMyTurn = mode === 'sequential' && players[currentPlayerIndex]?.id === myPlayerId;
  const isCreator = myPlayerId === 0;

  const playerIntervalRef = useRef(null);
  const otherPlayersIntervalRef = useRef(null);
  const playersRef = useRef([]);


  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Initialiser l'ordre des joueurs
  useEffect(() => {
    if (players.length > 0 && playerOrder.length === 0) {
      setPlayerOrder(players.map(p => p.id));
    }
  }, [players]);

  useEffect(() => {
    const callbacks = {
      onConnect: () => {
        setIsConnected(true);
        ApiService.joinAsPlayer(sessionId, myPlayerId);
      },
      onDisconnect: () => setIsConnected(false),
      onSessionUpdate: (session) => {
        setSession(session); // ✅ AJOUTÉ : Stocker la session

        const updatedPlayers = session.players.map(serverPlayer => {
          const localPlayer = playersRef.current.find(p => p.id === serverPlayer.id);
          
          if (localPlayer && serverPlayer.isRunning && localPlayer.isRunning) {
            return {
              ...serverPlayer,
              time: Math.max(localPlayer.time, serverPlayer.time)
            };
          }
          
          return serverPlayer;
        });
        
        setPlayers(updatedPlayers);
        setGlobalTime(session.globalTime);
        setCurrentPlayerIndex(session.currentPlayerIndex);
        setSessionStatus(session.status || 'started');
        setConnectedPlayers(session.connectedPlayers || []);

        // Détecter fin de partie
        if (session.status === 'finished') {
          Alert.alert(
            t('distributed.allEliminated'),
            t('distributed.viewStats'),
            [
              {
                text: 'OK',
                onPress: () => navigation.replace('PartyStats', { sessionId })
              }
            ]
          );
        }
      },
    };

    ApiService.connectSocket(sessionId, callbacks);

    return () => {
      ApiService.disconnectSocket();
      if (playerIntervalRef.current) clearInterval(playerIntervalRef.current);
      if (otherPlayersIntervalRef.current) clearInterval(otherPlayersIntervalRef.current);
    };
  }, [sessionId, myPlayerId]);

  useEffect(() => {
    if (players.length > 0 && globalTime === 0) {
      const total = players.reduce((sum, player) => sum + player.time, 0);
      setGlobalTime(total);
    }
  }, [players]);

  useEffect(() => {
    const isRunning = myPlayer?.isRunning || false;
    
    if (isRunning && !playerIntervalRef.current) {
      playerIntervalRef.current = setInterval(() => {
        setPlayers((prev) => {
          return prev.map((p) => {
            if (p.id === myPlayerId) {
              const newTime = Math.max(0, p.time - 1);
              
              if (newTime % 3 === 0) {
                ApiService.updateTime(sessionId, myPlayerId, newTime);
              }
              
              return { ...p, time: newTime };
            }
            return p;
          });
        });
      }, 1000);
    } else if (!isRunning && playerIntervalRef.current) {
      clearInterval(playerIntervalRef.current);
      playerIntervalRef.current = null;
    }

    return () => {
      if (playerIntervalRef.current) {
        clearInterval(playerIntervalRef.current);
        playerIntervalRef.current = null;
      }
    };
  }, [myPlayer?.isRunning, myPlayerId, sessionId]);

  useEffect(() => {
    const hasOtherRunning = players.some(p => p.id !== myPlayerId && p.isRunning);
    
    if (hasOtherRunning && !otherPlayersIntervalRef.current) {
      otherPlayersIntervalRef.current = setInterval(() => {
        setPlayers((prev) => {
          return prev.map((p) => {
            if (p.id !== myPlayerId && p.isRunning) {
              return { ...p, time: Math.max(0, p.time - 1) };
            }
            return p;
          });
        });
      }, 1000);
    } else if (!hasOtherRunning && otherPlayersIntervalRef.current) {
      clearInterval(otherPlayersIntervalRef.current);
      otherPlayersIntervalRef.current = null;
    }

    return () => {
      if (otherPlayersIntervalRef.current) {
        clearInterval(otherPlayersIntervalRef.current);
        otherPlayersIntervalRef.current = null;
      }
    };
  }, [players, myPlayerId]);

  const toggleMyPlayer = () => {
    if (sessionStatus !== 'started') {
      Alert.alert(t('join.error'), t('distributed.notStarted'));
      return;
    }
    
    if (mode === 'sequential' && !isMyTurn) {
      Alert.alert(t('distributed.caution'), t('distributed.notYourTurn'));
      return;
    }
    
    // ✅ CORRIGÉ : Vérifier élimination AVANT update
    if (myPlayer?.isEliminated) {
      Alert.alert(
        t('distributed.eliminated'),
        t('distributed.timeUp')
      );
      return;
    }
    
    if (myPlayer && myPlayer.isRunning) {
      ApiService.updateTime(sessionId, myPlayerId, myPlayer.time);
    }
    
    ApiService.updateGlobalTime(sessionId, globalTime);
    ApiService.togglePlayer(sessionId, myPlayerId);
  };

  const handleSkipPlayer = () => {
    if (!isCreator) {
      Alert.alert(t('join.error'), t('distributed.skipAdmin'));
      return;
    }
    
    if (mode !== 'sequential') {
      Alert.alert(t('join.error'), t('distributed.skipTurnByTurn'));
      return;
    }
    
    const currentPlayer = players[currentPlayerIndex];
    Alert.alert(
      t('distributed.skipPlayer'),
      t('distributed.confirmSkipPlayer', { player: currentPlayer?.name })
,
      [
        { text: t('distributed.cancel'), style: 'cancel' },
        {
          text: t('distributed.skip'),
          style: 'destructive',
          onPress: () => ApiService.skipPlayer(sessionId, myPlayerId),
        },
      ]
    );
  };

  const handlePauseAll = () => {
    if (!isCreator) {
      Alert.alert(t('join.error'), t('distributed.globalPause'));
      return;
    }
    
    ApiService.pauseAll(sessionId);
  };

  const handleReset = () => {
    if (!isCreator) {
      Alert.alert(t('join.error'), t('distributed.resetAdmin'));
      return;
    }
    
    Alert.alert(t('distributed.reset'), t('distributed.resetTimers'), [
      { text: t('distributed.cancel'), style: 'cancel' },
      {
        text: t('distributed.reset'),
        style: 'destructive',
        onPress: () => ApiService.resetSession(sessionId),
      },
    ]);
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

  // Déplacer un joueur vers le haut dans l'ordre
  const movePlayerUp = (playerId) => {
    const currentIndex = playerOrder.indexOf(playerId);
    if (currentIndex > 0) {
      const newOrder = [...playerOrder];
      [newOrder[currentIndex - 1], newOrder[currentIndex]] = [newOrder[currentIndex], newOrder[currentIndex - 1]];
      setPlayerOrder(newOrder);
    }
  };

  // Déplacer un joueur vers le bas dans l'ordre
  const movePlayerDown = (playerId) => {
    const currentIndex = playerOrder.indexOf(playerId);
    if (currentIndex < playerOrder.length - 1) {
      const newOrder = [...playerOrder];
      [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
      setPlayerOrder(newOrder);
    }
  };

  // Obtenir les joueurs dans l'ordre personnalisé
  const getOrderedPlayers = () => {
    return playerOrder.map(id => players.find(p => p.id === id)).filter(Boolean);
  };

  // Partager le code de la partie
  const handleShare = async () => {
    try {
      const message = `${t('distributed.joinMyGame')}\n\n${t('distributed.code')} ${joinCode}\n\n${t('distributed.codeToJoin')}`;
      
      const result = await Share.share({
        message: message,
        title: t('distributed.title'),
      });

    } catch (error) {
      Alert.alert(t('join.error'), t('distributed.noShareCode'));
      console.error(t('distributed.shareError'), error);
    }
  };

  if (!myPlayer) {
    return (
      <LinearGradient colors={colors.background} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {t('distributed.loading')}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ÉCRAN DE LOBBY
  if (sessionStatus === 'lobby') {
    const allConnected = connectedPlayers.length === players.length;

    return (
      <LinearGradient colors={colors.background} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={styles.lobbyContent}>
            {/* Header lobby */}
            <View style={[styles.lobbyHeader, { backgroundColor: colors.card }]}>
              
              <Text style={[styles.lobbyTitle, { color: colors.text }]}>
                {t('distributed.lobby')}
              </Text>
              
              <View style={[styles.codeBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(102,126,234,0.1)' }]}>
                <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>
                  {t('distributed.roomCode')}
                </Text>
                <Text style={[styles.codeValue, { color: colors.primary }]}>
                  {joinCode}
                </Text>
                <TouchableOpacity
                  style={[styles.shareButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(102,126,234,0.15)' }]}
                  onPress={handleShare}
                  activeOpacity={0.7}
                >
                  <Share2 size={18} color={colors.primary}  strokeWidth={2} />
                  <Text style={[styles.shareButtonText, { color: colors.primary }]}>
                    {t('distributed.shareCode')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.connectionBadge, { 
                backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' 
              }]}>
                <View style={[
                  styles.connectionDot,
                  { backgroundColor: isConnected ? colors.success : colors.danger }
                ]} />
                <Text style={[
                  styles.connectionText,
                  { color: isConnected ? colors.success : colors.danger }
                ]}>
                  {isConnected ? t('distributed.connected') : t('distributed.disconnected')}
                </Text>
              </View>
            </View>

            {/* Liste des joueurs */}
            <View style={[styles.playersStatusCard, { backgroundColor: colors.card }]}>
              <View style={styles.playersStatusHeader}>
                <Text style={[styles.playersStatusTitle, { color: colors.text }]}>
                  {t('distributed.connectPlayers')}
                </Text>
                <View style={[styles.counterBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(102,126,234,0.1)' }]}>
                  <Text style={[styles.counterText, { color: colors.primary }]}>
                    {connectedPlayers.length}/{players.length}
                  </Text>
                </View>
              </View>

              <View style={styles.playersList}>
                {getOrderedPlayers().map((player, index) => {
                  const isPlayerConnected = connectedPlayers.includes(player.id);
                  const isMe = player.id === myPlayerId;
                  
                  return (
                    <View 
                      key={player.id} 
                      style={[
                        styles.lobbyPlayerCard,
                        { 
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                          borderColor: isMe ? colors.primary : 'transparent',
                          borderWidth: isMe ? 2 : 0,
                        }
                      ]}
                    >
                      <View style={styles.lobbyPlayerLeft}>
                        {/* Numéro d'ordre */}
                        <View style={[
                          styles.orderNumberBadge,
                          { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(102,126,234,0.1)' }
                        ]}>
                          <Text style={[styles.orderNumber, { color: colors.primary }]}>
                            {index + 1}
                          </Text>
                        </View>

                        <View style={[
                          styles.lobbyPlayerIcon,
                          { 
                            backgroundColor: isPlayerConnected 
                              ? 'rgba(16, 185, 129, 0.15)' 
                              : 'rgba(156, 163, 175, 0.15)'
                          }
                        ]}>
                          {isPlayerConnected ? (
                            <Check size={24} color={colors.success} strokeWidth={2} />
                          ) : (
                            <Hourglass size={24} color={colors.textTertiary} strokeWidth={2} />
                          )}
                        </View>
                        <View>
                          <Text style={[styles.lobbyPlayerName, { color: colors.text }]}>
                            {player.name} {isMe && t('distributed.you')}
                          </Text>
                          <Text style={[
                            styles.lobbyPlayerStatus,
                            { color: isPlayerConnected ? colors.success : colors.textTertiary }
                          ]}>
                            {isPlayerConnected ? t('distributed.ready') : t('distributed.waiting')}
                          </Text>
                        </View>
                      </View>

                      {/* Boutons de réorganisation - visible uniquement pour le créateur */}
                      {isCreator && (
                        <View style={styles.reorderButtons}>
                          <TouchableOpacity
                            style={[
                              styles.reorderButton,
                              { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' },
                            ]}
                            onPress={() => movePlayerUp(player.id)}
                            disabled={index === 0}
                            activeOpacity={0.7}
                          >
                            <ChevronUp size={18} color={index === 0 ? colors.disabled : colors.primary} strokeWidth={2} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.reorderButton,
                              { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' },
                            ]}
                            onPress={() => movePlayerDown(player.id)}
                            disabled={index === playerOrder.length - 1}
                            activeOpacity={0.7}
                          >
                            <ChevronDown size={18} color={index === playerOrder.length - 1 ? colors.disabled : colors.primary}  strokeWidth={2} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Badge tous prêts */}
            {allConnected && (
              <View style={[styles.readyBanner, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Check size={24} color={colors.success}  strokeWidth={2} />
                <Text style={[styles.readyText, { color: colors.success }]}>
                  {t('distributed.allReady')}
                </Text>
              </View>
            )}

            {/* Boutons */}
            {isCreator ? (
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => ApiService.startGame(sessionId)}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={allConnected ? colors.primaryGradient : ['#F59E0B', '#D97706']}
                  style={styles.startButtonGradient}
                >
                  <Text style={styles.startButtonText}>
                    {allConnected ? t('distributed.startGame') : t('distributed.startWhatever')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={[styles.waitingMessage, { backgroundColor: colors.card }]}>
                <Text style={[styles.waitingText, { color: colors.textSecondary }]}>
                  {t('distributed.waitingFor')} {players[0]?.name}...
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.lobbyBackButton}
              onPress={handleQuit}
              activeOpacity={0.7}
            >
              <Text style={[styles.lobbyBackButtonText, { color: colors.textSecondary }]}>
                {t('distributed.leave')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const ActionIcon = myPlayer.isRunning ? Pause : Play;
  const PlayerTurnIcon = isMyTurn ? UserCheck : UserLock;
  return (
    <LinearGradient colors={colors.background} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.gameContent}>
          {/* Header */}
          <View style={[styles.gameHeader, { backgroundColor: colors.card }]}>
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
                {isCreator && players.some(p => p.isRunning) && (
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#FEF3C7' }]}
                    onPress={handlePauseAll}
                    activeOpacity={0.7}
                  >
                    <Pause size={20} color={colors.warning}  strokeWidth={2} />
                  </TouchableOpacity>
                )}
                {isCreator && mode === 'sequential' && (
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E0E7FF' }]}
                    onPress={handleSkipPlayer}
                    activeOpacity={0.7}
                  >
                    <StepForward size={20} color={colors.primary}  strokeWidth={2} />
                  </TouchableOpacity>
                )}
                {isCreator && (
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#FEE2E2' }]}
                    onPress={handleReset}
                    activeOpacity={0.7}
                  >
                    <RefreshCw size={20} color={colors.danger}  strokeWidth={2} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#EEF2FF' }]}
                  onPress={() => navigation.navigate('PartyStats', { sessionId })}
                  activeOpacity={0.7}
                >
                  <BarChart3 size={20} color={colors.primary}  strokeWidth={2} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}
                  onPress={handleQuit}
                  activeOpacity={0.7}
                >
                  <DoorOpen size={20} color={colors.textSecondary}  strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Temps global */}
            <LinearGradient
              colors={colors.primaryGradient}
              style={styles.gameGlobalTime}
            >
              <Text style={styles.gameGlobalLabel}>{t('stats.totalTime')}</Text>
              <Text style={styles.gameGlobalValue}>{formatTime(globalTime)}</Text>
            </LinearGradient>

            {mode === 'sequential' && (
              <View style={[styles.gameTurnBadge, { backgroundColor: isMyTurn ? colors.warning : colors.card }]}>
                <PlayerTurnIcon size={18} color={isMyTurn ? '#fff' : colors.text} strokeWidth={2} />

                <Text style={[styles.gameTurnText, { color: isMyTurn ? '#fff' : colors.text }]}>
                  {isMyTurn ? t('distributed.yourTurn') : t('distributed.turnOf', { player: players[currentPlayerIndex]?.name })}
                                  

                </Text>
              </View>
            )}
          </View>

          {/* Ma carte joueur */}
          <View
            style={[
              styles.myPlayerCard,
              { 
                backgroundColor: colors.card,
                borderColor: myPlayer?.isEliminated 
                  ? '#DC2626'
                  : myPlayer?.isRunning 
                    ? colors.secondary 
                    : colors.cardBorder 
              },
              myPlayer?.isEliminated && styles.myPlayerCardEliminated,
            ]}
          >
            <Text style={[styles.myPlayerLabel, { color: myPlayer.isRunning || isMyTurn ? '#fff' : colors.textSecondary }]}>
              {t('distributed.yourTime')}
            </Text>
            <Text style={[styles.myPlayerName, { color: myPlayer.isRunning || isMyTurn ? '#fff' : colors.text }]}>
              {myPlayer.name}
            </Text>
            <Text 
              style={[
                styles.myPlayerTime,
                { color: getPlayerColor(myPlayer, session || {}, colors) }
              ]}
            >
              {formatTime(myPlayer.time)}
            </Text>

            <TouchableOpacity
              style={[
                styles.mainButton,
                myPlayer?.isEliminated && styles.mainButtonDisabled,
                mode === 'sequential' && !isMyTurn && styles.mainButtonDisabled,
                myPlayer?.isRunning ? styles.pauseButton : styles.playButton,
              ]}
              onPress={toggleMyPlayer}
              disabled={myPlayer?.isEliminated || (mode === 'sequential' && !isMyTurn)}
            >
              {myPlayer?.isEliminated ? (
                <>
                  <Text style={styles.mainButtonText}>{t('distributed.eliminated')}</Text>
                </>
              ) : (
                <>
                  {myPlayer?.isRunning ? <Pause size={40} color="#fff" /> : <Play size={40} color="#fff" />}
                  <Text style={styles.mainButtonText}>
                    {myPlayer?.isRunning
                      ? mode === 'sequential'
                        ? t('distributed.skipToNext')
                        : t('distributed.pause')
                      : t('distributed.start')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {mode === 'sequential' && !isMyTurn && (
              <Text style={[styles.waitText, { color: colors.textSecondary }]}>
                {t('distributed.waitingForYourTurn')}
              </Text>
            )}
          </View>

          {/* Autres joueurs */}
          <View style={[styles.otherPlayersSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('distributed.others')}
            </Text>
            {players
              .filter((p) => p.id !== myPlayerId)
              .map((player) => (
                <View 
                  key={player.id} 
                  style={[
                    styles.otherPlayerCard,
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' },
                    player.isEliminated && styles.otherPlayerCardEliminated,
                  ]}
                >
                  <View style={styles.otherPlayerInfo}>
                    <Text 
                      style={[
                        styles.otherPlayerName, 
                        { color: colors.text },
                        player.isEliminated && { color: '#9CA3AF' }
                      ]}
                    >
                      {player.name}
                      {player.isEliminated && ' ⚫'}
                    </Text>
                    {player.isRunning && !player.isEliminated && (
                      <Play size={20} color={colors.secondary} />
                    )}
                  </View>
                  <Text 
                    style={[
                      styles.otherPlayerTime,
                      { 
                        color: getPlayerColor(player, session || {}, colors),
                        fontFamily: 'monospace' 
                      }
                    ]}
                  >
                    {formatTime(player.time)}
                  </Text>
                </View>
              ))}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  
  // LOBBY STYLES
  lobbyContent: {
    padding: 24,
    paddingBottom: 40,
  },
  lobbyHeader: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  lobbyIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  lobbyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  codeBox: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  playersStatusCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  playersStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  playersStatusTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  counterBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  counterText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  playersList: {
    gap: 10,
  },
  lobbyPlayerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
  },
  lobbyPlayerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  reorderButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lobbyPlayerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lobbyPlayerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  lobbyPlayerStatus: {
    fontSize: 13,
    fontWeight: '500',
  },
  readyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  readyText: {
    fontSize: 16,
    fontWeight: '700',
  },
  startButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 15,
    marginBottom: 16,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 14,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  waitingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  waitingText: {
    fontSize: 15,
  },
  lobbyBackButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  lobbyBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // GAME STYLES
  gameContent: {
    padding: 20,
    paddingBottom: 40,
  },
  gameHeader: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
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
  codeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameGlobalTime: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  gameGlobalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.9,
    marginBottom: 2,
  },
  gameGlobalValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
  },
  gameTurnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  gameTurnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  myPlayerCard: {
    borderRadius: 24,
    borderWidth: 3,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  myPlayerLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  myPlayerName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  myPlayerTime: {
    fontSize: 56,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 24,
  },
  mainButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  mainButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  waitText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
  },
  otherPlayersSection: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  otherPlayerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  otherPlayerLeft: {
    flex: 1,
    gap: 6,
  },
  otherPlayerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  runningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  runningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  runningText: {
    fontSize: 12,
    fontWeight: '600',
  },
  otherPlayerTime: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  myPlayerCardEliminated: {
    opacity: 0.6,
    borderWidth: 3,
    borderColor: '#DC2626',
  },
  mainButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.5,
  },
  otherPlayerCardEliminated: {
    opacity: 0.5,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
});

export default GameDistributedScreen;