// ============================================================
// AIm — Lobby Manager
// ============================================================
import { ELO } from "shared";

export class LobbyManager {
  constructor() {
    this.rooms = new Map(); // roomId -> Room
    this.players = new Map(); // socketId -> { name, roomId, rating, stats }
  }

  // --- Player Management ---
  registerPlayer(socketId, name) {
    this.players.set(socketId, {
      name,
      roomId: null,
      rating: ELO.START_RATING,
      stats: {
        wins: 0,
        losses: 0,
        draws: 0,
        streak: 0,
        bestStreak: 0,
        generation: 0,
      },
    });
    return this.players.get(socketId);
  }

  getPlayer(socketId) {
    return this.players.get(socketId);
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (player?.roomId) {
      this.leaveRoom(socketId);
    }
    this.players.delete(socketId);
  }

  // --- Room Management ---
  createRoom(socketId) {
    const player = this.players.get(socketId);
    if (!player) return null;
    if (player.roomId) return null;

    const roomId = this._generateRoomId();
    const room = {
      id: roomId,
      player1: socketId,
      player2: null,
      bots: {}, // socketId -> bot config
      state: "waiting", // waiting, building, battling, finished
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    player.roomId = roomId;
    return room;
  }

  joinRoom(socketId, roomId) {
    const player = this.players.get(socketId);
    if (!player) return { error: "Not registered" };
    if (player.roomId) return { error: "Already in a room" };

    const room = this.rooms.get(roomId);
    if (!room) return { error: "Room not found" };
    if (room.player2) return { error: "Room is full" };
    if (room.player1 === socketId) return { error: "Already in this room" };

    room.player2 = socketId;
    room.state = "building";
    player.roomId = roomId;
    return { room };
  }

  leaveRoom(socketId) {
    const player = this.players.get(socketId);
    if (!player?.roomId) return null;

    const room = this.rooms.get(player.roomId);
    if (!room) {
      player.roomId = null;
      return null;
    }

    const roomId = room.id;

    // Remove player from room
    if (room.player1 === socketId) {
      room.player1 = room.player2;
      room.player2 = null;
    } else {
      room.player2 = null;
    }

    delete room.bots[socketId];
    player.roomId = null;

    // If room empty, delete it
    if (!room.player1) {
      this.rooms.delete(roomId);
      return { roomId, deleted: true };
    }

    // Reset room state
    room.state = "waiting";
    room.bots = {};
    return { roomId, room };
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  getRoomForPlayer(socketId) {
    const player = this.players.get(socketId);
    if (!player?.roomId) return null;
    return this.rooms.get(player.roomId);
  }

  getRoomList() {
    const list = [];
    for (const room of this.rooms.values()) {
      if (room.state === "waiting") {
        const p1 = this.players.get(room.player1);
        list.push({
          id: room.id,
          host: p1?.name || "Unknown",
          hostRating: p1?.rating || ELO.START_RATING,
        });
      }
    }
    return list;
  }

  submitBot(socketId, botConfig) {
    const room = this.getRoomForPlayer(socketId);
    if (!room) return { error: "Not in a room" };
    if (room.state !== "building") return { error: "Not in building phase" };

    room.bots[socketId] = botConfig;

    const bothReady =
      room.player1 &&
      room.player2 &&
      room.bots[room.player1] &&
      room.bots[room.player2];

    return { submitted: true, bothReady };
  }

  _generateRoomId() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let id = "";
    for (let i = 0; i < 4; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    // Ensure unique
    if (this.rooms.has(id)) return this._generateRoomId();
    return id;
  }
}
