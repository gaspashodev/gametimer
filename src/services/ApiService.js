import axios from 'axios';
import io from 'socket.io-client';

// Remplacez par l'URL de votre serveur en production
// Pour le développement local sur Android, utilisez 10.0.2.2 au lieu de localhost
// Pour iOS, utilisez l'IP locale de votre machine
export const API_URL = __DEV__ 
  ? 'http://192.168.1.32:3001' // Votre IP locale pour dev
  : 'https://game-timer-backend-production.up.railway.app'; // ✅ URL Railway en production

class ApiService {
  constructor() {
    this.socket = null;
  }

  // ===== GESTION DES SESSIONS =====

  // Créer une nouvelle session
  async createSession(mode, numPlayers, displayMode, playerNames) {
    try {
      const response = await axios.post(`${API_URL}/api/sessions`, {
        mode,
        numPlayers,
        displayMode,
        playerNames
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création de la session:', error);
      throw error;
    }
  }

  // Rejoindre une session par code
  async joinSession(joinCode) {
    try {
      const response = await axios.get(`${API_URL}/api/sessions/join/${joinCode}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la connexion à la session:', error);
      throw error;
    }
  }

  // Obtenir les données d'une session
  async getSession(sessionId) {
    try {
      const response = await axios.get(`${API_URL}/api/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération de la session:', error);
      throw error;
    }
  }

  // ✅ NOUVEAU : Obtenir toutes les sessions actives
  async getAllSessions() {
    try {
      const response = await axios.get(`${API_URL}/api/sessions`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des sessions:', error);
      throw error;
    }
  }

  // ===== STATS & ANALYTICS =====

  // ✅ NOUVEAU : Récupérer les stats complètes d'une partie
  async getPartyStats(sessionId) {
    try {
      const response = await axios.get(`${API_URL}/api/party/${sessionId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des stats:', error);
      throw error;
    }
  }

  // ✅ NOUVEAU : Récupérer le temps d'un joueur spécifique
  async getPlayerTime(sessionId, playerId) {
    try {
      const response = await axios.get(`${API_URL}/api/party/${sessionId}/player/${playerId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du temps joueur:', error);
      throw error;
    }
  }

  // ✅ NOUVEAU : Récupérer les données stream (format simplifié pour OBS/overlay)
  async getStreamData(sessionId) {
    try {
      const response = await axios.get(`${API_URL}/api/stream/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des données stream:', error);
      throw error;
    }
  }

  // ===== WEBSOCKET =====

  // Connexion WebSocket
  connectSocket(sessionId, callbacks) {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(API_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10
    });

    this.socket.on('connect', () => {
      console.log('Socket connecté');
      this.socket.emit('join-session', sessionId);
      if (callbacks.onConnect) callbacks.onConnect();
    });

    this.socket.on('disconnect', () => {
      console.log('Socket déconnecté');
      if (callbacks.onDisconnect) callbacks.onDisconnect();
    });

    this.socket.on('session-state', (session) => {
      if (callbacks.onSessionUpdate) callbacks.onSessionUpdate(session);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Erreur de connexion socket:', error);
    });

    return this.socket;
  }

  // Se connecter en tant que joueur spécifique
  joinAsPlayer(sessionId, playerId) {
    if (this.socket) {
      this.socket.emit('join-as-player', { sessionId, playerId });
    }
  }

  // Démarrer la partie (pour le créateur en mode distribué)
  startGame(sessionId) {
    if (this.socket) {
      this.socket.emit('start-game', sessionId);
    }
  }

  // Déconnecter le socket
  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // ===== ACTIONS DE JEU =====

  // Basculer un joueur
  togglePlayer(sessionId, playerId) {
    if (this.socket) {
      this.socket.emit('toggle-player', { sessionId, playerId });
    }
  }

  // Mettre à jour le temps d'un joueur
  updateTime(sessionId, playerId, time) {
    if (this.socket) {
      this.socket.emit('update-time', { sessionId, playerId, time });
    }
  }

  // Mettre à jour le temps global
  updateGlobalTime(sessionId, globalTime) {
    if (this.socket) {
      this.socket.emit('update-global-time', { sessionId, globalTime });
    }
  }

  // Réinitialiser la session
  resetSession(sessionId) {
    if (this.socket) {
      this.socket.emit('reset-session', sessionId);
    }
  }

  // Mettre en pause tous les joueurs
  pauseAll(sessionId) {
    if (this.socket) {
      this.socket.emit('pause-all', sessionId);
    }
  }

  // Mettre à jour le nom d'un joueur
  updatePlayerName(sessionId, playerId, name) {
    if (this.socket) {
      this.socket.emit('update-player-name', { sessionId, playerId, name });
    }
  }

  // Skip un joueur (créateur uniquement, mode séquentiel)
  skipPlayer(sessionId, requesterId) {
    if (this.socket) {
      this.socket.emit('skip-player', { sessionId, requesterId });
    }
  }
}

export default new ApiService();