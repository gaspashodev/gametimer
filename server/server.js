const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Stockage des sessions de jeu en mémoire
const gameSessions = new Map();

// Créer une nouvelle session de jeu
app.post('/api/sessions', (req, res) => {
  const { mode, numPlayers, displayMode, playerNames } = req.body;
  
  const sessionId = uuidv4();
  const players = Array.from({ length: numPlayers }, (_, i) => ({
    id: i,
    name: playerNames?.[i] || `Joueur ${i + 1}`,
    time: 0,
    isRunning: false,
  }));

  const session = {
    id: sessionId,
    mode, // 'sequential' or 'independent'
    displayMode, // 'shared' or 'distributed'
    players,
    currentPlayerIndex: 0,
    globalTime: 0,
    createdAt: new Date(),
    lastUpdate: new Date(),
  };

  gameSessions.set(sessionId, session);

  res.json({
    sessionId,
    session,
    joinCode: sessionId.substring(0, 6).toUpperCase()
  });
});

// Rejoindre une session existante
app.get('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = gameSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session non trouvée' });
  }

  res.json(session);
});

// Rechercher une session par code court
app.get('/api/sessions/join/:joinCode', (req, res) => {
  const { joinCode } = req.params;
  
  for (const [sessionId, session] of gameSessions.entries()) {
    if (sessionId.substring(0, 6).toUpperCase() === joinCode.toUpperCase()) {
      return res.json({ sessionId, session });
    }
  }

  res.status(404).json({ error: 'Session non trouvée' });
});

// API pour streamers - Obtenir les données d'une session
app.get('/api/stream/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = gameSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session non trouvée' });
  }

  // Format optimisé pour l'affichage en streaming
  const streamData = {
    mode: session.mode,
    globalTime: session.globalTime,
    players: session.players.map(p => ({
      name: p.name,
      time: p.time,
      isActive: p.isRunning
    })),
    currentPlayer: session.mode === 'sequential' 
      ? session.players[session.currentPlayerIndex]?.name 
      : null
  };

  res.json(streamData);
});

// WebSocket pour synchronisation en temps réel
io.on('connection', (socket) => {
  console.log('Client connecté:', socket.id);

  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`Client ${socket.id} a rejoint la session ${sessionId}`);
    
    const session = gameSessions.get(sessionId);
    if (session) {
      socket.emit('session-state', session);
    }
  });

  socket.on('toggle-player', ({ sessionId, playerId }) => {
    const session = gameSessions.get(sessionId);
    if (!session) return;

    if (session.mode === 'sequential') {
      // Mode séquentiel : basculer au joueur suivant dans l'ordre
      const currentPlayer = session.players[session.currentPlayerIndex];
      
      if (currentPlayer.id === playerId && currentPlayer.isRunning) {
        // Mettre en pause le joueur actuel et passer au suivant
        currentPlayer.isRunning = false;
        session.currentPlayerIndex = (session.currentPlayerIndex + 1) % session.players.length;
        session.players[session.currentPlayerIndex].isRunning = true;
      } else if (currentPlayer.id === playerId && !currentPlayer.isRunning) {
        // Démarrer le joueur actuel
        currentPlayer.isRunning = true;
      }
    } else {
      // Mode indépendant : toggle le joueur
      const player = session.players.find(p => p.id === playerId);
      if (player) {
        player.isRunning = !player.isRunning;
      }
    }

    session.lastUpdate = new Date();
    
    // IMPORTANT : Attendre un peu avant d'émettre pour laisser le temps 
    // aux autres événements (update-time, update-global-time) d'arriver
    setTimeout(() => {
      io.to(sessionId).emit('session-state', session);
    }, 100);
  });

  socket.on('update-time', ({ sessionId, playerId, time }) => {
    const session = gameSessions.get(sessionId);
    if (!session) return;

    const player = session.players.find(p => p.id === playerId);
    if (player) {
      // AMÉLIORATION : Ne mettre à jour que si le nouveau temps est supérieur
      // (évite les problèmes de désynchronisation)
      if (time >= player.time) {
        player.time = time;
      }
      session.lastUpdate = new Date();
      
      // Ne pas émettre immédiatement pour éviter trop de trafic réseau
      // Les clients ont déjà la valeur locale, ils n'ont besoin que de confirmation
    }
  });

  socket.on('update-global-time', ({ sessionId, globalTime }) => {
    const session = gameSessions.get(sessionId);
    if (!session) return;

    // AMÉLIORATION : Ne mettre à jour que si le nouveau temps est supérieur
    if (globalTime >= session.globalTime) {
      session.globalTime = globalTime;
    }
    session.lastUpdate = new Date();
    
    // Ne pas émettre immédiatement pour éviter trop de trafic réseau
  });

  socket.on('reset-session', (sessionId) => {
    const session = gameSessions.get(sessionId);
    if (!session) return;

    session.players.forEach(p => {
      p.time = 0;
      p.isRunning = false;
    });
    session.globalTime = 0;
    session.currentPlayerIndex = 0;
    session.lastUpdate = new Date();

    io.to(sessionId).emit('session-state', session);
  });

  socket.on('update-player-name', ({ sessionId, playerId, name }) => {
    const session = gameSessions.get(sessionId);
    if (!session) return;

    const player = session.players.find(p => p.id === playerId);
    if (player) {
      player.name = name;
      session.lastUpdate = new Date();
      io.to(sessionId).emit('session-state', session);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client déconnecté:', socket.id);
  });
});

// Nettoyer les sessions inactives toutes les heures
setInterval(() => {
  const now = new Date();
  for (const [sessionId, session] of gameSessions.entries()) {
    const hoursSinceUpdate = (now - session.lastUpdate) / (1000 * 60 * 60);
    if (hoursSinceUpdate > 24) {
      gameSessions.delete(sessionId);
      console.log(`Session ${sessionId} supprimée (inactive depuis 24h)`);
    }
  }
}, 3600000);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`API REST disponible sur http://localhost:${PORT}/api`);
  console.log(`WebSocket disponible sur ws://localhost:${PORT}`);
});