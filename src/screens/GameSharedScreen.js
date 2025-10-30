import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import ApiService from '../services/ApiService';
import { formatTime } from '../utils/helpers';

const GameSharedScreen = ({ route, navigation }) => {
  const { sessionId, joinCode, mode } = route.params;
  const [players, setPlayers] = useState([]);
  const [globalTime, setGlobalTime] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

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
        // ✅ CORRECTION : Réconciliation améliorée pour éviter le recul
        const updatedPlayers = session.players.map(serverPlayer => {
          const localPlayer = playersRef.current.find(p => p.id === serverPlayer.id);
          
          // Pour les joueurs en cours, privilégier le temps local s'il est supérieur
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
      },
    };

    ApiService.connectSocket(sessionId, callbacks);

    return () => {
      ApiService.disconnectSocket();
      Object.values(playerIntervalsRef.current).forEach(clearInterval);
    };
  }, [sessionId]);

  // Timer global = somme des temps de tous les joueurs
  useEffect(() => {
    const total = players.reduce((sum, player) => sum + player.time, 0);
    setGlobalTime(total);
    
    if (total % 3 === 0 && total > 0) {
      ApiService.updateGlobalTime(sessionId, total);
    }
  }, [players, sessionId]);

  // Timers individuels
  useEffect(() => {
    players.forEach((player) => {
      if (player.isRunning && !playerIntervalsRef.current[player.id]) {
        playerIntervalsRef.current[player.id] = setInterval(() => {
          setPlayers((prev) => {
            const newPlayers = prev.map((p) =>
              p.id === player.id ? { ...p, time: p.time + 1 } : p
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
      'Réinitialiser',
      'Êtes-vous sûr de vouloir réinitialiser tous les timers ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: () => ApiService.resetSession(sessionId),
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

  const renderPlayer = ({ item: player, index }) => {
    const isCurrentTurn = mode === 'sequential' && index === currentPlayerIndex;
    const canInteract = mode === 'independent' || isCurrentTurn;

    return (
      <View
        style={[
          styles.playerCard,
          player.isRunning && styles.playerCardActive,
          isCurrentTurn && !player.isRunning && styles.playerCardTurn,
        ]}
      >
        <Text style={styles.playerName}>{player.name}</Text>
        <Text style={styles.playerTime}>{formatTime(player.time)}</Text>
        <TouchableOpacity
          style={[
            styles.playerButton,
            player.isRunning ? styles.pauseButton : styles.playButton,
            !canInteract && styles.playerButtonDisabled,
          ]}
          onPress={() => togglePlayer(player.id)}
          disabled={!canInteract}
        >
          <Icon
            name={player.isRunning ? 'pause' : 'play'}
            size={24}
            color="#fff"
          />
          <Text style={styles.playerButtonText}>
            {player.isRunning
              ? mode === 'sequential'
                ? 'Suivant'
                : 'Pause'
              : 'Démarrer'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
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
            {players.some(p => p.isRunning) && (
              <TouchableOpacity 
                style={[styles.iconButton, styles.pauseAllButton]} 
                onPress={pauseAll}
              >
                <Icon name="pause-circle" size={24} color="#F59E0B" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.iconButton} onPress={handleReset}>
              <Icon name="refresh" size={24} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => navigation.navigate('PartyStats', { sessionId })}
            >
              <Icon name="chart-bar" size={24} color="#4F46E5" />
            </TouchableOpacity>
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
          <Text style={styles.currentPlayerText}>
            Tour de {players[currentPlayerIndex]?.name}
          </Text>
        )}
      </View>

      <FlatList
        data={players}
        renderItem={renderPlayer}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.playersGrid}
        columnWrapperStyle={styles.columnWrapper}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
  globalTimeContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
  },
  globalTimeLabel: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
  globalTime: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4F46E5',
    fontFamily: 'monospace',
  },
  currentPlayerText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  playersGrid: {
    padding: 12,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  playerCard: {
    width:'48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  playerCardActive: {
    borderColor: '#10B981',
    borderWidth: 3,
  },
  playerCardTurn: {
    borderColor: '#F59E0B',
    borderWidth: 3,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  playerTime: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    fontFamily: 'monospace',
    marginBottom: 12,
    textAlign: 'center',
  },
  playerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  playButton: {
    backgroundColor: '#10B981',
  },
  pauseButton: {
    backgroundColor: '#F59E0B',
  },
  playerButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
  },
  playerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GameSharedScreen;