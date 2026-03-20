import React from "react";
import { MODULE_NAMES, MODULES, ELEMENTS } from "shared";

export default function BotCard({ name, modules, coreStats, element }) {
  const el = element ? ELEMENTS[element] : null;
  return (
    <div className="border border-neon-green-dim bg-bg-panel p-3">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-pixel text-[10px] text-neon-green glow-green">
          {name}
        </h3>
        {el && (
          <span
            className="font-pixel text-[7px] px-1.5 py-0.5 border"
            style={{ color: el.color, borderColor: el.color + "80" }}
          >
            {el.name}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-pixel text-[7px]">
        <Stat label="HP" value={coreStats.hp} color="text-neon-green" />
        <Stat label="ENERGY" value={coreStats.energy} color="text-cyan" />
        <Stat
          label="CLOCK SPD"
          value={coreStats.clockSpeed}
          color="text-amber"
        />
        <div />
        {MODULE_NAMES.map((mod) => (
          <Stat
            key={mod}
            label={mod}
            value={modules[mod]}
            color=""
            style={{ color: MODULES[mod].color }}
          />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color, style }) {
  return (
    <div className="flex justify-between" style={style}>
      <span className={`${color} opacity-60`}>{label}:</span>
      <span className={color}>{value}</span>
    </div>
  );
}
