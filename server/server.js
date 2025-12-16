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

app.get('/', (req, res) => {
  res.json({ 
    message: 'Game Timer API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      sessions: '/api/sessions'
    }
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

// ==========================================
// 🧠 SYSTÈME DE KEEP-ALIVE INTELLIGENT
// ==========================================

// Configuration des horaires
const KEEP_ALIVE_CONFIG = {
  // Actif de 9h à minuit (15h/jour)
  // Plus besoin d'UptimeRobot !
  startHour: 9,    // 9h du matin
  endHour: 24,     // Minuit (0h)
  
  // Jours actifs (true = actif)
  activeDays: {
    0: true,   // Dimanche
    1: true,   // Lundi
    2: true,   // Mardi
    3: true,   // Mercredi
    4: true,   // Jeudi
    5: true,   // Vendredi
    6: true,   // Samedi
  },
  
  // Intervalle de ping
  pingInterval: 4 * 60 * 1000, // 4 minutes
};

// Fonction pour vérifier si on est dans les horaires actifs
function isInActiveHours() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  // Vérifier le jour
  if (!KEEP_ALIVE_CONFIG.activeDays[day]) {
    return false;
  }
  
  // Vérifier l'heure
  return hour >= KEEP_ALIVE_CONFIG.startHour && hour < KEEP_ALIVE_CONFIG.endHour;
}

// Fonction pour déterminer si on doit garder le serveur actif
function shouldKeepAlive() {
  // 1. Toujours actif si des sessions en cours
  if (gameSessions.size > 0) {
    return { active: true, reason: `${gameSessions.size} session(s) active(s)` };
  }
  
  // 2. Vérifier les horaires configurés
  if (!isInActiveHours()) {
    const now = new Date();
    return { 
      active: false, 
      reason: `Hors horaires actifs (${now.getHours()}h)` 
    };
  }
  
  // 3. Sinon, actif selon les horaires uniquement
  return { 
    active: true, 
    reason: 'Horaires actifs, maintien préventif' 
  };
}

// Système de keep-alive intelligent
let keepAliveCounter = 0;
const CLEANUP_EVERY_N_PINGS = 15; // 15 pings × 4min = 60min

setInterval(() => {
  const now = new Date();
  const status = shouldKeepAlive();
  
  if (status.active) {
    keepAliveCounter++;
    console.log(`🏓 [${now.toISOString().substring(11, 19)}] Ping #${keepAliveCounter} - ${status.reason}`);
    
    // Nettoyage des sessions toutes les heures
    if (keepAliveCounter >= CLEANUP_EVERY_N_PINGS) {
      keepAliveCounter = 0;
      
      console.log(`🧹 Nettoyage sessions (${gameSessions.size} actives)...`);
      for (const [sessionId, session] of gameSessions.entries()) {
        const hoursSinceUpdate = (now - session.lastUpdate) / (1000 * 60 * 60);
        if (hoursSinceUpdate > 24) {
          gameSessions.delete(sessionId);
          console.log(`   ├─ Session ${sessionId} supprimée (${hoursSinceUpdate.toFixed(1)}h)`);
        }
      }
      console.log(`   └─ ${gameSessions.size} session(s) restante(s)`);
    }
  } else {
    console.log(`😴 [${now.toISOString().substring(11, 19)}] Keep-alive désactivé - ${status.reason}`);
  }
}, KEEP_ALIVE_CONFIG.pingInterval);

const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📡 API REST: http://0.0.0.0:${PORT}/api`);
  console.log(`🔌 WebSocket: ws://0.0.0.0:${PORT}`);
  console.log(`📊 Health: http://0.0.0.0:${PORT}/health`);
  console.log('');
  console.log('⏰ Keep-alive intelligent activé :');
  console.log(`   • Auto-ping : ${KEEP_ALIVE_CONFIG.startHour}h-${KEEP_ALIVE_CONFIG.endHour}h (15h/jour)`);
  console.log(`   • Serveur éteint : 0h-9h (économie maximale)`);
  console.log(`   • Jours actifs : Lun-Dim (7j/7)`);
  console.log(`   • Intervalle : ${KEEP_ALIVE_CONFIG.pingInterval / 60000}min`);
  console.log(`   • Mode adaptatif : Actif si sessions ou activité récente`);
  
  // Calculer consommation estimée
  const activeHoursPerDay = KEEP_ALIVE_CONFIG.endHour - KEEP_ALIVE_CONFIG.startHour;
  const activeDaysPerWeek = Object.values(KEEP_ALIVE_CONFIG.activeDays).filter(d => d).length;
  const estimatedHoursPerMonth = (activeHoursPerDay * activeDaysPerWeek * 4.3);
  
  console.log('');
  console.log(`📈 Consommation estimée : ${Math.round(estimatedHoursPerMonth)}h/mois (limite: 500h)`);
  
  if (estimatedHoursPerMonth > 500) {
    console.log('⚠️  ATTENTION : Risque de dépassement de la limite gratuite');
  } else {
    console.log(`✅ Marge disponible : ${Math.round(500 - estimatedHoursPerMonth)}h/mois`);
  }
});