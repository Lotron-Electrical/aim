// ============================================================
// AIm — Bot Engine (shared: runs on server + client prediction)
// ============================================================
import {
  MODULES,
  ENERGY_REGEN,
  BATTLE,
  STAT_RANGES,
  TOTAL_TRAINING_POINTS,
  MAX_MODULE_LEVEL,
  ELEMENTS,
  ELEMENT_NAMES,
  ELEMENT_MULTIPLIER,
} from "./constants.js";

// --- Helpers ---
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// --- Element multiplier ---
export function getElementMultiplier(attackerElement, defenderElement) {
  if (!attackerElement || !defenderElement) return ELEMENT_MULTIPLIER.neutral;
  if (attackerElement === defenderElement) return ELEMENT_MULTIPLIER.neutral;
  const attEl = ELEMENTS[attackerElement];
  if (!attEl) return ELEMENT_MULTIPLIER.neutral;
  if (attEl.beats === defenderElement) return ELEMENT_MULTIPLIER.strong;
  if (attEl.weakTo === defenderElement) return ELEMENT_MULTIPLIER.weak;
  return ELEMENT_MULTIPLIER.neutral;
}

// --- Generate random core stats ---
export function generateCoreStats() {
  return {
    hp: rand(STAT_RANGES.hp.min, STAT_RANGES.hp.max),
    energy: rand(STAT_RANGES.energy.min, STAT_RANGES.energy.max),
    clockSpeed: rand(STAT_RANGES.clockSpeed.min, STAT_RANGES.clockSpeed.max),
  };
}

// --- Validate a bot config ---
export function validateBotConfig(config) {
  if (
    !config.name ||
    typeof config.name !== "string" ||
    config.name.length < 1 ||
    config.name.length > 20
  ) {
    return { valid: false, error: "Bot name must be 1-20 characters" };
  }

  const { modules } = config;
  if (!modules) return { valid: false, error: "Missing modules" };

  let total = 0;
  for (const mod of Object.keys(MODULES)) {
    const level = modules[mod];
    if (
      typeof level !== "number" ||
      level < 0 ||
      level > MAX_MODULE_LEVEL ||
      !Number.isInteger(level)
    ) {
      return { valid: false, error: `Invalid level for ${mod}: ${level}` };
    }
    total += level;
  }

  if (total !== TOTAL_TRAINING_POINTS) {
    return {
      valid: false,
      error: `Must allocate exactly ${TOTAL_TRAINING_POINTS} points (got ${total})`,
    };
  }

  if (config.element && !ELEMENT_NAMES.includes(config.element)) {
    return { valid: false, error: `Invalid element: ${config.element}` };
  }

  return { valid: true };
}

// --- Get available behaviors for a bot based on module levels ---
export function getAvailableBehaviors(modules) {
  const available = {};
  for (const [modName, modDef] of Object.entries(MODULES)) {
    const level = modules[modName] || 0;
    available[modName] = modDef.behaviors.filter((b) => b.level <= level);
  }
  return available;
}

// --- Create a battle-ready bot state ---
export function createBattleBot(config) {
  const available = getAvailableBehaviors(config.modules);
  return {
    name: config.name,
    element: config.element || "VOLT",
    modules: { ...config.modules },
    priorities: config.priorities || {},
    coreStats: { ...config.coreStats },
    // Runtime state
    hp: config.coreStats.hp,
    maxHp: config.coreStats.hp,
    energy: config.coreStats.energy,
    maxEnergy: config.coreStats.energy,
    clockSpeed: config.coreStats.clockSpeed,
    availableBehaviors: available,
    // Buffs / debuffs
    shieldActive: false,
    shieldReduction: 0,
    dodgeActive: false,
    dodgeChance: 0,
    regenRemaining: 0,
    regenPerTurn: 0,
    burstMode: false,
    fortressMode: false,
    fortressRemaining: 0,
    disabledModule: null,
    counterAttack: null,
    // History for pattern recognition
    actionHistory: [],
  };
}

