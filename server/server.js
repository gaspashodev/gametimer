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

// ===== HELPER FUNCTIONS =====

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ===== API ROUTES =====

// Health check (pour UptimeRobot ou monitoring)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    activeSessions: gameSessions.size
  });
});

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
    status: displayMode === 'distributed' ? 'lobby' : 'started', // 'lobby' ou 'started'
    connectedPlayers: [], // Liste des IDs de joueurs connectés
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

// ✅ NOUVEAU : API pour streamers - Format simplifié
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
    globalTimeFormatted: formatTime(session.globalTime),
    players: session.players.map(p => ({
      name: p.name,
      time: p.time,
      timeFormatted: formatTime(p.time),
      isActive: p.isRunning,
      percentageOfTotal: session.globalTime > 0 
        ? Math.round((p.time / session.globalTime) * 100) 
        : 0
    })),
    currentPlayer: session.mode === 'sequential' 
      ? session.players[session.currentPlayerIndex]?.name 
      : null
  };

  res.json(streamData);
});

// ✅ NOUVEAU : Stats complètes d'une partie
app.get('/api/party/:sessionId/stats', (req, res) => {
  const { sessionId } = req.params;
  const session = gameSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session non trouvée' });
  }

  // Calcul des stats avancées
  const totalTime = session.globalTime;
  const activePlayers = session.players.filter(p => p.time > 0);
  const averageTime = activePlayers.length > 0 
    ? Math.round(totalTime / activePlayers.length) 
    : 0;
  
  // Tri des joueurs par temps décroissant
  const sortedPlayers = [...session.players].sort((a, b) => b.time - a.time);

  const stats = {
    sessionId: session.id,
    joinCode: session.id.substring(0, 6).toUpperCase(),
    mode: session.mode,
    displayMode: session.displayMode,
    status: session.status,
    
    // Temps
    globalTime: session.globalTime,
    globalTimeFormatted: formatTime(session.globalTime),
    averageTime: averageTime,
    averageTimeFormatted: formatTime(averageTime),
    
    // Dates
    createdAt: session.createdAt,
    lastUpdate: session.lastUpdate,
    duration: Math.floor((new Date() - session.createdAt) / 1000), // Durée totale de la session en secondes
    
    // Joueurs
    totalPlayers: session.players.length,
    connectedPlayers: session.connectedPlayers.length,
    activePlayers: session.players.filter(p => p.isRunning).length,
    
    players: session.players.map(p => ({
      id: p.id,
      name: p.name,
      time: p.time,
      timeFormatted: formatTime(p.time),
      isRunning: p.isRunning,
      isConnected: session.connectedPlayers.includes(p.id),
      percentageOfTotal: totalTime > 0 
        ? Math.round((p.time / totalTime) * 100) 
        : 0,
      rank: sortedPlayers.findIndex(sp => sp.id === p.id) + 1
    })),
    
    // Classement
    ranking: sortedPlayers.map((p, index) => ({
      rank: index + 1,
      name: p.name,
      time: p.time,
      timeFormatted: formatTime(p.time),
      percentageOfTotal: totalTime > 0 
        ? Math.round((p.time / totalTime) * 100) 
        : 0
    })),
    
    currentPlayerIndex: session.currentPlayerIndex,
    currentPlayerName: session.players[session.currentPlayerIndex]?.name
  };

  res.json(stats);
});

// ✅ NOUVEAU : Temps d'un joueur spécifique
app.get('/api/party/:sessionId/player/:playerId', (req, res) => {
  const { sessionId, playerId } = req.params;
  const session = gameSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session non trouvée' });
  }

  const player = session.players.find(p => p.id === parseInt(playerId));
  
  if (!player) {
    return res.status(404).json({ error: 'Joueur non trouvé' });
  }

  // Calcul du rang
  const sortedPlayers = [...session.players].sort((a, b) => b.time - a.time);
  const rank = sortedPlayers.findIndex(p => p.id === player.id) + 1;

  res.json({
    playerId: player.id,
    name: player.name,
    time: player.time,
    timeFormatted: formatTime(player.time),
    isRunning: player.isRunning,
    isConnected: session.connectedPlayers.includes(player.id),
    percentageOfTotal: session.globalTime > 0 
      ? Math.round((player.time / session.globalTime) * 100) 
      : 0,
    rank: rank,
    totalPlayers: session.players.length,
    isCurrent: session.mode === 'sequential' && 
               session.currentPlayerIndex === player.id
  });
});

// ✅ NOUVEAU : Liste de toutes les sessions actives (utile pour admin)
app.get('/api/sessions', (req, res) => {
  const sessions = Array.from(gameSessions.values()).map(session => ({
    sessionId: session.id,
    joinCode: session.id.substring(0, 6).toUpperCase(),
    mode: session.mode,
    displayMode: session.displayMode,
    status: session.status,
    playerCount: session.players.length,
    connectedPlayers: session.connectedPlayers.length,
    globalTime: session.globalTime,
    createdAt: session.createdAt,
    lastUpdate: session.lastUpdate
  }));

  res.json({
    totalSessions: sessions.length,
    sessions: sessions
  });
});

