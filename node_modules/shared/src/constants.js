// ============================================================
// AIm — Shared Constants
// ============================================================

// --- Socket Events ---
export const EVENTS = {
  // Connection
  CONNECT: "connect",
  DISCONNECT: "disconnect",

  // Lobby
  CREATE_ROOM: "create_room",
  CREATE_AI_ROOM: "create_ai_room",
  JOIN_ROOM: "join_room",
  LEAVE_ROOM: "leave_room",
  ROOM_UPDATE: "room_update",
  ROOM_LIST: "room_list",
  ROOM_ERROR: "room_error",

  // Bot Building
  SUBMIT_BOT: "submit_bot",
  BOT_SUBMITTED: "bot_submitted",
  BOTH_READY: "both_ready",

  // Training Sim
  REQUEST_SIM: "request_sim",
  SIM_RESULT: "sim_result",

  // Battle
  BATTLE_START: "battle_start",
  TURN_RESULT: "turn_result",
  BATTLE_END: "battle_end",

  // Chat / misc
  CHAT_MESSAGE: "chat_message",
  PLAYER_INFO: "player_info",
  ERROR: "error",
};

// --- Stat Ranges (randomized at bot creation) ---
export const STAT_RANGES = {
  hp: { min: 80, max: 120 },
  energy: { min: 50, max: 70 },
  clockSpeed: { min: 5, max: 15 },
};

export const ENERGY_REGEN = 10;
export const TOTAL_TRAINING_POINTS = 12;
export const MAX_MODULE_LEVEL = 5;

// --- Modules & Behaviors ---
export const MODULES = {
  ATTACK: {
    name: "ATTACK",
    description: "Damage dealing and accuracy",
    color: "#ff0040",
    behaviors: [
      {
        name: "Brute Force",
        level: 1,
        energyCost: 10,
        description: "Heavy hit, low accuracy",
        baseDamage: 22,
        accuracy: 0.65,
      },
      {
        name: "Precision Strike",
        level: 2,
        energyCost: 15,
        description: "Moderate hit, high accuracy",
        baseDamage: 16,
        accuracy: 0.9,
      },
      {
        name: "Multi-Target",
        level: 3,
        energyCost: 20,
        description: "Hits twice at reduced damage",
        baseDamage: 10,
        accuracy: 0.75,
        hits: 2,
      },
      {
        name: "Critical Hit",
        level: 4,
        energyCost: 25,
        description: "Chance for double damage",
        baseDamage: 18,
        accuracy: 0.7,
        critChance: 0.35,
      },
      {
        name: "Overload Strike",
        level: 5,
        energyCost: 35,
        description: "Massive damage, drains energy",
        baseDamage: 35,
        accuracy: 0.6,
      },
    ],
  },
  DEFENSE: {
    name: "DEFENSE",
    description: "Damage reduction and evasion",
    color: "#00d4ff",
    behaviors: [
      {
        name: "Shield Wall",
        level: 1,
        energyCost: 8,
        description: "Block incoming damage",
        damageReduction: 0.5,
        duration: 1,
      },
      {
        name: "Dodge Matrix",
        level: 2,
        energyCost: 12,
        description: "Chance to fully evade",
        dodgeChance: 0.4,
      },
      {
        name: "Counter-Attack",
        level: 3,
        energyCost: 18,
        description: "Block + strike back",
        damageReduction: 0.3,
        counterDamage: 12,
      },
      {
        name: "Regeneration",
        level: 4,
        energyCost: 20,
        description: "Heal over 2 turns",
        healPerTurn: 10,
        duration: 2,
      },
      {
        name: "Fortress Mode",
        level: 5,
        energyCost: 30,
        description: "Massive block, can't attack",
        damageReduction: 0.8,
        duration: 2,
      },
    ],
  },
  TACTICS: {
    name: "TACTICS",
    description: "Decision quality and intelligence",
    color: "#ffb000",
    behaviors: [
      {
        name: "Pattern Recognition",
        level: 1,
        energyCost: 0,
        description: "Read enemy tendencies",
        passive: true,
      },
      {
        name: "Feint",
        level: 2,
        energyCost: 10,
        description: "Fake attack, disrupts enemy",
        disruptChance: 0.5,
      },
      {
        name: "Energy Drain",
        level: 3,
        energyCost: 15,
        description: "Steal enemy energy",
        drainAmount: 15,
      },
      {
        name: "Priority Targeting",
        level: 4,
        energyCost: 0,
        description: "Target weakest module",
        passive: true,
      },
      {
        name: "Predict & Parry",
        level: 5,
        energyCost: 20,
        description: "If prediction correct, negate + counter",
        counterDamage: 20,
      },
    ],
  },
  OVERCLOCK: {
    name: "OVERCLOCK",
    description: "High-risk / high-reward specials",
    color: "#00ff41",
    behaviors: [
      {
        name: "Burst Mode",
        level: 1,
        energyCost: 20,
        description: "Double action next turn",
        duration: 1,
      },
      {
        name: "Self-Repair",
        level: 2,
        energyCost: 25,
        description: "Instant heal",
        healAmount: 30,
      },
      {
        name: "EMP",
        level: 3,
        energyCost: 30,
        description: "Disable enemy module for 1 turn",
        duration: 1,
      },
      {
        name: "Evolve",
        level: 4,
        energyCost: 35,
        description: "Permanently +1 to random module",
        permanent: true,
      },
      {
        name: "Singularity",
        level: 5,
        energyCost: 50,
        description: "All-in: massive damage or backfire",
        baseDamage: 50,
        accuracy: 0.45,
        selfDamage: 25,
      },
    ],
  },
};