// --- Select action for a bot (TACTICS-weighted decision making) ---
export function selectAction(bot, enemy, turnNumber) {
  const tacticsLevel = bot.modules.TACTICS || 0;
  const available = bot.availableBehaviors;
  const log = [];

  // Pattern recognition: analyze enemy history
  let enemyPattern = null;
  if (tacticsLevel >= 1 && enemy.actionHistory.length >= 2) {
    const last3 = enemy.actionHistory.slice(-3);
    const counts = {};
    for (const a of last3) {
      counts[a.module] = (counts[a.module] || 0) + 1;
    }
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (dominant[1] >= 2) {
      enemyPattern = dominant[0];
      log.push(
        `TACTICS.PatternRecognition detected: enemy favors ${enemyPattern} (${dominant[1]}/${last3.length} turns)`,
      );
    }
  }

  // Priority targeting: identify enemy weakness
  let targetWeakness = null;
  if (tacticsLevel >= 4) {
    const weakest = Object.entries(enemy.modules).sort(
      (a, b) => a[1] - b[1],
    )[0];
    if (weakest[1] <= 1) {
      targetWeakness = weakest[0];
      log.push(
        `TACTICS.PriorityTargeting: enemy weak in ${targetWeakness} (level ${weakest[1]})`,
      );
    }
  }

  // Build candidate actions from all modules
  const candidates = [];
  for (const [modName, behaviors] of Object.entries(available)) {
    if (bot.disabledModule === modName) {
      log.push(`${modName} DISABLED by EMP`);
      continue;
    }
    if (bot.fortressMode && modName === "ATTACK") continue;

    for (const behavior of behaviors) {
      if (behavior.passive) continue;
      if (behavior.energyCost > bot.energy) continue;

      let score = 50; // base score

      // Priority ordering: user-defined priorities boost score
      const priorities = bot.priorities[modName] || [];
      const prioIdx = priorities.indexOf(behavior.name);
      if (prioIdx !== -1) {
        score += (priorities.length - prioIdx) * 10;
      }

      // Tactical adjustments based on pattern recognition
      if (enemyPattern === "ATTACK" && modName === "DEFENSE") score += 20;
      if (enemyPattern === "DEFENSE" && behavior.name === "Precision Strike")
        score += 25;
      if (enemyPattern === "DEFENSE" && behavior.name === "Energy Drain")
        score += 20;

      // Low HP? Favor defense/healing
      const hpRatio = bot.hp / bot.maxHp;
      if (hpRatio < 0.3) {
        if (modName === "DEFENSE") score += 15;
        if (behavior.name === "Self-Repair") score += 25;
      }

      // High energy? Consider big moves
      if (bot.energy > bot.maxEnergy * 0.7 && behavior.energyCost >= 25)
        score += 10;

      // Low energy? Favor cheap moves
      if (bot.energy < 20 && behavior.energyCost <= 10) score += 15;

      // TACTICS level adds intelligence: higher = less random
      const randomFactor = Math.max(0, 30 - tacticsLevel * 5);
      score += rand(-randomFactor, randomFactor);

      candidates.push({ module: modName, behavior, score });
    }
  }

  // If no candidates (no energy), rest
  if (candidates.length === 0) {
    log.push("Decision: REST (insufficient energy for any action)");
    return { action: { type: "rest", module: "NONE", behavior: null }, log };
  }

  // Sort by score, pick best
  candidates.sort((a, b) => b.score - a.score);
  const chosen = candidates[0];
  const confidence = clamp(
    Math.round((chosen.score / (candidates[0].score + 20)) * 100),
    30,
    99,
  );

  log.push(
    `Decision: ${chosen.module}.${chosen.behavior.name} -- confidence: ${confidence}%`,
  );

  return {
    action: {
      type: "behavior",
      module: chosen.module,
      behavior: chosen.behavior,
    },
    log,
  };
}

