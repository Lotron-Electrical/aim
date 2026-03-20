import React, { useRef, useEffect } from "react";

const MODULE_COLORS = {
  ATTACK: "#ff0040",
  DEFENSE: "#00d4ff",
  TACTICS: "#ffb000",
  OVERCLOCK: "#00ff41",
  NONE: "#666",
};

export default function BattleLog({ turns, compact = false }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length]);

  if (!turns || turns.length === 0) {
    return (
      <div className="font-pixel text-[7px] text-neon-green-dim">
        Awaiting combat data...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {turns.map((turn, i) => (
        <div key={i} className="border-b border-bg-panel pb-1">
          <div className="font-pixel text-[7px] text-amber mb-1">
            [TURN {turn.turn}]
          </div>

          {/* Bot 1 */}
          <TurnEntry
            label="P1"
            action={turn.bot1.action}
            decisionLog={turn.bot1.decisionLog}
            actionLog={turn.bot1.log}
            compact={compact}
          />

          {/* Bot 2 */}
          <TurnEntry
            label="P2"
            action={turn.bot2.action}
            decisionLog={turn.bot2.decisionLog}
            actionLog={turn.bot2.log}
            compact={compact}
          />

          {turn.battleOver && (
            <div className="font-pixel text-[8px] text-red glow-red mt-1">
              &gt;&gt; {turn.endReason}
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function TurnEntry({ label, action, decisionLog, actionLog, compact }) {
  const module = action?.split(".")[0] || "NONE";
  const color = MODULE_COLORS[module] || MODULE_COLORS.NONE;

  return (
    <div className="ml-2 mb-1">
      <span className="font-pixel text-[7px] text-cyan-dim">{label}: </span>
      <span className="font-pixel text-[7px]" style={{ color }}>
        {action || "REST"}
      </span>

      {!compact &&
        decisionLog?.map((line, i) => (
          <div
            key={i}
            className="font-pixel text-[6px] text-neon-green-dim ml-4"
          >
            {line}
          </div>
        ))}

      {actionLog?.map((line, i) => (
        <div key={i} className="font-pixel text-[6px] text-neon-green ml-4">
          &gt; {line}
        </div>
      ))}
    </div>
  );
}