export const MODULE_NAMES = Object.keys(MODULES);

// --- Battle Config ---
export const BATTLE = {
  TURN_INTERVAL_MS: 1500,
  MAX_TURNS: 30,
  DRAW_THRESHOLD: 0, // if both alive after MAX_TURNS, compare HP
};

// --- ELO Config ---
export const ELO = {
  START_RATING: 1000,
  K_FACTOR: 32,
};

// --- Elements ---
export const ELEMENTS = {
  VOLT: {
    name: "VOLT",
    color: "#ffe040",
    abbr: "V",
    beats: "CRYO",
    weakTo: "VOID",
  },
  THERMAL: {
    name: "THERMAL",
    color: "#ff4020",
    abbr: "T",
    beats: "VOID",
    weakTo: "CRYO",
  },
  CRYO: {
    name: "CRYO",
    color: "#40d0ff",
    abbr: "C",
    beats: "THERMAL",
    weakTo: "VOLT",
  },
  VOID: {
    name: "VOID",
    color: "#c040ff",
    abbr: "X",
    beats: "VOLT",
    weakTo: "THERMAL",
  },
};

export const ELEMENT_NAMES = Object.keys(ELEMENTS);

export const ELEMENT_MULTIPLIER = {
  strong: 1.5,
  weak: 0.5,
  neutral: 1.0,
};

// --- AI Bot Names (for VS AI mode) ---
export const AI_BOT_NAMES = [
  "NEURON-7", "AXIOM-X", "CIPHER-9", "FLUX-3",
  "PRISM-4", "VECTOR-1", "HELIX-6", "BINARY-8",
  "ROGUE-5", "NEXUS-2", "DAEMON-0", "SPARK-11",
];

// --- Dummy Bot for Training Sims ---
export const DUMMY_BOT = {
  name: "SPARRING-UNIT",
  modules: { ATTACK: 2, DEFENSE: 2, TACTICS: 1, OVERCLOCK: 1 },
  priorities: {
    ATTACK: ["Brute Force", "Precision Strike"],
    DEFENSE: ["Shield Wall", "Dodge Matrix"],
    TACTICS: ["Pattern Recognition"],
    OVERCLOCK: ["Burst Mode"],
  },
  coreStats: { hp: 100, energy: 60, clockSpeed: 10 },
  element: "VOLT",
};