// ===== WEBSOCKET EVENTS =====

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

  // Un joueur rejoint avec son ID
  socket.on('join-as-player', ({ sessionId, playerId }) => {
    const session = gameSessions.get(sessionId);
    if (!session) return;

    // Stocker l'association socket <-> joueur
    socket.data = { sessionId, playerId };

    // Ajouter à la liste des joueurs connectés s'il n'y est pas déjà
    if (!session.connectedPlayers.includes(playerId)) {
      session.connectedPlayers.push(playerId);
      console.log(`Joueur ${playerId} connecté à la session ${sessionId}`);
      
      // Notifier tous les clients
      io.to(sessionId).emit('session-state', session);
    }
  });

  // Démarrer la partie (seulement en mode distribué)
  socket.on('start-game', (sessionId) => {
    const session = gameSessions.get(sessionId);
    if (!session) return;

    if (session.displayMode === 'distributed' && session.status === 'lobby') {
      session.status = 'started';
      console.log(`Partie ${sessionId} démarrée`);
      io.to(sessionId).emit('session-state', session);
    }
  });

  socket.on('toggle-player', ({ sessionId, playerId }) => {
    const session = gameSessions.get(sessionId);
    if (!session) return;

    // En mode distribué, ne pas permettre de toggle si la partie n'est pas démarrée
    if (session.displayMode === 'distributed' && session.status !== 'started') {
      console.log(`Toggle refusé : partie ${sessionId} pas encore démarrée`);
      return;
    }

    if (session.mode === 'sequential') {
      // Mode séquentiel : seul le joueur actif peut être togglé
      const currentPlayer = session.players[session.currentPlayerIndex];
      
      if (!currentPlayer || currentPlayer.id !== playerId) {
        // Joueur non actif essaie de cliquer → ignorer
        return;
      }

      if (currentPlayer.isRunning) {
        // Le joueur actif clique sur "Suivant" → passer au suivant
        currentPlayer.isRunning = false;
        session.currentPlayerIndex = (session.currentPlayerIndex + 1) % session.players.length;
        
        // ✅ Lancer automatiquement le chrono du joueur suivant
        const nextPlayer = session.players[session.currentPlayerIndex];
        if (nextPlayer) {
          nextPlayer.isRunning = true;
          console.log(`Passage automatique au joueur ${nextPlayer.name} (ID: ${nextPlayer.id})`);
        }
      } else {
        // Le joueur actif (en pause) clique sur "Démarrer"
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
    
    // Émettre immédiatement la mise à jour
    io.to(sessionId).emit('session-state', session);
  });

  // ✅ Skip un joueur avec lancement automatique du chrono suivant
  socket.on('skip-player', ({ sessionId, requesterId }) => {
    const session = gameSessions.get(sessionId);
    if (!session) return;

    // Vérification : seul le créateur (joueur 0) peut skip
    if (requesterId !== 0) {
      console.log(`Skip refusé : seul le créateur (0) peut skip, pas ${requesterId}`);
      return;
    }

    // Vérification : mode séquentiel uniquement
    if (session.mode !== 'sequential') {
      console.log('Skip refusé : mode non séquentiel');
      return;
    }

    // Mettre le joueur actuel en pause
    const currentPlayer = session.players[session.currentPlayerIndex];
    if (currentPlayer) {
      currentPlayer.isRunning = false;
    }

    // Passer au joueur suivant
    session.currentPlayerIndex = (session.currentPlayerIndex + 1) % session.players.length;
    
    // ✅ Démarrer automatiquement le chrono du suivant MÊME s'il est déconnecté
    const nextPlayer = session.players[session.currentPlayerIndex];
    if (nextPlayer) {
      nextPlayer.isRunning = true;
      const isConnected = session.connectedPlayers?.includes(nextPlayer.id);
      console.log(`Skip effectué : chrono lancé automatiquement pour ${nextPlayer.name} (ID: ${nextPlayer.id}, connecté: ${isConnected ? 'oui' : 'non'})`);
    }

    session.lastUpdate = new Date();
    io.to(sessionId).emit('session-state', session);
  });

  socket.on('update-time', ({ sessionId, playerId, time }) => {
    const session = gameSessions.get(sessionId);
    if (!session) return;

    const player = session.players.find(p => p.id === playerId);
    if (player) {
      // Ne mettre à jour que si le nouveau temps est supérieur
      if (time >= player.time) {
        player.time = time;
      }
      session.lastUpdate = new Date();
    }
  });

  socket.on('update-global-time', ({ sessionId, globalTime }) => {
    const session = gameSessions.get(sessionId);
    if (!session) return;

    // Ne mettre à jour que si le nouveau temps est supérieur
    if (globalTime >= session.globalTime) {
      session.globalTime = globalTime;
    }
    session.lastUpdate = new Date();
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

  socket.on('pause-all', (sessionId) => {
    const session = gameSessions.get(sessionId);
    if (!session) return;

    // Mettre tous les joueurs en pause
    session.players.forEach(p => {
      p.isRunning = false;
    });
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
    
    // Si le socket avait un joueur associé, le retirer de la liste
    if (socket.data?.sessionId && socket.data?.playerId !== undefined) {
      const session = gameSessions.get(socket.data.sessionId);
      if (session) {
        const index = session.connectedPlayers.indexOf(socket.data.playerId);
        if (index > -1) {
          session.connectedPlayers.splice(index, 1);
          console.log(`Joueur ${socket.data.playerId} déconnecté de la session ${socket.data.sessionId}`);
          
          // Notifier les autres clients
          io.to(socket.data.sessionId).emit('session-state', session);
        }
      }
    }
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
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📡 API REST disponible sur http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket disponible sur ws://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});