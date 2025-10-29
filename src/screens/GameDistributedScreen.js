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
  const [sessionStatus, setSessionStatus] = useState('lobby'); // 'lobby' ou 'started'
  const [connectedPlayers, setConnectedPlayers] = useState([]);

  const myPlayer = players.find((p) => p.id === myPlayerId);
  const isCreator = myPlayerId === 0; // Le créateur est le premier joueur
  
  // ✅ CORRECTION : Comparer l'ID du joueur à currentPlayerIndex, pas directement l'index
  const isMyTurn = mode === 'sequential' && 
                   players[currentPlayerIndex]?.id === myPlayerId;

  // ✅ NOUVEAU : Vérifier si le joueur actif est connecté
  const currentPlayer = players[currentPlayerIndex];
  const isCurrentPlayerConnected = currentPlayer && connectedPlayers.includes(currentPlayer.id);

  const playerIntervalRef = useRef(null);
  
  // Refs pour stocker les valeurs locales
  const playersRef = useRef([]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    // Connexion au socket
    const callbacks = {
      onConnect: () => {
        setIsConnected(true);
        // S'identifier en tant que joueur
        ApiService.joinAsPlayer(sessionId, myPlayerId);
      },
      onDisconnect: () => setIsConnected(false),
      onSessionUpdate: (session) => {
        // ✅ CORRECTION : Réconciliation pour éviter d'écraser le chrono local
        const updatedPlayers = session.players.map(serverPlayer => {
          // Si c'est MON joueur ET qu'il est en cours
          if (serverPlayer.id === myPlayerId) {
            const localPlayer = playersRef.current.find(p => p.id === myPlayerId);
            
            // Si je suis en train de jouer, garder le MAX entre local et serveur
            if (localPlayer && localPlayer.isRunning && serverPlayer.isRunning) {
              return {
                ...serverPlayer,
                time: Math.max(localPlayer.time, serverPlayer.time)
              };
            }
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
    };
  }, [sessionId, myPlayerId]);

  // ✅ CORRECTION : Timer global - TOUJOURS la somme des temps de tous les joueurs
  useEffect(() => {
    const total = players.reduce((sum, player) => sum + player.time, 0);
    setGlobalTime(total);
  }, [players]);

  // Timer du joueur local uniquement
  useEffect(() => {
    const isRunning = myPlayer?.isRunning || false;
    
    if (isRunning && !playerIntervalRef.current) {
      // Démarrer l'interval
      playerIntervalRef.current = setInterval(() => {
        setPlayers((prev) => {
          return prev.map((p) => {
            if (p.id === myPlayerId) {
              const newTime = p.time + 1;
              
              // Envoyer la mise à jour au serveur toutes les 3 secondes
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
      // Arrêter l'interval
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

  const toggleMyPlayer = () => {
    // Empêcher le toggle si la partie n'est pas démarrée
    if (sessionStatus !== 'started') {
      Alert.alert('Attention', 'La partie n\'a pas encore commencé !');
      return;
    }
    
    if (mode === 'sequential' && !isMyTurn) {
      Alert.alert('Attention', "Ce n'est pas votre tour !");
      return;
    }
    
    // Envoyer le temps exact avant le toggle (synchrone)
    if (myPlayer && myPlayer.isRunning) {
      ApiService.updateTime(sessionId, myPlayerId, myPlayer.time);
    }
    
    // Envoyer le temps global
    ApiService.updateGlobalTime(sessionId, globalTime);
    
    // Effectuer le toggle IMMÉDIATEMENT
    ApiService.togglePlayer(sessionId, myPlayerId);
  };

  // ✅ NOUVEAU : Fonction pour passer au joueur suivant (réservée au créateur)
  const handleSkipPlayer = () => {
    Alert.alert(
      'Passer au joueur suivant',
      `Voulez-vous passer le tour de ${currentPlayer?.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Passer',
          style: 'default',
          onPress: () => {
            console.log('🚀 Skip demandé par le créateur');
            ApiService.skipPlayer(sessionId, myPlayerId);
          },
        },
      ]
    );
  };

  // ✅ NOUVEAU : Fonction pour mettre en pause tous les joueurs (réservée au créateur)
  const handlePauseAll = () => {
    Alert.alert(
      'Pause globale',
      'Voulez-vous mettre en pause tous les joueurs ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Pause',
          style: 'default',
          onPress: () => {
            // Envoyer les temps exacts de tous les joueurs en cours
            players.forEach(player => {
              if (player.isRunning) {
                ApiService.updateTime(sessionId, player.id, player.time);
              }
            });
            
            ApiService.pauseAll(sessionId);
          },
        },
      ]
    );
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

  // Écran de lobby - en attente des joueurs
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

  // Écran de jeu normal
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.connectionStatus}>
              <Icon
                name={isConnected ? 'wifi' : 'wifi-off'}
                size={20}
                color={isConnected ? '#10B981' : '#EF4444'}
              />
              <Text style={styles.joinCodeText}>Code: {joinCode}</Text>
            </View>
            
            <View style={styles.headerButtons}>
              {/* ✅ NOUVEAU : Bouton Pause globale pour le créateur */}
              {isCreator && players.some(p => p.isRunning) && (
                <TouchableOpacity 
                  style={[styles.iconButton, styles.pauseAllButton]} 
                  onPress={handlePauseAll}
                >
                  <Icon name="pause-circle" size={24} color="#F59E0B" />
                </TouchableOpacity>
              )}
              
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
            <View style={styles.turnContainer}>
              <Text style={styles.turnText}>
                {isMyTurn
                  ? "C'est votre tour !"
                  : `Tour de ${players[currentPlayerIndex]?.name}`}
              </Text>
              
              {/* ✅ NOUVEAU : Indicateur de joueur absent + bouton Skip pour le créateur */}
              {!isCurrentPlayerConnected && !isMyTurn && (
                <View style={styles.warningContainer}>
                  <Icon name="alert-circle" size={20} color="#F59E0B" />
                  <Text style={styles.warningText}>
                    Joueur absent
                  </Text>
                </View>
              )}
              
              {/* ✅ NOUVEAU : Bouton Skip visible uniquement pour le créateur */}
              {isCreator && !isMyTurn && (
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleSkipPlayer}
                >
                  <Icon name="skip-next" size={20} color="#fff" />
                  <Text style={styles.skipButtonText}>Passer ce joueur</Text>
                </TouchableOpacity>
              )}
            </View>
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
            .map((player) => {
              const isPlayerConnected = connectedPlayers.includes(player.id);
              
              return (
                <View key={player.id} style={styles.otherPlayerCard}>
                  <View style={styles.otherPlayerInfo}>
                    <View style={styles.otherPlayerNameContainer}>
                      <Text style={styles.otherPlayerName}>{player.name}</Text>
                      {/* ✅ NOUVEAU : Badge de connexion */}
                      {!isPlayerConnected && (
                        <View style={styles.disconnectedBadge}>
                          <Icon name="wifi-off" size={12} color="#EF4444" />
                        </View>
                      )}
                    </View>
                    {player.isRunning && (
                      <Icon name="play-circle" size={20} color="#10B981" />
                    )}
                  </View>
                  <Text style={styles.otherPlayerTime}>
                    {formatTime(player.time)}
                  </Text>
                </View>
              );
            })}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  joinCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  iconButton: {
    padding: 8,
  },
  pauseAllButton: {
    backgroundColor: '#FEF3C7',
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
  // ✅ NOUVEAU : Styles pour le conteneur de tour
  turnContainer: {
    marginTop: 12,
    gap: 8,
  },
  turnText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  // ✅ NOUVEAU : Warning pour joueur absent
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
  },
  // ✅ NOUVEAU : Bouton Skip
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F59E0B',
    padding: 12,
    borderRadius: 8,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  // ✅ NOUVEAU : Conteneur pour nom + badge
  otherPlayerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  otherPlayerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  // ✅ NOUVEAU : Badge de déconnexion
  disconnectedBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 3,
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