// --- Resolve a turn (both actions decided, now execute simultaneously) ---
export function resolveTurn(bot1, bot2, action1, action2, turnNumber) {
  const results = {
    turn: turnNumber,
    bot1: { log: [], damage: 0 },
    bot2: { log: [], damage: 0 },
  };

  // Apply buffs at start of turn
  applyStartOfTurn(bot1, results.bot1);
  applyStartOfTurn(bot2, results.bot2);

  // Resolve actions
  executeAction(bot1, bot2, action1, results.bot1, results.bot2, turnNumber);
  executeAction(bot2, bot1, action2, results.bot2, results.bot1, turnNumber);

  // Energy regen
  bot1.energy = clamp(bot1.energy + ENERGY_REGEN, 0, bot1.maxEnergy);
  bot2.energy = clamp(bot2.energy + ENERGY_REGEN, 0, bot2.maxEnergy);

  // Record action history
  if (action1.behavior)
    bot1.actionHistory.push({
      module: action1.module,
      name: action1.behavior.name,
    });
  if (action2.behavior)
    bot2.actionHistory.push({
      module: action2.module,
      name: action2.behavior.name,
    });

  // Clear single-turn buffs
  clearEndOfTurn(bot1);
  clearEndOfTurn(bot2);

  // Check battle end
  const bot1Dead = bot1.hp <= 0;
  const bot2Dead = bot2.hp <= 0;

  results.bot1State = {
    hp: bot1.hp,
    maxHp: bot1.maxHp,
    energy: bot1.energy,
    maxEnergy: bot1.maxEnergy,
  };
  results.bot2State = {
    hp: bot2.hp,
    maxHp: bot2.maxHp,
    energy: bot2.energy,
    maxEnergy: bot2.maxEnergy,
  };

  if (bot1Dead && bot2Dead) {
    results.winner = bot1.clockSpeed >= bot2.clockSpeed ? "bot1" : "bot2";
    results.battleOver = true;
    results.endReason = "mutual destruction (clock speed tiebreak)";
  } else if (bot1Dead) {
    results.winner = "bot2";
    results.battleOver = true;
    results.endReason = `${bot1.name} destroyed`;
  } else if (bot2Dead) {
    results.winner = "bot1";
    results.battleOver = true;
    results.endReason = `${bot2.name} destroyed`;
  } else if (turnNumber >= BATTLE.MAX_TURNS) {
    if (bot1.hp === bot2.hp) {
      results.winner = bot1.clockSpeed >= bot2.clockSpeed ? "bot1" : "bot2";
      results.endReason = "time limit (clock speed tiebreak)";
    } else {
      results.winner = bot1.hp > bot2.hp ? "bot1" : "bot2";
      results.endReason = "time limit (HP comparison)";
    }
    results.battleOver = true;
  } else {
    results.battleOver = false;
  }

  return results;
}

function applyStartOfTurn(bot, result) {
  if (bot.regenRemaining > 0) {
    bot.hp = clamp(bot.hp + bot.regenPerTurn, 0, bot.maxHp);
    bot.regenRemaining--;
    result.log.push(`Regeneration: +${bot.regenPerTurn} HP`);
  }
}

