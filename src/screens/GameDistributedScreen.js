import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import ApiService from '../services/ApiService';
import { formatTime } from '../utils/helpers';

const GameDistributedScreen = ({ route, navigation }) => {
  const { sessionId, joinCode, mode, myPlayerId } = route.params;
  const [players, setPlayers] = useState([]);
  const [globalTime, setGlobalTime] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionStatus, setSessionStatus] = useState('lobby');
  const [connectedPlayers, setConnectedPlayers] = useState([]);

  const myPlayer = players.find((p) => p.id === myPlayerId);
  const isMyTurn = mode === 'sequential' && 
                   players[currentPlayerIndex]?.id === myPlayerId;
  const isCreator = myPlayerId === 0; // Le créateur est toujours le joueur 0

  const playerIntervalRef = useRef(null);
  const otherPlayersIntervalRef = useRef(null); // ✅ NOUVEAU timer pour les autres
  const playersRef = useRef([]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    const callbacks = {
      onConnect: () => {
        setIsConnected(true);
        ApiService.joinAsPlayer(sessionId, myPlayerId);
      },
      onDisconnect: () => setIsConnected(false),
      onSessionUpdate: (session) => {
        // ✅ Réconciliation améliorée pour éviter le recul du chrono
        const updatedPlayers = session.players.map(serverPlayer => {
          const localPlayer = playersRef.current.find(p => p.id === serverPlayer.id);
          
          // Pour TOUS les joueurs en cours, privilégier le temps local s'il est supérieur
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
      },
    };

    ApiService.connectSocket(sessionId, callbacks);

    return () => {
      ApiService.disconnectSocket();
      if (playerIntervalRef.current) clearInterval(playerIntervalRef.current);
      if (otherPlayersIntervalRef.current) clearInterval(otherPlayersIntervalRef.current);
    };
  }, [sessionId, myPlayerId]);

  // Timer global - somme des temps de tous les joueurs
  useEffect(() => {
    const total = players.reduce((sum, player) => sum + player.time, 0);
    setGlobalTime(total);
  }, [players]);

  // Timer du joueur local uniquement
  useEffect(() => {
    const isRunning = myPlayer?.isRunning || false;
    
    if (isRunning && !playerIntervalRef.current) {
      playerIntervalRef.current = setInterval(() => {
        setPlayers((prev) => {
          return prev.map((p) => {
            if (p.id === myPlayerId) {
              const newTime = p.time + 1;
              
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

  // ✅ NOUVEAU : Timer pour les autres joueurs en cours
  useEffect(() => {
    const hasOtherRunning = players.some(p => p.id !== myPlayerId && p.isRunning);
    
    if (hasOtherRunning && !otherPlayersIntervalRef.current) {
      otherPlayersIntervalRef.current = setInterval(() => {
        setPlayers((prev) => {
          return prev.map((p) => {
            // Incrémenter les autres joueurs qui sont en cours
            if (p.id !== myPlayerId && p.isRunning) {
              return { ...p, time: p.time + 1 };
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
      Alert.alert('Attention', 'La partie n\'a pas encore commencé !');
      return;
    }
    
    if (mode === 'sequential' && !isMyTurn) {
      Alert.alert('Attention', "Ce n'est pas votre tour !");
      return;
    }
    
    if (myPlayer && myPlayer.isRunning) {
      ApiService.updateTime(sessionId, myPlayerId, myPlayer.time);
    }
    
    ApiService.updateGlobalTime(sessionId, globalTime);
    ApiService.togglePlayer(sessionId, myPlayerId);
  };

  // ✅ Skip un joueur (créateur uniquement)
  const handleSkipPlayer = () => {
    if (!isCreator) {
      Alert.alert('Erreur', 'Seul le créateur peut skip un joueur !');
      return;
    }
    
    if (mode !== 'sequential') {
      Alert.alert('Erreur', 'Le skip n\'est disponible qu\'en mode séquentiel !');
      return;
    }
    
    const currentPlayer = players[currentPlayerIndex];
    Alert.alert(
      'Skip Joueur',
      `Voulez-vous passer le tour de ${currentPlayer?.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => ApiService.skipPlayer(sessionId, myPlayerId),
        },
      ]
    );
  };

  // ✅ Pause globale (créateur uniquement)
  const handlePauseAll = () => {
    if (!isCreator) {
      Alert.alert('Erreur', 'Seul le créateur peut mettre en pause globale !');
      return;
    }
    
    ApiService.pauseAll(sessionId);
  };

  // ✅ Reset (créateur uniquement)
  const handleReset = () => {
    if (!isCreator) {
      Alert.alert('Erreur', 'Seul le créateur peut réinitialiser la partie !');
      return;
    }
    
    Alert.alert('Réinitialiser', 'Voulez-vous vraiment réinitialiser tous les timers ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Réinitialiser',
        style: 'destructive',
        onPress: () => ApiService.resetSession(sessionId),
      },
    ]);
  };

  const handleQuit = () => {
    Alert.alert('Quitter', 'Êtes-vous sûr de vouloir quitter la partie ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Quitter',
        style: 'destructive',
        onPress: () => {
          ApiService.disconnectSocket();
          navigation.navigate('Home');
        },
      },
    ]);
  };

  if (!myPlayer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Icon name="loading" size={50} color="#4F46E5" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Écran de lobby
  if (sessionStatus === 'lobby') {
    const allConnected = connectedPlayers.length === players.length;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.lobbyContent}>
          <View style={styles.lobbyHeader}>
            <Icon name="account-group" size={60} color="#4F46E5" />
            <Text style={styles.lobbyTitle}>Salle d'Attente</Text>
            <Text style={styles.lobbySubtitle}>Code de la partie</Text>
            <Text style={styles.lobbyCode}>{joinCode}</Text>
            
            <View style={styles.connectionBadge}>
              <Icon
                name={isConnected ? 'wifi' : 'wifi-off'}
                size={16}
                color={isConnected ? '#10B981' : '#EF4444'}
              />
              <Text style={styles.connectionText}>
                {isConnected ? 'Connecté' : 'Déconnecté'}
              </Text>
            </View>
          </View>

          <View style={styles.playersStatusContainer}>
            <Text style={styles.playersStatusTitle}>
              Joueurs : {connectedPlayers.length}/{players.length}
            </Text>
            
            {players.map((player) => {
              const isConnectedPlayer = connectedPlayers.includes(player.id);
              const isMe = player.id === myPlayerId;
              
              return (
                <View key={player.id} style={styles.lobbyPlayerCard}>
                  <View style={styles.lobbyPlayerInfo}>
                    <Icon
                      name={isConnectedPlayer ? 'check-circle' : 'clock-outline'}
                      size={24}
                      color={isConnectedPlayer ? '#10B981' : '#9CA3AF'}
                    />
                    <Text style={styles.lobbyPlayerName}>
                      {player.name} {isMe && '(Vous)'}
                    </Text>
                  </View>
                  <Text style={[
                    styles.lobbyPlayerStatus,
                    isConnectedPlayer && styles.lobbyPlayerStatusConnected
                  ]}>
                    {isConnectedPlayer ? 'Connecté' : 'En attente...'}
                  </Text>
                </View>
              );
            })}
          </View>

          {allConnected && (
            <View style={styles.readyBanner}>
              <Icon name="check-circle" size={24} color="#10B981" />
              <Text style={styles.readyText}>Tous les joueurs sont prêts !</Text>
            </View>
          )}

          {isCreator && (
            <TouchableOpacity
              style={[
                styles.startButton,
                !allConnected && styles.startButtonWarning
              ]}
              onPress={() => ApiService.startGame(sessionId)}
            >
              <Icon name="play-circle" size={28} color="#fff" />
              <Text style={styles.startButtonText}>
                {allConnected ? 'Démarrer la Partie' : 'Démarrer Quand Même'}
              </Text>
            </TouchableOpacity>
          )}

          {!isCreator && (
            <View style={styles.waitingMessage}>
              <Icon name="clock-outline" size={24} color="#6B7280" />
              <Text style={styles.waitingText}>
                En attente du lancement par {players[0]?.name}...
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.lobbyBackButton}
            onPress={handleQuit}
          >
            <Text style={styles.lobbyBackButtonText}>Quitter</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ✅ Écran de jeu - Header identique à GameSharedScreen
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.connectionStatus}>
              <Icon
                name={isConnected ? 'wifi' : 'wifi-off'}
                size={20}
                color={isConnected ? '#10B981' : '#EF4444'}
              />
              <Text style={styles.joinCodeTextSmall}>Code: {joinCode}</Text>
            </View>
            <View style={styles.headerButtons}>
              {/* ✅ Bouton Pause générale - visible uniquement si un joueur est actif ET si créateur */}
              {isCreator && players.some(p => p.isRunning) && (
                <TouchableOpacity 
                  style={[styles.iconButton, styles.pauseAllButton]} 
                  onPress={handlePauseAll}
                >
                  <Icon name="pause-circle" size={24} color="#F59E0B" />
                </TouchableOpacity>
              )}
              {/* ✅ Bouton Skip - uniquement en mode séquentiel ET si créateur */}
              {isCreator && mode === 'sequential' && (
                <TouchableOpacity 
                  style={[styles.iconButton, styles.skipButton]} 
                  onPress={handleSkipPlayer}
                >
                  <Icon name="skip-next" size={24} color="#6366F1" />
                </TouchableOpacity>
              )}
              {/* ✅ Bouton Reset - uniquement pour le créateur */}
              {isCreator && (
                <TouchableOpacity style={styles.iconButton} onPress={handleReset}>
                  <Icon name="refresh" size={24} color="#EF4444" />
                </TouchableOpacity>
              )}
              {/* ✅ Bouton Quitter - toujours visible */}
              <TouchableOpacity style={styles.iconButton} onPress={handleQuit}>
                <Icon name="exit-to-app" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.globalTimeContainer}>
            <Text style={styles.globalTimeLabel}>Temps Total</Text>
            <Text style={styles.globalTime}>{formatTime(globalTime)}</Text>
          </View>

          {mode === 'sequential' && (
            <Text style={styles.turnText}>
              {isMyTurn
                ? "C'est votre tour !"
                : `Tour de ${players[currentPlayerIndex]?.name}`}
            </Text>
          )}
        </View>

        <View
          style={[
            styles.myPlayerCard,
            myPlayer.isRunning && styles.myPlayerCardActive,
            isMyTurn && !myPlayer.isRunning && styles.myPlayerCardTurn,
          ]}
        >
          <Text style={styles.myPlayerName}>{myPlayer.name}</Text>
          <Text style={styles.myPlayerTime}>{formatTime(myPlayer.time)}</Text>

          <TouchableOpacity
            style={[
              styles.mainButton,
              mode === 'sequential' && !isMyTurn && styles.mainButtonDisabled,
              myPlayer.isRunning ? styles.pauseButton : styles.playButton,
            ]}
            onPress={toggleMyPlayer}
            disabled={mode === 'sequential' && !isMyTurn}
          >
            <Icon
              name={myPlayer.isRunning ? 'pause' : 'play'}
              size={40}
              color="#fff"
            />
            <Text style={styles.mainButtonText}>
              {myPlayer.isRunning
                ? mode === 'sequential'
                  ? 'Passer au Suivant'
                  : 'Pause'
                : 'Démarrer'}
            </Text>
          </TouchableOpacity>

          {mode === 'sequential' && !isMyTurn && (
            <Text style={styles.waitText}>Attendez votre tour</Text>
          )}
        </View>

        <View style={styles.otherPlayersSection}>
          <Text style={styles.sectionTitle}>Autres joueurs</Text>
          {players
            .filter((p) => p.id !== myPlayerId)
            .map((player) => (
              <View key={player.id} style={styles.otherPlayerCard}>
                <View style={styles.otherPlayerInfo}>
                  <Text style={styles.otherPlayerName}>{player.name}</Text>
                  {player.isRunning && (
                    <Icon name="play-circle" size={20} color="#10B981" />
                  )}
                </View>
                <Text style={styles.otherPlayerTime}>
                  {formatTime(player.time)}
                </Text>
              </View>
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#6B7280',
  },
  content: {
    padding: 20,
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  joinCodeTextSmall: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  pauseAllButton: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  skipButton: {
    backgroundColor: '#E0E7FF',
    borderRadius: 8,
  },
  globalTimeContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  globalTimeLabel: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
  globalTime: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4F46E5',
    fontFamily: 'monospace',
  },
  turnText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  myPlayerCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  myPlayerCardActive: {
    borderColor: '#10B981',
  },
  myPlayerCardTurn: {
    borderColor: '#F59E0B',
  },
  myPlayerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  myPlayerTime: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#1F2937',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 24,
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    gap: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  playButton: {
    backgroundColor: '#10B981',
  },
  pauseButton: {
    backgroundColor: '#F59E0B',
  },
  mainButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  waitText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  otherPlayersSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  otherPlayerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  otherPlayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  otherPlayerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  otherPlayerTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    fontFamily: 'monospace',
  },
  // Styles du lobby
  lobbyContent: {
    padding: 24,
    alignItems: 'center',
  },
  lobbyHeader: {
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  lobbyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
  },
  lobbySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 16,
  },
  lobbyCode: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4F46E5',
    letterSpacing: 4,
    marginTop: 8,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  connectionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  playersStatusContainer: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  playersStatusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  lobbyPlayerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  lobbyPlayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lobbyPlayerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  lobbyPlayerStatus: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  lobbyPlayerStatusConnected: {
    color: '#10B981',
    fontWeight: '500',
  },
  readyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
  },
  readyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  startButton: {
    width: '100%',
    backgroundColor: '#10B981',
    padding: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  startButtonWarning: {
    backgroundColor: '#F59E0B',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  waitingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    width: '100%',
  },
  waitingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  lobbyBackButton: {
    marginTop: 20,
    padding: 12,
  },
  lobbyBackButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default GameDistributedScreen;