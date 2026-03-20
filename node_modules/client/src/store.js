import { create } from "zustand";
import { socket } from "./socket.js";
import { EVENTS, MODULES, TOTAL_TRAINING_POINTS, MODULE_NAMES } from "shared";

const useStore = create((set, get) => ({
  // --- Connection ---
  connected: false,
  playerName: "",
  player: null,

  // --- Navigation ---
  screen: "title", // title, lobby, build, battle, result

  // --- Lobby ---
  roomId: null,
  roomList: [],
  roomState: null,
  opponent: null,
  opponentReady: false,

  // --- Bot Building ---
  botName: "",
  modules: { ATTACK: 3, DEFENSE: 3, TACTICS: 3, OVERCLOCK: 3 },
  priorities: {
    ATTACK: [],
    DEFENSE: [],
    TACTICS: [],
    OVERCLOCK: [],
  },
  coreStats: null,

  // --- Training Sim ---
  simResult: null,
  simRunning: false,

  // --- Battle ---
  battleState: null,
  turnResults: [],
  battleEnd: null,

  // --- Audio ---
  muted: false,

  // ======== Actions ========

  setScreen: (screen) => set({ screen }),

  // --- Connection ---
  connect: (name) => {
    set({ playerName: name });
    socket.connect();

    socket.emit(EVENTS.PLAYER_INFO, { name }, (res) => {
      if (res.error) return console.error(res.error);
      set({ player: res.player, connected: true, screen: "lobby" });
    });
  },

  disconnect: () => {
    socket.disconnect();
    set({ connected: false, screen: "title", player: null, roomId: null });
  },

  // --- Lobby ---
  createRoom: () => {
    socket.emit(EVENTS.CREATE_ROOM, {}, (res) => {
      if (res.error) return console.error(res.error);
      set({
        roomId: res.roomId,
        screen: "build",
        roomState: "waiting",
        opponentReady: false,
      });
    });
  },

  joinRoom: (roomId) => {
    socket.emit(EVENTS.JOIN_ROOM, { roomId }, (res) => {
      if (res.error) return console.error(res.error);
      set({
        roomId,
        screen: "build",
        roomState: "building",
        opponentReady: false,
      });
    });
  },

  leaveRoom: () => {
    socket.emit(EVENTS.LEAVE_ROOM);
    set({
      roomId: null,
      screen: "lobby",
      roomState: null,
      opponent: null,
      opponentReady: false,
      battleState: null,
      turnResults: [],
      battleEnd: null,
      botName: "",
      modules: { ATTACK: 3, DEFENSE: 3, TACTICS: 3, OVERCLOCK: 3 },
      coreStats: null,
      simResult: null,
    });
  },

  // --- Bot Building ---
  setBotName: (name) => set({ botName: name }),

  setModuleLevel: (module, level) => {
    const { modules } = get();
    const current = modules[module];
    const diff = level - current;
    const totalUsed = Object.values(modules).reduce((a, b) => a + b, 0);

    if (totalUsed + diff > TOTAL_TRAINING_POINTS) return;
    if (level < 0 || level > 5) return;

    set({ modules: { ...modules, [module]: level } });
  },

  getRemainingPoints: () => {
    const { modules } = get();
    return (
      TOTAL_TRAINING_POINTS - Object.values(modules).reduce((a, b) => a + b, 0)
    );
  },

  setPriorities: (module, ordered) => {
    set({ priorities: { ...get().priorities, [module]: ordered } });
  },

  submitBot: () => {
    const { botName, modules, priorities, coreStats } = get();
    const config = {
      name: botName || "UNNAMED-BOT",
      modules,
      priorities,
      coreStats: coreStats || undefined,
    };

    socket.emit(EVENTS.SUBMIT_BOT, config, (res) => {
      if (res.error) return console.error(res.error);
      if (res.coreStats) set({ coreStats: res.coreStats });
    });
  },

  // --- Training Sim ---
  runSim: () => {
    const { botName, modules, priorities, coreStats } = get();
    set({ simRunning: true, simResult: null });

    const config = {
      name: botName || "UNNAMED-BOT",
      modules,
      priorities,
      coreStats: coreStats || undefined,
    };

    socket.emit(EVENTS.REQUEST_SIM, config, (res) => {
      if (res.error) {
        set({ simRunning: false });
        return console.error(res.error);
      }
      set({
        simResult: res.result,
        simRunning: false,
        coreStats: res.coreStats,
      });
    });
  },

  // --- Battle ---
  returnToLobby: () => {
    const { roomId } = get();
    set({
      screen: roomId ? "build" : "lobby",
      battleState: null,
      turnResults: [],
      battleEnd: null,
      opponentReady: false,
      simResult: null,
      botName: "",
      modules: { ATTACK: 3, DEFENSE: 3, TACTICS: 3, OVERCLOCK: 3 },
      coreStats: null,
    });
  },

  // --- Audio ---
  toggleMute: () => set({ muted: !get().muted }),
}));

// ======== Socket Listeners ========
socket.on("connect", () => useStore.setState({ connected: true }));
socket.on("disconnect", () => useStore.setState({ connected: false }));

socket.on(EVENTS.ROOM_LIST, (list) => {
  useStore.setState({ roomList: list });
});

socket.on(EVENTS.ROOM_UPDATE, (data) => {
  const state = useStore.getState();
  const update = { roomState: data.state };

  // Determine opponent
  const myName = state.playerName;
  if (data.player1 && data.player1.name !== myName) {
    update.opponent = data.player1;
  } else if (data.player2 && data.player2.name !== myName) {
    update.opponent = data.player2;
  }

  if (data.state === "building" && state.screen === "build") {
    // Stay on build screen
  } else if (data.state === "waiting") {
    update.opponent = null;
    update.opponentReady = false;
  }

  useStore.setState(update);
});

socket.on(EVENTS.BOT_SUBMITTED, ({ playerId, playerName }) => {
  const state = useStore.getState();
  if (playerName !== state.playerName) {
    useStore.setState({ opponentReady: true });
  }
});

socket.on(EVENTS.BOTH_READY, () => {
  // Battle starting soon
});

socket.on(EVENTS.ROOM_ERROR, ({ message }) => {
  console.error("Room error:", message);
});

socket.on("battle_start", (data) => {
  useStore.setState({
    screen: "battle",
    battleState: data,
    turnResults: [],
    battleEnd: null,
  });
});

socket.on("turn_result", (data) => {
  useStore.setState((state) => ({
    turnResults: [...state.turnResults, data],
    battleState: {
      ...state.battleState,
      bot1: {
        ...state.battleState.bot1,
        hp: data.bot1State.hp,
        energy: data.bot1State.energy,
      },
      bot2: {
        ...state.battleState.bot2,
        hp: data.bot2State.hp,
        energy: data.bot2State.energy,
      },
    },
  }));
});

socket.on("battle_end", (data) => {
  useStore.setState({ battleEnd: data, screen: "result" });
});

export default useStore;