function executeAction(
  attacker,
  defender,
  action,
  attackerResult,
  defenderResult,
  turnNumber,
) {
  if (action.type === "rest") {
    attackerResult.log.push("Resting... energy recharging");
    return;
  }

  const b = action.behavior;
  attacker.energy -= b.energyCost;

  const modName = action.module;

  // --- ATTACK behaviors ---
  if (modName === "ATTACK") {
    let totalDamage = 0;
    const numHits = b.hits || 1;

    const elMult = getElementMultiplier(attacker.element, defender.element);

    for (let i = 0; i < numHits; i++) {
      let damage = Math.round(b.baseDamage * elMult);
      let hit = Math.random() < b.accuracy;

      // Dodge check
      if (hit && defender.dodgeActive) {
        if (Math.random() < defender.dodgeChance) {
          hit = false;
          defenderResult.log.push(`Dodge Matrix: evaded ${b.name}!`);
        }
      }

      // Feint disruption (from defender's perspective — if defender used Feint)
      // Handled via defender's disruptChance on next turn — skip for now

      if (!hit) {
        attackerResult.log.push(`${b.name}: MISS`);
        continue;
      }

      // Critical hit
      if (b.critChance && Math.random() < b.critChance) {
        damage *= 2;
        attackerResult.log.push(`${b.name}: CRITICAL HIT!`);
      }

      // Shield reduction
      if (defender.shieldActive) {
        const reduced = Math.round(damage * defender.shieldReduction);
        damage -= reduced;
        defenderResult.log.push(`Shield: absorbed ${reduced} damage`);
      }

      damage = Math.max(1, Math.round(damage));
      defender.hp -= damage;
      totalDamage += damage;
      attackerResult.log.push(`${b.name}: dealt ${damage} damage`);
    }

    attackerResult.damage = totalDamage;

    if (elMult > 1) {
      attackerResult.log.push(
        `Super-effective! (${attacker.element} > ${defender.element})`,
      );
    } else if (elMult < 1) {
      attackerResult.log.push(
        `Resisted... (${attacker.element} < ${defender.element})`,
      );
    }

    // Counter-attack
    if (defender.counterAttack && totalDamage > 0) {
      const counterDmg = defender.counterAttack.counterDamage;
      attacker.hp -= counterDmg;
      defenderResult.log.push(
        `Counter-Attack: dealt ${counterDmg} damage back!`,
      );
    }

    // Self-damage (Singularity)
    if (b.selfDamage) {
      attacker.hp -= b.selfDamage;
      attackerResult.log.push(`Backfire: took ${b.selfDamage} self-damage`);
    }
  }

  // --- DEFENSE behaviors ---
  else if (modName === "DEFENSE") {
    if (b.name === "Shield Wall") {
      attacker.shieldActive = true;
      attacker.shieldReduction = b.damageReduction;
      attackerResult.log.push(
        `Shield Wall: blocking ${Math.round(b.damageReduction * 100)}% damage`,
      );
    } else if (b.name === "Dodge Matrix") {
      attacker.dodgeActive = true;
      attacker.dodgeChance = b.dodgeChance;
      attackerResult.log.push(
        `Dodge Matrix: ${Math.round(b.dodgeChance * 100)}% evasion active`,
      );
    } else if (b.name === "Counter-Attack") {
      attacker.shieldActive = true;
      attacker.shieldReduction = b.damageReduction;
      attacker.counterAttack = { counterDamage: b.counterDamage };
      attackerResult.log.push(
        `Counter-Attack: blocking ${Math.round(b.damageReduction * 100)}% + counter ready`,
      );
    } else if (b.name === "Regeneration") {
      attacker.regenRemaining = b.duration;
      attacker.regenPerTurn = b.healPerTurn;
      attackerResult.log.push(
        `Regeneration: +${b.healPerTurn} HP/turn for ${b.duration} turns`,
      );
    } else if (b.name === "Fortress Mode") {
      attacker.fortressMode = true;
      attacker.fortressRemaining = b.duration;
      attacker.shieldActive = true;
      attacker.shieldReduction = b.damageReduction;
      attackerResult.log.push(
        `Fortress Mode: ${Math.round(b.damageReduction * 100)}% block, attacks locked`,
      );
    }
  }

  // --- TACTICS behaviors ---
  else if (modName === "TACTICS") {
    if (b.name === "Feint") {
      // Next turn, enemy has disruption chance (reduced accuracy)
      if (Math.random() < b.disruptChance) {
        defenderResult.log.push(
          "Feint: disrupted! Next action accuracy reduced",
        );
        // Simple implementation: reduce next action effectiveness
        defender.feinted = true;
      } else {
        attackerResult.log.push("Feint: failed to disrupt");
      }
    } else if (b.name === "Energy Drain") {
      const drained = Math.min(b.drainAmount, defender.energy);
      defender.energy -= drained;
      attacker.energy += drained;
      attacker.energy = clamp(attacker.energy, 0, attacker.maxEnergy);
      attackerResult.log.push(`Energy Drain: stole ${drained} energy`);
    } else if (b.name === "Predict & Parry") {
      // Check if enemy used their most common action
      if (defender.actionHistory.length >= 1) {
        const lastAction =
          defender.actionHistory[defender.actionHistory.length - 1];
        const action2 =
          defender.actionHistory[defender.actionHistory.length - 2];
        if (action2 && lastAction.module === action2.module) {
          defender.hp -= b.counterDamage;
          attackerResult.log.push(
            `Predict & Parry: predicted ${lastAction.module}! Dealt ${b.counterDamage} damage`,
          );
        } else {
          attackerResult.log.push("Predict & Parry: prediction failed");
        }
      } else {
        attackerResult.log.push("Predict & Parry: insufficient data");
      }
    }
  }

  // --- OVERCLOCK behaviors ---
  else if (modName === "OVERCLOCK") {
    if (b.name === "Burst Mode") {
      attacker.burstMode = true;
      attackerResult.log.push(
        "Burst Mode: ACTIVATED -- double action next turn",
      );
    } else if (b.name === "Self-Repair") {
      const healed = Math.min(b.healAmount, attacker.maxHp - attacker.hp);
      attacker.hp += healed;
      attackerResult.log.push(`Self-Repair: restored ${healed} HP`);
    } else if (b.name === "EMP") {
      // Disable enemy's highest module
      const sorted = Object.entries(defender.modules).sort(
        (a, b) => b[1] - a[1],
      );
      const target = sorted[0][0];
      defender.disabledModule = target;
      attackerResult.log.push(`EMP: disabled enemy ${target} module!`);
    } else if (b.name === "Evolve") {
      // Permanently +1 to a random module (capped at MAX)
      const mods = Object.keys(attacker.modules);
      const upgradeable = mods.filter((m) => attacker.modules[m] < 5);
      if (upgradeable.length > 0) {
        const target = upgradeable[rand(0, upgradeable.length - 1)];
        attacker.modules[target]++;
        attacker.availableBehaviors = getAvailableBehaviors(attacker.modules);
        attackerResult.log.push(
          `Evolve: ${target} upgraded to level ${attacker.modules[target]}!`,
        );
      } else {
        attackerResult.log.push("Evolve: all modules maxed");
      }
    } else if (b.name === "Singularity") {
      const hit = Math.random() < b.accuracy;
      if (hit) {
        let damage = Math.round(
          b.baseDamage *
            getElementMultiplier(attacker.element, defender.element),
        );
        if (defender.shieldActive) {
          const reduced = Math.round(damage * defender.shieldReduction);
          damage -= reduced;
        }
        damage = Math.max(1, Math.round(damage));
        defender.hp -= damage;
        attackerResult.damage = damage;
        attackerResult.log.push(`Singularity: CONNECTED! ${damage} damage!`);
        const singElMult = getElementMultiplier(
          attacker.element,
          defender.element,
        );
        if (singElMult > 1)
          attackerResult.log.push(
            `Super-effective! (${attacker.element} > ${defender.element})`,
          );
        else if (singElMult < 1)
          attackerResult.log.push(
            `Resisted... (${attacker.element} < ${defender.element})`,
          );
      } else {
        attacker.hp -= b.selfDamage;
        attackerResult.log.push(
          `Singularity: BACKFIRED! Took ${b.selfDamage} self-damage`,
        );
      }
    }
  }
}

