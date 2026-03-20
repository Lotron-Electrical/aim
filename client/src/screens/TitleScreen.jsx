import React, { useState, useEffect, useRef } from "react";
import useStore from "../store.js";
import { SoundManager } from "../audio/SoundManager.js";

const BOOT_LINES = [
  "BIOS v3.14 ... OK",
  "RAM: 640K ... sufficient",
  "Neural coprocessor ... ONLINE",
  "Loading AIm kernel ...",
  "Initializing battle protocols ...",
  "Calibrating ELO matrix ...",
  "",
  "> SYSTEM READY",
];

export default function TitleScreen() {
  const connect = useStore((s) => s.connect);
  const [name, setName] = useState("");
  const [bootPhase, setBootPhase] = useState(0); // 0=booting, 1=logo, 2=input
  const [visibleLines, setVisibleLines] = useState([]);
  const [showCursor, setShowCursor] = useState(true);
  const bootStarted = useRef(false);

  // Blinking cursor
  useEffect(() => {
    const timer = setInterval(() => setShowCursor((v) => !v), 500);
    return () => clearInterval(timer);
  }, []);

  // Boot sequence
  useEffect(() => {
    if (bootStarted.current) return;
    bootStarted.current = true;

    const timeouts = [];
    BOOT_LINES.forEach((line, idx) => {
      const id = setTimeout(() => {
        setVisibleLines((prev) => [...prev, line]);
      }, idx * 150);
      timeouts.push(id);
    });

    const afterLines = BOOT_LINES.length * 150;
    timeouts.push(setTimeout(() => setBootPhase(1), afterLines + 400));
    timeouts.push(setTimeout(() => setBootPhase(2), afterLines + 1200));

    return () => timeouts.forEach(clearTimeout);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    SoundManager.init();
    SoundManager.play("powerUp");
    connect(name.trim());
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {/* Boot text */}
      <div className="w-full max-w-lg mb-8 font-pixel text-[8px] sm:text-[10px] text-neon-green-dim leading-relaxed">
        {visibleLines.map((line, i) => (
          <div
            key={i}
            className={line.startsWith(">") ? "text-neon-green glow-green" : ""}
          >
            {line}
          </div>
        ))}
      </div>

      {/* Logo */}
      {bootPhase >= 1 && (
        <div className="text-center mb-8">
          <h1 className="font-pixel text-4xl sm:text-6xl text-neon-green glow-green tracking-wider">
            AIm
          </h1>
          <p className="font-pixel text-[10px] sm:text-xs text-amber glow-amber mt-3">
            who is the master?
          </p>
        </div>
      )}

      {/* Name input */}
      {bootPhase >= 2 && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center gap-4 w-full max-w-xs"
        >
          <div className="w-full">
            <label className="font-pixel text-[8px] text-cyan block mb-2">
              ENTER CALLSIGN:
            </label>
            <div className="flex items-center gap-1 border border-neon-green-dim bg-bg p-2">
              <span className="text-neon-green font-pixel text-xs">&gt;</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 20))}
                className="bg-transparent text-neon-green font-pixel text-xs outline-none flex-1 caret-transparent"
                autoFocus
                maxLength={20}
              />
              <span
                className={`text-neon-green font-pixel text-xs ${showCursor ? "" : "invisible"}`}
              >
                _
              </span>
            </div>
          </div>
          <button
            type="submit"
            disabled={!name.trim()}
            className="font-pixel text-[10px] bg-bg border border-neon-green text-neon-green
                       px-6 py-2 hover:bg-neon-green hover:text-bg transition-colors
                       disabled:opacity-30 disabled:cursor-not-allowed
                       active:scale-95"
          >
            [ CONNECT ]
          </button>
        </form>
      )}
    </div>
  );
}
