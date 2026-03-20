import React from 'react';
import { SoundManager } from '../audio/SoundManager.js';

export default function TrainingSlider({ module, level, onChange, color, disabled, maxIncrease }) {
  const pips = [0, 1, 2, 3, 4, 5];

  const handleClick = (newLevel) => {
    if (disabled) return;
    if (newLevel > level && newLevel - level > maxIncrease) return;
    SoundManager.play('click');
    onChange(newLevel);
  };

  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="font-pixel text-[7px] w-20 shrink-0" style={{ color }}>
        {module}
      </span>
      <div className="flex gap-1 flex-1">
        {pips.map((p) => {
          const active = p <= level && p > 0;
          const canActivate = !disabled && (p <= level || p - level <= maxIncrease);
          return (
            <button
              key={p}
              onClick={() => handleClick(p)}
              disabled={disabled || (!canActivate && p > level)}
              className={`w-6 h-5 border transition-colors font-pixel text-[7px]
                ${p === 0 ? 'border-bg-panel text-neon-green-dim' : ''}
                ${active ? 'border-current' : 'border-bg-panel'}
                ${!canActivate && p > level ? 'opacity-20' : 'cursor-pointer hover:opacity-80'}
              `}
              style={active ? { backgroundColor: color + '40', borderColor: color, color } : {}}
            >
              {p}
            </button>
          );
        })}
      </div>
      <span className="font-pixel text-[9px] w-4 text-right" style={{ color }}>
        {level}
      </span>
    </div>
  );
}
