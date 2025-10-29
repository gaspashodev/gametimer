import axios from 'axios';
import io from 'socket.io-client';

// Remplacez par l'URL de votre serveur en production
export const API_URL = __DEV__ 
  ? 'http://192.168.1.32:3001'
  : 'https://votre-serveur-production.com';

class ApiService {
  constructor() {
    this.socket = null;
  }

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

  async joinSession(joinCode) {
    try {
      const response = await axios.get(`${API_URL}/api/sessions/join/${joinCode}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la connexion à la session:', error);
      throw error;
    }
  }

  async getSession(sessionId) {
    try {
      const response = await axios.get(`${API_URL}/api/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération de la session:', error);
      throw error;
    }
  }

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

  joinAsPlayer(sessionId, playerId) {
    if (this.socket) {
      this.socket.emit('join-as-player', { sessionId, playerId });
    }
  }

  startGame(sessionId) {
    if (this.socket) {
      this.socket.emit('start-game', sessionId);
    }
  }

  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  togglePlayer(sessionId, playerId) {
    if (this.socket) {
      this.socket.emit('toggle-player', { sessionId, playerId });
    }
  }

  updateTime(sessionId, playerId, time) {
    if (this.socket) {
      this.socket.emit('update-time', { sessionId, playerId, time });
    }
  }

  updateGlobalTime(sessionId, globalTime) {
    if (this.socket) {
      this.socket.emit('update-global-time', { sessionId, globalTime });
    }
  }

  resetSession(sessionId) {
    if (this.socket) {
      this.socket.emit('reset-session', sessionId);
    }
  }

  pauseAll(sessionId) {
    if (this.socket) {
      this.socket.emit('pause-all', sessionId);
    }
  }

  updatePlayerName(sessionId, playerId, name) {
    if (this.socket) {
      this.socket.emit('update-player-name', { sessionId, playerId, name });
    }
  }

  // ✅ NOUVEAU : Skip un joueur (créateur uniquement, mode séquentiel)
  skipPlayer(sessionId, requesterId) {
    if (this.socket) {
      this.socket.emit('skip-player', { sessionId, requesterId });
    }
  }
}

export default new ApiService();