function clearEndOfTurn(bot) {
  bot.shieldActive = false;
  bot.shieldReduction = 0;
  bot.dodgeActive = false;
  bot.dodgeChance = 0;
  bot.counterAttack = null;
  bot.feinted = false;

  if (bot.fortressRemaining > 0) {
    bot.fortressRemaining--;
    if (bot.fortressRemaining <= 0) {
      bot.fortressMode = false;
    } else {
      // Re-enable shield for fortress
      bot.shieldActive = true;
      bot.shieldReduction = 0.8;
    }
  }

  // Clear EMP after 1 turn
  bot.disabledModule = null;
}

// --- ELO calculation ---
export function calculateElo(ratingA, ratingB, scoreA) {
  // scoreA: 1 = win, 0 = loss, 0.5 = draw
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;
  const K = 32;
  return {
    newRatingA: Math.round(ratingA + K * (scoreA - expectedA)),
    newRatingB: Math.round(ratingB + K * (1 - scoreA - expectedB)),
  };
}

// --- Run a full battle (for training sims or server-side) ---
export function runFullBattle(config1, config2) {
  const bot1 = createBattleBot(config1);
  const bot2 = createBattleBot(config2);
  const turns = [];

  for (let t = 1; t <= BATTLE.MAX_TURNS; t++) {
    const { action: action1, log: log1 } = selectAction(bot1, bot2, t);
    const { action: action2, log: log2 } = selectAction(bot2, bot1, t);

    const result = resolveTurn(bot1, bot2, action1, action2, t);
    result.bot1.decisionLog = log1;
    result.bot2.decisionLog = log2;
    result.bot1.action = action1.behavior
      ? `${action1.module}.${action1.behavior.name}`
      : "REST";
    result.bot2.action = action2.behavior
      ? `${action2.module}.${action2.behavior.name}`
      : "REST";
    turns.push(result);

    if (result.battleOver) break;
  }

  return {
    turns,
    finalState: {
      bot1: { hp: bot1.hp, maxHp: bot1.maxHp },
      bot2: { hp: bot2.hp, maxHp: bot2.maxHp },
    },
  };
}
