import React, { useRef, useEffect } from 'react';
import useStore from '../store.js';
import BattleArena from '../components/BattleArena.jsx';
import BattleLog from '../components/BattleLog.jsx';
import { SoundManager } from '../audio/SoundManager.js';

export default function BattleScreen() {
  const { battleState, turnResults } = useStore();
  const lastTurnRef = useRef(0);

  // Play sounds on hits
  useEffect(() => {
    if (turnResults.length > lastTurnRef.current) {
      const latest = turnResults[turnResults.length - 1];
      if (latest.bot1.damage > 0 || latest.bot2.damage > 0) {
        SoundManager.play('hit');
      } else {
        SoundManager.play('block');
      }
      lastTurnRef.current = turnResults.length;
    }
  }, [turnResults.length]);

  if (!battleState) return null;

  const { bot1, bot2, player1Name, player2Name } = battleState;
  const latestTurn = turnResults[turnResults.length - 1];

  return (
    <div className="flex flex-col min-h-screen p-4">
      {/* HP Bars */}
      <div className="flex justify-between items-start max-w-4xl mx-auto w-full mb-4">
        <BotStatus name={bot1.name} player={player1Name} hp={bot1.hp} maxHp={bot1.maxHp} energy={bot1.energy} maxEnergy={bot1.maxEnergy} side="left" />
        <div className="font-pixel text-sm text-amber glow-amber pt-4">
          TURN {turnResults.length}
        </div>
        <BotStatus name={bot2.name} player={player2Name} hp={bot2.hp} maxHp={bot2.maxHp} energy={bot2.energy} maxEnergy={bot2.maxEnergy} side="right" />
      </div>

      {/* Arena */}
      <div className="flex-1 max-w-4xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <BattleArena bot1={bot1} bot2={bot2} latestTurn={latestTurn} />
        </div>
        <div className="max-h-[60vh] overflow-y-auto border border-neon-green-dim bg-bg p-2">
          <h3 className="font-pixel text-[8px] text-neon-green mb-2 sticky top-0 bg-bg pb-1">NEURAL LOG</h3>
          <BattleLog turns={turnResults} />
        </div>
      </div>
    </div>
  );
}

function BotStatus({ name, player, hp, maxHp, energy, maxEnergy, side }) {
  const hpPct = Math.max(0, (hp / maxHp) * 100);
  const ePct = Math.max(0, (energy / maxEnergy) * 100);
  const hpColor = hpPct > 50 ? 'bg-neon-green' : hpPct > 25 ? 'bg-amber' : 'bg-red';
  const align = side === 'right' ? 'text-right items-end' : 'text-left items-start';

  return (
    <div className={`flex flex-col ${align} min-w-[120px]`}>
      <span className="font-pixel text-[8px] text-cyan">{player}</span>
      <span className="font-pixel text-[10px] text-neon-green glow-green">{name}</span>
      {/* HP bar */}
      <div className="w-full mt-1">
        <div className="flex justify-between">
          <span className="font-pixel text-[7px] text-neon-green-dim">HP</span>
          <span className="font-pixel text-[7px] text-neon-green-dim">{Math.max(0, hp)}/{maxHp}</span>
        </div>
        <div className="w-full h-2 bg-bg-panel border border-neon-green-dim">
          <div className={`h-full ${hpColor} transition-all duration-500`} style={{ width: `${hpPct}%` }} />
        </div>
      </div>
      {/* Energy bar */}
      <div className="w-full mt-1">
        <div className="flex justify-between">
          <span className="font-pixel text-[7px] text-cyan-dim">EN</span>
          <span className="font-pixel text-[7px] text-cyan-dim">{Math.max(0, energy)}/{maxEnergy}</span>
        </div>
        <div className="w-full h-1.5 bg-bg-panel border border-cyan-dim">
          <div className="h-full bg-cyan transition-all duration-500" style={{ width: `${ePct}%` }} />
        </div>
      </div>
    </div>
  );
}
