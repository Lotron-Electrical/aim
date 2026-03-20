import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { LobbyManager } from './lobby/LobbyManager.js';
import { setupSocketHandlers } from './socket/SocketHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: isProduction ? {} : {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST'],
  },
});

const lobby = new LobbyManager();

setupSocketHandlers(io, lobby);

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', rooms: lobby.getRoomList().length });
});

// Serve built client in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.set('Cache-Control', 'no-cache, must-revalidate');
    }
  },
}));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  res.set('Cache-Control', 'no-cache, must-revalidate');
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`AIm server running on port ${PORT}`);
});
