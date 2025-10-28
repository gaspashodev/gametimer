import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  FlatList,
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

  const globalIntervalRef = useRef(null);
  const playerIntervalsRef = useRef({});
  
  // Refs pour stocker les valeurs en temps réel sans déclencher de re-render
  const globalTimeRef = useRef(0);
  const playersRef = useRef([]);

  // Mettre à jour les refs à chaque changement
  useEffect(() => {
    globalTimeRef.current = globalTime;
  }, [globalTime]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    // Connexion au socket
    const callbacks = {
      onConnect: () => setIsConnected(true),
      onDisconnect: () => setIsConnected(false),
      onSessionUpdate: (session) => {
        const localGlobalTime = globalTimeRef.current;
        const serverGlobalTime = session.globalTime;
        const anyRunning = session.players.some(p => p.isRunning);
        
        // Logique de réconciliation du temps global
        // Ne pas synchroniser le globalTime du serveur car il est calculé localement 
        // comme la somme des temps des joueurs (dans les deux modes)
        // On laisse le useEffect s'en charger
        
        // Pour les joueurs, prendre le MAX pour éviter de revenir en arrière
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
      },
    };

    ApiService.connectSocket(sessionId, callbacks);

    return () => {
      ApiService.disconnectSocket();
      if (globalIntervalRef.current) clearInterval(globalIntervalRef.current);
      Object.values(playerIntervalsRef.current).forEach(clearInterval);
    };
  }, [sessionId]);

  // ✅ CORRECTION : Timer global - TOUJOURS la somme des temps de tous les joueurs
  // (que ce soit en mode séquentiel ou indépendant)
  useEffect(() => {
    // Calculer le temps global comme la somme de tous les temps des joueurs
    const total = players.reduce((sum, player) => sum + player.time, 0);
    setGlobalTime(total);
    
    // Envoyer au serveur toutes les 3 secondes
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
            // Envoyer au serveur toutes les 3 secondes au lieu de 5
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
    // Envoyer les temps exacts AVANT le toggle
    const player = players.find(p => p.id === playerId);
    if (player && player.isRunning) {
      ApiService.updateTime(sessionId, playerId, player.time);
    }
    
    // Envoyer le temps global (somme de tous les joueurs)
    ApiService.updateGlobalTime(sessionId, globalTime);
    
    // Effectuer le toggle
    setTimeout(() => {
      ApiService.togglePlayer(sessionId, playerId);
    }, 50);
  };

  const pauseAll = () => {
    // Envoyer les temps exacts de tous les joueurs en cours
    players.forEach(player => {
      if (player.isRunning) {
        ApiService.updateTime(sessionId, player.id, player.time);
      }
    });

    // Demander au serveur de mettre tous les joueurs en pause
    setTimeout(() => {
      ApiService.pauseAll(sessionId);
    }, 50);
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
    
    // Logique d'interaction selon le mode
    let canInteract;
    if (mode === 'independent') {
      // Mode indépendant : tous les joueurs sont toujours cliquables
      canInteract = true;
    } else {
      // Mode séquentiel : seul le joueur actif est cliquable
      canInteract = isCurrentTurn;
    }

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
            !canInteract && styles.playerButtonDisabled,
            player.isRunning ? styles.pauseButton : styles.playButton,
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
            <Text style={styles.joinCodeText}>Code: {joinCode}</Text>
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
  joinCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
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
    flex: 1,
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
    backgroundColor: '#9CA3AF',
  },
  playerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GameSharedScreen;