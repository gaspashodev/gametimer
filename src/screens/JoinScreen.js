import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import ApiService from '../services/ApiService';

const JoinScreen = ({ navigation }) => {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const handleJoinSession = async () => {
    if (joinCode.length < 6) {
      Alert.alert('Erreur', 'Veuillez entrer un code valide');
      return;
    }

    setLoading(true);
    try {
      const data = await ApiService.joinSession(joinCode);
      setSessionData(data);
      setLoading(false);

      // Si mode partagé, aller directement au jeu
      if (data.session.displayMode === 'shared') {
        navigation.navigate('GameShared', {
          sessionId: data.sessionId,
          joinCode: joinCode,
          mode: data.session.mode,
        });
      }
      // Si mode distribué, afficher la sélection de joueur
    } catch (error) {
      setLoading(false);
      Alert.alert('Erreur', 'Partie non trouvée. Vérifiez le code.');
    }
  };

  const handleSelectPlayer = () => {
    if (selectedPlayer === null) {
      Alert.alert('Erreur', 'Veuillez sélectionner votre joueur');
      return;
    }

    // ✅ AMÉLIORATION : Vérifier une dernière fois avant de naviguer
    const isAlreadyConnected = sessionData.session.connectedPlayers?.includes(selectedPlayer);
    if (isAlreadyConnected) {
      Alert.alert('Erreur', 'Ce joueur est déjà connecté. Veuillez en choisir un autre.');
      return;
    }

    navigation.navigate('GameDistributed', {
      sessionId: sessionData.sessionId,
      joinCode: joinCode,
      mode: sessionData.session.mode,
      myPlayerId: selectedPlayer,
    });
  };

  if (sessionData && sessionData.session.displayMode === 'distributed') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Sélectionnez votre joueur</Text>
          <Text style={styles.subtitle}>
            Choisissez quel joueur vous êtes dans cette partie
          </Text>

          <View style={styles.playersContainer}>
            {sessionData.session.players.map((player) => {
              const isAlreadyConnected = sessionData.session.connectedPlayers?.includes(player.id);
              const isSelected = selectedPlayer === player.id;
              
              return (
                <TouchableOpacity
                  key={player.id}
                  style={[
                    styles.playerButton,
                    isSelected && styles.playerButtonActive,
                    isAlreadyConnected && styles.playerButtonDisabled,
                  ]}
                  onPress={() => !isAlreadyConnected && setSelectedPlayer(player.id)}
                  disabled={isAlreadyConnected}
                >
                  <Icon
                    name={isAlreadyConnected ? "account-check" : "account"}
                    size={32}
                    color={
                      isAlreadyConnected ? '#9CA3AF' : 
                      isSelected ? '#fff' : '#4F46E5'
                    }
                  />
                  <Text
                    style={[
                      styles.playerButtonText,
                      isSelected && styles.playerButtonTextActive,
                      isAlreadyConnected && styles.playerButtonTextDisabled,
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
            style={[
              styles.confirmButton,
              selectedPlayer === null && styles.confirmButtonDisabled,
            ]}
            onPress={handleSelectPlayer}
            disabled={selectedPlayer === null}
          >
            <Icon name="check-circle" size={24} color="#fff" />
            <Text style={styles.confirmButtonText}>Confirmer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setSessionData(null);
              setSelectedPlayer(null);
              setJoinCode('');
            }}
          >
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Icon name="account-group" size={80} color="#10B981" />
        <Text style={styles.title}>Rejoindre une Partie</Text>
        <Text style={styles.subtitle}>Entrez le code de la partie</Text>

        <TextInput
          style={styles.codeInput}
          placeholder="CODE"
          value={joinCode}
          onChangeText={(text) => setJoinCode(text.toUpperCase())}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.joinButton, loading && styles.joinButtonDisabled]}
          onPress={handleJoinSession}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="login" size={24} color="#fff" />
              <Text style={styles.joinButtonText}>Rejoindre</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 40,
    textAlign: 'center',
  },
  codeInput: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 20,
  },
  joinButton: {
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
  joinButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  playersContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 30,
  },
  playerButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  playerButtonActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  playerButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
    opacity: 0.6,
  },
  playerButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  playerButtonTextActive: {
    color: '#fff',
  },
  playerButtonTextDisabled: {
    color: '#9CA3AF',
  },
  confirmButton: {
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
  confirmButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
    padding: 12,
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default JoinScreen;