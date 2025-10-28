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

  const myPlayer = players.find((p) => p.id === myPlayerId);
  
  // ✅ CORRECTION : Comparer l'ID du joueur à currentPlayerIndex, pas directement l'index
  const isMyTurn = mode === 'sequential' && 
                   players[currentPlayerIndex]?.id === myPlayerId;

  const playerIntervalRef = useRef(null);

  useEffect(() => {
    // Connexion au socket
    const callbacks = {
      onConnect: () => setIsConnected(true),
      onDisconnect: () => setIsConnected(false),
      onSessionUpdate: (session) => {
        setPlayers(session.players);
        setGlobalTime(session.globalTime);
        setCurrentPlayerIndex(session.currentPlayerIndex);
      },
    };

    ApiService.connectSocket(sessionId, callbacks);

    return () => {
      ApiService.disconnectSocket();
      if (playerIntervalRef.current) clearInterval(playerIntervalRef.current);
    };
  }, [sessionId]);

  // ✅ CORRECTION : Timer global - TOUJOURS la somme des temps de tous les joueurs
  useEffect(() => {
    const total = players.reduce((sum, player) => sum + player.time, 0);
    setGlobalTime(total);
  }, [players]);

  // Timer du joueur local uniquement
  useEffect(() => {
    if (myPlayer && myPlayer.isRunning && !playerIntervalRef.current) {
      playerIntervalRef.current = setInterval(() => {
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === myPlayerId ? { ...p, time: p.time + 1 } : p
          )
        );
        
        // Envoyer la mise à jour au serveur toutes les 3 secondes
        if (myPlayer.time % 3 === 0) {
          ApiService.updateTime(sessionId, myPlayerId, myPlayer.time + 1);
        }
      }, 1000);
    } else if (myPlayer && !myPlayer.isRunning && playerIntervalRef.current) {
      clearInterval(playerIntervalRef.current);
      playerIntervalRef.current = null;
    }

    return () => {
      if (playerIntervalRef.current) {
        clearInterval(playerIntervalRef.current);
      }
    };
  }, [myPlayer, myPlayerId, sessionId]);

  const toggleMyPlayer = () => {
    if (mode === 'sequential' && !isMyTurn) {
      Alert.alert('Attention', "Ce n'est pas votre tour !");
      return;
    }
    
    // Envoyer le temps exact avant le toggle
    if (myPlayer && myPlayer.isRunning) {
      ApiService.updateTime(sessionId, myPlayerId, myPlayer.time);
    }
    
    // Envoyer le temps global
    ApiService.updateGlobalTime(sessionId, globalTime);
    
    // Effectuer le toggle
    setTimeout(() => {
      ApiService.togglePlayer(sessionId, myPlayerId);
    }, 50);
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
            <TouchableOpacity style={styles.iconButton} onPress={handleQuit}>
              <Icon name="exit-to-app" size={24} color="#6B7280" />
            </TouchableOpacity>
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
  headerRow: {
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
  joinCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  iconButton: {
    padding: 8,
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
    backgroundColor: '#9CA3AF',
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
});

export default GameDistributedScreen;