import React, { useEffect } from "react";
import useStore from "../store.js";
import { SoundManager } from "../audio/SoundManager.js";

export default function ResultScreen() {
  const { battleEnd, playerName, returnToLobby, leaveRoom, isAIRoom } = useStore();

  useEffect(() => {
    if (!battleEnd) return;
    const myName = playerName;
    const iAmP1 = battleEnd.player1.name === myName;
    const iWon =
      (battleEnd.winner === "bot1" && iAmP1) ||
      (battleEnd.winner === "bot2" && !iAmP1);
    SoundManager.play(iWon ? "win" : "lose");
  }, [battleEnd]);

  if (!battleEnd) return null;

  const { winner, endReason, player1, player2, finalHp } = battleEnd;
  const iAmP1 = player1.name === playerName;
  const me = iAmP1 ? player1 : player2;
  const them = iAmP1 ? player2 : player1;
  const iWon = (winner === "bot1" && iAmP1) || (winner === "bot2" && !iAmP1);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {/* Winner announcement */}
      <div className="text-center mb-8">
        <h1
          className={`font-pixel text-3xl sm:text-5xl mb-4 ${iWon ? "text-neon-green glow-green" : "text-red glow-red"}`}
        >
          {iWon ? "VICTORY" : "DEFEATED"}
        </h1>
        <p className="font-pixel text-[10px] text-amber">{endReason}</p>
      </div>

      {/* Stats */}
      <div className="w-full max-w-md space-y-3 mb-8">
        {isAIRoom ? (
          <>
            <div className="text-center font-pixel text-[8px] text-cyan mb-2">
              AI MATCH — NO ELO CHANGES
            </div>
            <StatRow label="YOUR ELO" value={me.rating} />
            <div className="border-t border-bg-panel my-2" />
            <StatRow label="GENERATION" value={me.stats?.generation} />
          </>
        ) : (
          <>
            <StatRow label="YOUR ELO" value={me.rating} delta={me.delta} />
            <StatRow label="OPPONENT ELO" value={them.rating} delta={them.delta} />
            <div className="border-t border-bg-panel my-2" />
            <StatRow label="WINS" value={me.stats.wins} />
            <StatRow label="LOSSES" value={me.stats.losses} />
            <StatRow label="STREAK" value={me.stats.streak} />
            <StatRow label="BEST STREAK" value={me.stats.bestStreak} />
            <StatRow label="GENERATION" value={me.stats.generation} />
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => {
            SoundManager.play("click");
            returnToLobby();
          }}
          className="font-pixel text-[10px] border-2 border-neon-green text-neon-green
                     px-6 py-3 hover:bg-neon-green hover:text-bg transition-colors"
        >
          [ REBUILD ]
        </button>
        <button
          onClick={() => {
            SoundManager.play("click");
            leaveRoom();
          }}
          className="font-pixel text-[10px] border border-red text-red
                     px-6 py-3 hover:bg-red hover:text-bg transition-colors"
        >
          [ LEAVE ]
        </button>
      </div>
    </div>
  );
}

function StatRow({ label, value, delta }) {
  return (
    <div className="flex justify-between items-center font-pixel text-[9px]">
      <span className="text-amber-dim">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-neon-green">{value}</span>
        {delta !== undefined && (
          <span className={`${delta >= 0 ? "text-neon-green" : "text-red"}`}>
            ({delta >= 0 ? "+" : ""}
            {delta})
          </span>
        )}
      </div>
    </div>
  );
}
