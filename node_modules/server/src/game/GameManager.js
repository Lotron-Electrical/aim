// ============================================================
// AIm — Game Manager (orchestrates battles)
// ============================================================
import {
  createBattleBot,
  selectAction,
  resolveTurn,
  calculateElo,
  BATTLE,
} from 'shared';

export class GameManager {
  constructor(io, lobby) {
    this.io = io;
    this.lobby = lobby;
    this.activeBattles = new Map(); // roomId -> battle state
  }

  startBattle(roomId) {
    const room = this.lobby.getRoom(roomId);
    if (!room || !room.bots[room.player1] || !room.bots[room.player2]) return;

    room.state = 'battling';

    const bot1 = createBattleBot(room.bots[room.player1]);
    const bot2 = createBattleBot(room.bots[room.player2]);

    const battle = {
      roomId,
      bot1,
      bot2,
      player1: room.player1,
      player2: room.player2,
      turn: 0,
      interval: null,
    };

    this.activeBattles.set(roomId, battle);

    // Emit battle start
    const p1 = this.lobby.getPlayer(room.player1);
    const p2 = this.lobby.getPlayer(room.player2);
    this.io.to(roomId).emit('battle_start', {
      bot1: { name: bot1.name, hp: bot1.hp, maxHp: bot1.maxHp, energy: bot1.energy, maxEnergy: bot1.maxEnergy, modules: bot1.modules },
      bot2: { name: bot2.name, hp: bot2.hp, maxHp: bot2.maxHp, energy: bot2.energy, maxEnergy: bot2.maxEnergy, modules: bot2.modules },
      player1Name: p1?.name,
      player2Name: p2?.name,
    });

    // Start turn loop
    battle.interval = setInterval(() => this._runTurn(roomId), BATTLE.TURN_INTERVAL_MS);
  }

  _runTurn(roomId) {
    const battle = this.activeBattles.get(roomId);
    if (!battle) return;

    battle.turn++;
    const { bot1, bot2 } = battle;

    // Select actions
    const { action: action1, log: log1 } = selectAction(bot1, bot2, battle.turn);
    const { action: action2, log: log2 } = selectAction(bot2, bot1, battle.turn);

    // Burst mode: extra action
    let burstResult1 = null, burstResult2 = null;
    if (bot1.burstMode) {
      bot1.burstMode = false;
      const { action: extra } = selectAction(bot1, bot2, battle.turn);
      burstResult1 = resolveTurn(bot1, bot2, extra, { type: 'rest', module: 'NONE', behavior: null }, battle.turn);
    }
    if (bot2.burstMode) {
      bot2.burstMode = false;
      const { action: extra } = selectAction(bot2, bot1, battle.turn);
      burstResult2 = resolveTurn(bot1, bot2, { type: 'rest', module: 'NONE', behavior: null }, extra, battle.turn);
    }

    // Resolve main turn
    const result = resolveTurn(bot1, bot2, action1, action2, battle.turn);
    result.bot1.decisionLog = log1;
    result.bot2.decisionLog = log2;
    result.bot1.action = action1.behavior ? `${action1.module}.${action1.behavior.name}` : 'REST';
    result.bot2.action = action2.behavior ? `${action2.module}.${action2.behavior.name}` : 'REST';

    if (burstResult1) result.bot1.burstLog = burstResult1.bot1.log;
    if (burstResult2) result.bot2.burstLog = burstResult2.bot2.log;

    // Emit turn result
    this.io.to(roomId).emit('turn_result', result);

    // Check battle end
    if (result.battleOver) {
      clearInterval(battle.interval);
      this._endBattle(roomId, result);
    }
  }

  _endBattle(roomId, lastTurn) {
    const battle = this.activeBattles.get(roomId);
    if (!battle) return;

    const room = this.lobby.getRoom(roomId);
    const p1 = this.lobby.getPlayer(battle.player1);
    const p2 = this.lobby.getPlayer(battle.player2);

    if (p1 && p2) {
      const winnerIsP1 = lastTurn.winner === 'bot1';
      const scoreA = winnerIsP1 ? 1 : 0;
      const { newRatingA, newRatingB } = calculateElo(p1.rating, p2.rating, scoreA);

      const p1Delta = newRatingA - p1.rating;
      const p2Delta = newRatingB - p2.rating;

      p1.rating = newRatingA;
      p2.rating = newRatingB;

      if (winnerIsP1) {
        p1.stats.wins++;
        p1.stats.streak++;
        p1.stats.bestStreak = Math.max(p1.stats.bestStreak, p1.stats.streak);
        p2.stats.losses++;
        p2.stats.streak = 0;
      } else {
        p2.stats.wins++;
        p2.stats.streak++;
        p2.stats.bestStreak = Math.max(p2.stats.bestStreak, p2.stats.streak);
        p1.stats.losses++;
        p1.stats.streak = 0;
      }

      p1.stats.generation++;
      p2.stats.generation++;

      this.io.to(roomId).emit('battle_end', {
        winner: lastTurn.winner,
        endReason: lastTurn.endReason,
        player1: { name: p1.name, rating: p1.rating, delta: p1Delta, stats: p1.stats },
        player2: { name: p2.name, rating: p2.rating, delta: p2Delta, stats: p2.stats },
        finalHp: {
          bot1: { hp: battle.bot1.hp, maxHp: battle.bot1.maxHp },
          bot2: { hp: battle.bot2.hp, maxHp: battle.bot2.maxHp },
        },
      });
    }

    if (room) room.state = 'building';
    this.activeBattles.delete(roomId);
  }

  cancelBattle(roomId) {
    const battle = this.activeBattles.get(roomId);
    if (battle) {
      clearInterval(battle.interval);
      this.activeBattles.delete(roomId);
    }
  }
}
