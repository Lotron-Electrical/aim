import React, { useState } from "react";
import useStore from "../store.js";
import {
  MODULES,
  MODULE_NAMES,
  TOTAL_TRAINING_POINTS,
  ELEMENTS,
  ELEMENT_NAMES,
} from "shared";
import TrainingSlider from "../components/TrainingSlider.jsx";
import NeuralGrid from "../components/NeuralGrid.jsx";
import BotCard from "../components/BotCard.jsx";
import BattleLog from "../components/BattleLog.jsx";
import { SoundManager } from "../audio/SoundManager.js";

export default function BuildScreen() {
  const {
    roomId,
    botName,
    setBotName,
    modules,
    setModuleLevel,
    priorities,
    setPriorities,
    getRemainingPoints,
    element,
    setElement,
    submitBot,
    runSim,
    simResult,
    simRunning,
    opponent,
    opponentReady,
    leaveRoom,
    coreStats,
    isAIRoom,
  } = useStore();
  const [showSim, setShowSim] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const remaining = getRemainingPoints();

  const handleSubmit = () => {
    if (remaining !== 0) return;
    if (!botName.trim()) return;
    SoundManager.play("powerUp");
    submitBot();
    setSubmitted(true);
  };

  const handleSim = () => {
    if (remaining !== 0) return;
    SoundManager.play("click");
    runSim();
    setShowSim(true);
  };

  return (
    <div className="flex flex-col min-h-screen p-2 pt-3 sm:p-4 sm:pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 max-w-4xl mx-auto w-full">
        <div>
          <h2 className="font-pixel text-sm text-neon-green glow-green">
            BOT BUILDER
          </h2>
          <p className="font-pixel text-[8px] text-cyan mt-1">Room: {roomId}</p>
        </div>
        <div className="flex items-center gap-3">
          {isAIRoom ? (
            <span className="font-pixel text-[8px] text-amber">
              vs AI OPPONENT
            </span>
          ) : (
            opponent && (
              <span className="font-pixel text-[8px] text-amber">
                vs {opponent.name} {opponentReady ? "(READY)" : "(building...)"}
              </span>
            )
          )}
          <button
            onClick={leaveRoom}
            className="font-pixel text-[8px] text-red border border-red px-2 py-1 hover:bg-red hover:text-bg transition-colors"
          >
            LEAVE
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Left: Build Controls */}
        <div className="space-y-4">
          {/* Bot Name */}
          <div>
            <label className="font-pixel text-[8px] text-amber block mb-1">
              BOT DESIGNATION:
            </label>
            <input
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value.slice(0, 20))}
              placeholder="NAME YOUR BOT"
              disabled={submitted}
              className="w-full font-pixel text-[10px] bg-bg border border-amber-dim text-amber
                         px-3 py-2 outline-none placeholder-amber-dim uppercase tracking-wider
                         disabled:opacity-50"
              maxLength={20}
            />
          </div>

          {/* Element Picker */}
          <div className="border border-neon-green-dim p-3 bg-bg-panel">
            <span className="font-pixel text-[8px] text-neon-green block mb-2">
              ELEMENT TYPE
            </span>
            <div className="flex gap-2">
              {ELEMENT_NAMES.map((el) => {
                const selected = element === el;
                const color = ELEMENTS[el].color;
                return (
                  <button
                    key={el}
                    disabled={submitted}
                    onClick={() => {
                      setElement(el);
                      SoundManager.play("click");
                    }}
                    className="flex-1 font-pixel text-[8px] py-2 border-2 transition-all disabled:cursor-not-allowed"
                    style={{
                      borderColor: selected ? color : color + "40",
                      color: selected ? color : color + "80",
                      backgroundColor: selected ? color + "15" : "transparent",
                      boxShadow: selected ? `0 0 8px ${color}60` : "none",
                    }}
                  >
                    {el}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Training Points */}
          <div className="border border-neon-green-dim p-3 bg-bg-panel">
            <div className="flex justify-between items-center mb-3">
              <span className="font-pixel text-[8px] text-neon-green">
                TRAINING POINTS
              </span>
              <span
                className={`font-pixel text-sm ${remaining === 0 ? "text-neon-green glow-green" : "text-red glow-red"}`}
              >
                {remaining}
              </span>
            </div>

            {MODULE_NAMES.map((mod) => (
              <TrainingSlider
                key={mod}
                module={mod}
                level={modules[mod]}
                onChange={(lvl) => setModuleLevel(mod, lvl)}
                color={MODULES[mod].color}
                disabled={submitted}
                maxIncrease={remaining}
              />
            ))}
          </div>

          {/* Priority Reordering */}
          {MODULE_NAMES.map((mod) => {
            const available = MODULES[mod].behaviors.filter(
              (b) => b.level <= modules[mod] && !b.passive,
            );
            if (available.length === 0) return null;

            return (
              <div key={mod} className="border border-bg-panel p-2 bg-bg">
                <span
                  className="font-pixel text-[8px] block mb-1"
                  style={{ color: MODULES[mod].color }}
                >
                  {mod} PRIORITIES:
                </span>
                <div className="space-y-1">
                  {available.map((b, i) => {
                    const prio = priorities[mod];
                    const isFirst = prio[0] === b.name;
                    return (
                      <button
                        key={b.name}
                        disabled={submitted}
                        onClick={() => {
                          // Toggle priority: move to front or remove
                          const current = priorities[mod].filter(
                            (n) => n !== b.name,
                          );
                          current.unshift(b.name);
                          setPriorities(mod, current);
                          SoundManager.play("click");
                        }}
                        className={`w-full text-left font-pixel text-[7px] px-2 py-1 border transition-colors
                          ${isFirst ? "border-neon-green bg-bg-panel text-neon-green" : "border-bg-panel text-neon-green-dim hover:border-neon-green-dim"}
                          disabled:cursor-not-allowed`}
                      >
                        <span className="text-amber-dim mr-1">[{b.level}]</span>
                        {b.name}{" "}
                        <span className="text-cyan-dim ml-1">
                          ({b.energyCost}E)
                        </span>
                        {isFirst && (
                          <span className="float-right text-amber">*TOP*</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSim}
              disabled={remaining !== 0 || simRunning || submitted}
              className="flex-1 font-pixel text-[9px] border border-cyan text-cyan py-2
                         hover:bg-cyan hover:text-bg transition-colors
                         disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {simRunning ? "SIMULATING..." : "[ TEST SIM ]"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={remaining !== 0 || !botName.trim() || submitted}
              className="flex-1 font-pixel text-[9px] border-2 border-neon-green text-neon-green py-2
                         hover:bg-neon-green hover:text-bg transition-colors
                         disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {submitted ? "LOCKED IN" : "[ SUBMIT BOT ]"}
            </button>
          </div>
        </div>

        {/* Right: Visualization */}
        <div className="space-y-4">
          <NeuralGrid modules={modules} />
          {coreStats && (
            <BotCard
              name={botName || "UNNAMED"}
              modules={modules}
              coreStats={coreStats}
              element={element}
            />
          )}
          {showSim && simResult && (
            <div className="border border-cyan-dim p-3 bg-bg max-h-64 overflow-y-auto">
              <h3 className="font-pixel text-[8px] text-cyan mb-2">
                TRAINING SIM RESULTS
              </h3>
              <p className="font-pixel text-[8px] text-amber mb-2">
                {simResult.turns.length} turns -- Winner:{" "}
                {simResult.turns[simResult.turns.length - 1]?.winner === "bot1"
                  ? "YOUR BOT"
                  : "SPARRING UNIT"}
              </p>
              <BattleLog turns={simResult.turns} compact />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
