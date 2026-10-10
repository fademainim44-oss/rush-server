/*
 * Rush Client - Dedicated VDS Backend Server
 * Kozmetikler, Çevrimiçi Oyuncular, Emote, Sprey & Canlı Senkronizasyon
 */

const http = require('http');
const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');
const cors = require('cors');

const PORT = process.env.PORT || 25577;
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-Memory Data Store (VDS belleğinde tutulur)
const players = new Map(); // username -> { cosmetics, serverIp, lastSeen, isRush }
const emotes = new Map();  // username -> { emote, at }
const sprays = new Map();  // username -> { spray, at, x, y, z, face }
const connections = new Map(); // ws -> username

// HTTP Health Check & Info
app.get('/', (req, res) => {
  res.json({
    name: 'Rush Client Dedicated Server',
    version: '1.0.0',
    onlineRushUsers: players.size,
    uptime: Math.round(process.uptime()) + 's'
  });
});

// API: Bir oyuncunun kozmetiklerini getir
app.get('/api/cosmetics/:username', (req, res) => {
  const username = String(req.params.username || '').toLowerCase();
  const player = players.get(username);
  if (player && player.cosmetics) {
    return res.json({ ok: true, username, cosmetics: player.cosmetics });
  }
  return res.status(404).json({ ok: false, error: 'Kozmetik bulunamadı' });
});

// API: Toplu oyuncu kozmetiklerini getir
app.post('/api/cosmetics/batch', (req, res) => {
  const names = Array.isArray(req.body.names) ? req.body.names : [];
  const result = {};
  for (const n of names) {
    const k = String(n).toLowerCase();
    const p = players.get(k);
    if (p && p.cosmetics) result[n] = p.cosmetics;
  }
  res.json({ ok: true, data: result });
});

// API: Sunucudaki aktif Rush oyuncularını listele
app.get('/api/players', (req, res) => {
  const list = [];
  const now = Date.now();
  for (const [name, p] of players.entries()) {
    if (now - p.lastSeen < 60000) {
      list.push({ username: name, serverIp: p.serverIp, plus: !!(p.cosmetics && p.cosmetics.plus) });
    }
  }
  res.json({ ok: true, count: list.length, players: list });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket ile Canlı Senkronizasyon (Kozmetik, Emote, Sprey)
wss.on('connection', (ws, req) => {
  let currentUser = null;

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      const type = data.type;

      // 1. Oyuncu Girişi & Kozmetik Güncellemesi
      if (type === 'handshake' || type === 'cosmetics_update') {
        if (!data.username) return;
        currentUser = String(data.username).toLowerCase();
        connections.set(ws, currentUser);

        const currentData = players.get(currentUser) || {};
        const updated = {
          ...currentData,
          username: currentUser,
          cosmetics: data.cosmetics || currentData.cosmetics || {},
          serverIp: data.serverIp || currentData.serverIp || 'singleplayer',
          lastSeen: Date.now(),
          isRush: true
        };
        players.set(currentUser, updated);

        // Diğer oyunculara bu oyuncunun kozmetiklerini bildir
        broadcast({
          type: 'player_cosmetics',
          username: currentUser,
          cosmetics: updated.cosmetics
        }, ws);

        // Yeni bağlanan oyuncuya mevcut tüm oyuncuları gönder
        const allCosmetics = {};
        for (const [u, p] of players.entries()) {
          if (p.cosmetics) allCosmetics[u] = p.cosmetics;
        }
        ws.send(JSON.stringify({
          type: 'sync_all',
          players: allCosmetics
        }));
      }

      // 2. Canlı Emote Olayı
      if (type === 'emote') {
        if (!currentUser) return;
        emotes.set(currentUser, { emote: data.emote, at: Date.now() });
        broadcast({
          type: 'player_emote',
          username: currentUser,
          emote: data.emote
        });
      }

      // 3. Canlı Duvar Spreyi Olayı
      if (type === 'spray') {
        if (!currentUser) return;
        sprays.set(currentUser, { spray: data.spray, at: Date.now(), pos: data.pos });
        broadcast({
          type: 'player_spray',
          username: currentUser,
          spray: data.spray,
          pos: data.pos
        });
      }

      // 4. Ping / Heartbeat
      if (type === 'ping') {
        if (currentUser && players.has(currentUser)) {
          players.get(currentUser).lastSeen = Date.now();
        }
        ws.send(JSON.stringify({ type: 'pong', at: Date.now() }));
      }
    } catch (e) {
      // Geçersiz JSON
    }
  });

  ws.on('close', () => {
    if (currentUser) {
      connections.delete(ws);
      // Belirli bir süre sonra oyuncuyu pasif yap
      setTimeout(() => {
        const p = players.get(currentUser);
        if (p && Date.now() - p.lastSeen > 30000) {
          players.delete(currentUser);
          broadcast({ type: 'player_left', username: currentUser });
        }
      }, 5000);
    }
  });
});

function broadcast(data, excludeWs = null) {
  const json = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
      client.send(json);
    }
  }
}

// Eski verileri temizleme zamanlayıcısı (5 dakikada bir)
setInterval(() => {
  const now = Date.now();
  for (const [name, p] of players.entries()) {
    if (now - p.lastSeen > 5 * 60 * 1000) {
      players.delete(name);
    }
  }
  for (const [name, e] of emotes.entries()) {
    if (now - e.at > 30 * 1000) emotes.delete(name);
  }
  for (const [name, s] of sprays.entries()) {
    if (now - s.at > 60 * 1000) sprays.delete(name);
  }
}, 60 * 1000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🚀 Rush Client Dedicated Server Aktif!`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 HTTP API & WebSocket dinleniyor...`);
  console.log(`=========================================`);
});
