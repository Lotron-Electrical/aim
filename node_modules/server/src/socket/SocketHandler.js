// ============================================================
// AIm — Socket Handler
// ============================================================
import {
  EVENTS,
  validateBotConfig,
  generateCoreStats,
  runFullBattle,
  DUMMY_BOT,
  AI_BOT_NAMES,
  ELEMENT_NAMES,
  MODULE_NAMES,
  TOTAL_TRAINING_POINTS,
  MAX_MODULE_LEVEL,
} from "shared";
import { GameManager } from "../game/GameManager.js";

export function setupSocketHandlers(io, lobby) {
  const gameManager = new GameManager(io, lobby);

  io.on("connection", (socket) => {
    console.log(`[Connect] ${socket.id}`);

    // --- Player Registration ---
    socket.on(EVENTS.PLAYER_INFO, ({ name }, cb) => {
      if (
        !name ||
        typeof name !== "string" ||
        name.trim().length < 1 ||
        name.trim().length > 20
      ) {
        return cb?.({ error: "Name must be 1-20 characters" });
      }
      const player = lobby.registerPlayer(socket.id, name.trim());
      cb?.({
        success: true,
        player: {
          name: player.name,
          rating: player.rating,
          stats: player.stats,
        },
      });

      // Send room list
      socket.emit(EVENTS.ROOM_LIST, lobby.getRoomList());
    });

    // --- VS AI ---
    socket.on(EVENTS.CREATE_AI_ROOM, (_, cb) => {
      const room = lobby.createAIRoom(socket.id);
      if (!room) return cb?.({ error: "Could not create AI room" });

      socket.join(room.id);
      const p1 = lobby.getPlayer(socket.id);
      cb?.({ roomId: room.id });
      io.to(room.id).emit(EVENTS.ROOM_UPDATE, {
        roomId: room.id,
        state: room.state,
        player1: p1 ? { name: p1.name, rating: p1.rating } : null,
        player2: { name: "AI OPPONENT", rating: "---" },
        vsAI: true,
      });
    });

    // --- Room Management ---
    socket.on(EVENTS.CREATE_ROOM, (_, cb) => {
      const room = lobby.createRoom(socket.id);
      if (!room) return cb?.({ error: "Could not create room" });

      socket.join(room.id);
      cb?.({ roomId: room.id });
      io.emit(EVENTS.ROOM_LIST, lobby.getRoomList());
    });

    socket.on(EVENTS.JOIN_ROOM, ({ roomId }, cb) => {
      const result = lobby.joinRoom(socket.id, roomId);
      if (result.error) return cb?.({ error: result.error });

      socket.join(roomId);
      cb?.({ success: true });

      // Notify both players
      const room = result.room;
      const p1 = lobby.getPlayer(room.player1);
      const p2 = lobby.getPlayer(room.player2);
      io.to(roomId).emit(EVENTS.ROOM_UPDATE, {
        roomId,
        state: room.state,
        player1: p1 ? { name: p1.name, rating: p1.rating } : null,
        player2: p2 ? { name: p2.name, rating: p2.rating } : null,
      });

      io.emit(EVENTS.ROOM_LIST, lobby.getRoomList());
    });

    socket.on(EVENTS.LEAVE_ROOM, () => {
      handleLeaveRoom(socket);
    });

    // --- Bot Building ---
    socket.on(EVENTS.SUBMIT_BOT, (botConfig, cb) => {
      // Validate
      const validation = validateBotConfig(botConfig);
      if (!validation.valid) return cb?.({ error: validation.error });

      // Attach random core stats if not present
      if (!botConfig.coreStats) {
        botConfig.coreStats = generateCoreStats();
      }

      const result = lobby.submitBot(socket.id, botConfig);
      if (result.error) return cb?.({ error: result.error });

      const room = lobby.getRoomForPlayer(socket.id);
      if (!room) return;

      // Notify opponent
      io.to(room.id).emit(EVENTS.BOT_SUBMITTED, {
        playerId: socket.id,
        playerName: lobby.getPlayer(socket.id)?.name,
      });

      cb?.({ success: true, coreStats: botConfig.coreStats });

      if (result.bothReady) {
        // For AI rooms, generate random AI bot
        if (room.vsAI) {
          room.bots["AI"] = generateAIBot();
        }
        io.to(room.id).emit(EVENTS.BOTH_READY, {});
        // Short delay then start battle
        setTimeout(() => gameManager.startBattle(room.id), 1000);
      }
    });

    // --- Training Simulation ---
    socket.on(EVENTS.REQUEST_SIM, (botConfig, cb) => {
      const validation = validateBotConfig(botConfig);
      if (!validation.valid) return cb?.({ error: validation.error });

      if (!botConfig.coreStats) {
        botConfig.coreStats = generateCoreStats();
      }

      const result = runFullBattle(botConfig, DUMMY_BOT);
      cb?.({ result, coreStats: botConfig.coreStats });
    });

    // --- Chat ---
    socket.on(EVENTS.CHAT_MESSAGE, ({ message }) => {
      const player = lobby.getPlayer(socket.id);
      const room = lobby.getRoomForPlayer(socket.id);
      if (!player || !room) return;

      io.to(room.id).emit(EVENTS.CHAT_MESSAGE, {
        name: player.name,
        message: message?.slice(0, 200) || "",
        timestamp: Date.now(),
      });
    });

    // --- Disconnect ---
    socket.on("disconnect", () => {
      console.log(`[Disconnect] ${socket.id}`);
      handleLeaveRoom(socket);
      lobby.removePlayer(socket.id);
    });

    function generateAIBot() {
      const name =
        AI_BOT_NAMES[Math.floor(Math.random() * AI_BOT_NAMES.length)];
      const element =
        ELEMENT_NAMES[Math.floor(Math.random() * ELEMENT_NAMES.length)];

      // Random allocation of TOTAL_TRAINING_POINTS across modules (each 0-5)
      const modules = {};
      MODULE_NAMES.forEach((m) => (modules[m] = 0));
      let remaining = TOTAL_TRAINING_POINTS;
      while (remaining > 0) {
        const mod =
          MODULE_NAMES[Math.floor(Math.random() * MODULE_NAMES.length)];
        if (modules[mod] < MAX_MODULE_LEVEL) {
          modules[mod]++;
          remaining--;
        }
      }

      return {
        name,
        element,
        modules,
        priorities: {},
        coreStats: generateCoreStats(),
      };
    }

    function handleLeaveRoom(sock) {
      const room = lobby.getRoomForPlayer(sock.id);
      if (!room) return;

      const roomId = room.id;
      gameManager.cancelBattle(roomId);

      const result = lobby.leaveRoom(sock.id);
      sock.leave(roomId);

      if (result?.deleted) {
        io.emit(EVENTS.ROOM_LIST, lobby.getRoomList());
      } else if (result?.room) {
        io.to(roomId).emit(EVENTS.ROOM_UPDATE, {
          roomId,
          state: result.room.state,
          player1: lobby.getPlayer(result.room.player1)
            ? {
                name: lobby.getPlayer(result.room.player1).name,
                rating: lobby.getPlayer(result.room.player1).rating,
              }
            : null,
          player2: null,
        });
        io.emit(EVENTS.ROOM_LIST, lobby.getRoomList());
      }
    }
  });
}
