import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import ApiService from '../services/ApiService';

const ConfigScreen = ({ navigation }) => {
  const [mode, setMode] = useState('sequential');
  const [displayMode, setDisplayMode] = useState('shared');
  const [numPlayers, setNumPlayers] = useState(4);
  const [playerNames, setPlayerNames] = useState(Array(4).fill(''));
  const [loading, setLoading] = useState(false);

  const handleNumPlayersChange = (num) => {
    setNumPlayers(num);
    setPlayerNames(Array(num).fill(''));
  };

  const handlePlayerNameChange = (index, name) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const createSession = async () => {
    if (numPlayers < 2 || numPlayers > 10) {
      Alert.alert('Erreur', 'Veuillez choisir entre 2 et 10 joueurs');
      return;
    }

    setLoading(true);
    try {
      const data = await ApiService.createSession(
        mode,
        numPlayers,
        displayMode,
        playerNames.slice(0, numPlayers)
      );

      setLoading(false);

      if (displayMode === 'shared') {
        navigation.navigate('GameShared', {
          sessionId: data.sessionId,
          joinCode: data.joinCode,
          mode: mode,
        });
      } else {
        navigation.navigate('GameDistributed', {
          sessionId: data.sessionId,
          joinCode: data.joinCode,
          mode: mode,
          myPlayerId: 0, // Le créateur est le premier joueur
        });
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Erreur', 'Impossible de créer la partie. Vérifiez votre connexion.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Mode de jeu</Text>
        <View style={styles.optionContainer}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              mode === 'sequential' && styles.optionButtonActive,
            ]}
            onPress={() => setMode('sequential')}
          >
            <Icon
              name="play-circle"
              size={32}
              color={mode === 'sequential' ? '#4F46E5' : '#6B7280'}
            />
            <Text
              style={[
                styles.optionTitle,
                mode === 'sequential' && styles.optionTitleActive,
              ]}
            >
              Séquentiel
            </Text>
            <Text style={styles.optionDescription}>
              Un joueur à la fois, tour par tour
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              mode === 'independent' && styles.optionButtonActive,
            ]}
            onPress={() => setMode('independent')}
          >
            <Icon
              name="timer-multiple"
              size={32}
              color={mode === 'independent' ? '#4F46E5' : '#6B7280'}
            />
            <Text
              style={[
                styles.optionTitle,
                mode === 'independent' && styles.optionTitleActive,
              ]}
            >
              Indépendant
            </Text>
            <Text style={styles.optionDescription}>
              Plusieurs timers simultanés
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Mode d'affichage</Text>
        <View style={styles.optionContainer}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              displayMode === 'shared' && styles.optionButtonActive,
            ]}
            onPress={() => setDisplayMode('shared')}
          >
            <Icon
              name="tablet"
              size={32}
              color={displayMode === 'shared' ? '#10B981' : '#6B7280'}
            />
            <Text
              style={[
                styles.optionTitle,
                displayMode === 'shared' && styles.optionTitleActive,
              ]}
            >
              Partagé
            </Text>
            <Text style={styles.optionDescription}>
              Un seul appareil pour tous
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              displayMode === 'distributed' && styles.optionButtonActive,
            ]}
            onPress={() => setDisplayMode('distributed')}
          >
            <Icon
              name="cellphone-multiple"
              size={32}
              color={displayMode === 'distributed' ? '#10B981' : '#6B7280'}
            />
            <Text
              style={[
                styles.optionTitle,
                displayMode === 'distributed' && styles.optionTitleActive,
              ]}
            >
              Distribué
            </Text>
            <Text style={styles.optionDescription}>
              Chacun sur son appareil
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Nombre de joueurs: {numPlayers}</Text>
        <View style={styles.sliderContainer}>
          <View style={styles.numberButtons}>
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.numberButton,
                  numPlayers === num && styles.numberButtonActive,
                ]}
                onPress={() => handleNumPlayersChange(num)}
              >
                <Text
                  style={[
                    styles.numberButtonText,
                    numPlayers === num && styles.numberButtonTextActive,
                  ]}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Noms des joueurs (optionnel)</Text>
        <View style={styles.namesContainer}>
          {Array.from({ length: numPlayers }, (_, i) => (
            <TextInput
              key={i}
              style={styles.nameInput}
              placeholder={`Joueur ${i + 1}`}
              value={playerNames[i]}
              onChangeText={(text) => handlePlayerNameChange(i, text)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={createSession}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="play-circle" size={24} color="#fff" />
              <Text style={styles.createButtonText}>Créer la Partie</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 12,
  },
  optionContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  optionButtonActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
  optionTitleActive: {
    color: '#4F46E5',
  },
  optionDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  sliderContainer: {
    marginBottom: 10,
  },
  numberButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  numberButton: {
    width: 50,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberButtonActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  numberButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  numberButtonTextActive: {
    color: '#fff',
  },
  namesContainer: {
    gap: 10,
  },
  nameInput: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#4F46E5',
    padding: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  createButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ConfigScreen;
