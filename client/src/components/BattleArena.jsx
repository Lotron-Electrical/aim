import React, { useRef, useEffect, useState } from "react";
import { MODULE_NAMES, MODULES, ELEMENTS } from "shared";

// Procedural 32x32 bot sprite based on module allocation
function drawBotSprite(
  ctx,
  x,
  y,
  modules,
  scale = 2,
  flipped = false,
  element = null,
) {
  const s = scale;
  const attack = modules.ATTACK || 0;
  const defense = modules.DEFENSE || 0;
  const tactics = modules.TACTICS || 0;
  const overclock = modules.OVERCLOCK || 0;

  ctx.save();
  if (flipped) {
    ctx.translate(x + 16 * s, y);
    ctx.scale(-1, 1);
    x = 0;
    y = 0;
  }

  // Body (wider = more ATTACK)
  const bodyW = 10 + attack;
  const bodyH = 14 + defense;
  const bodyX = x + (16 - bodyW / 2) * s;
  const bodyY = y + (20 - bodyH) * s;

  // Element aura
  if (element && ELEMENTS[element]) {
    const auraColor = ELEMENTS[element].color;
    ctx.save();
    ctx.shadowColor = auraColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = auraColor + "20";
    ctx.fillRect(
      bodyX - 4 * s,
      bodyY - 4 * s,
      (bodyW + 8) * s,
      (bodyH + 8) * s,
    );
    ctx.restore();
  }

  // Body color based on dominant module
  const dominant = Object.entries(modules).sort((a, b) => b[1] - a[1])[0][0];
  ctx.fillStyle = MODULES[dominant].color + "cc";
  ctx.fillRect(bodyX, bodyY, bodyW * s, bodyH * s);

  // Armor plates (DEFENSE)
  if (defense >= 2) {
    ctx.fillStyle = "#00d4ff60";
    ctx.fillRect(bodyX - 2 * s, bodyY + 2 * s, 2 * s, (bodyH - 4) * s);
    ctx.fillRect(bodyX + bodyW * s, bodyY + 2 * s, 2 * s, (bodyH - 4) * s);
  }

  // Head
  const headSize = 8 + Math.floor(tactics * 0.8);
  const headX = x + (16 - headSize / 2) * s;
  const headY = bodyY - headSize * s - s;
  ctx.fillStyle = "#aaaacc";
  ctx.fillRect(headX, headY, headSize * s, headSize * s);

  // Eyes
  ctx.fillStyle =
    dominant === "ATTACK"
      ? "#ff0040"
      : dominant === "TACTICS"
        ? "#ffb000"
        : "#00ff41";
  ctx.fillRect(headX + 2 * s, headY + 3 * s, 2 * s, 2 * s);
  ctx.fillRect(headX + (headSize - 4) * s, headY + 3 * s, 2 * s, 2 * s);

  // Antenna (TACTICS)
  if (tactics >= 2) {
    ctx.strokeStyle = "#ffb000";
    ctx.lineWidth = s;
    ctx.beginPath();
    ctx.moveTo(headX + (headSize * s) / 2, headY);
    ctx.lineTo(headX + (headSize * s) / 2, headY - (3 + tactics) * s);
    ctx.stroke();
    // Tip
    ctx.fillStyle = "#ffb000";
    ctx.beginPath();
    ctx.arc(
      headX + (headSize * s) / 2,
      headY - (3 + tactics) * s,
      2 * s,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // Glowing core (OVERCLOCK)
  if (overclock >= 1) {
    const coreBrightness = 0.3 + (overclock / 5) * 0.7;
    const coreSize = 2 + overclock;
    ctx.shadowColor = "#00ff41";
    ctx.shadowBlur = 5 + overclock * 3;
    ctx.fillStyle = `rgba(0, 255, 65, ${coreBrightness})`;
    ctx.beginPath();
    ctx.arc(
      bodyX + (bodyW * s) / 2,
      bodyY + (bodyH * s) / 2,
      coreSize * s,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Weapon arm (ATTACK)
  if (attack >= 1) {
    ctx.fillStyle = "#ff004080";
    const armLen = 4 + attack * 2;
    ctx.fillRect(bodyX + bodyW * s, bodyY + 4 * s, armLen * s, 3 * s);
  }

  // Legs
  ctx.fillStyle = "#666688";
  ctx.fillRect(bodyX + 2 * s, bodyY + bodyH * s, 3 * s, 4 * s);
  ctx.fillRect(bodyX + (bodyW - 5) * s, bodyY + bodyH * s, 3 * s, 4 * s);

  ctx.restore();
}

export default function BattleArena({ bot1, bot2, latestTurn }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ w: 500, h: 300 });
  const [shakeBot, setShakeBot] = useState(null);

  // Responsive canvas sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      const w = Math.floor(cr.width);
      const h = Math.floor(w * (3 / 5));
      if (w > 0) setCanvasSize({ w, h });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (latestTurn) {
      if (latestTurn.bot1.damage > 0) setShakeBot("bot1");
      else if (latestTurn.bot2.damage > 0) setShakeBot("bot2");
      const timer = setTimeout(() => setShakeBot(null), 300);
      return () => clearTimeout(timer);
    }
  }, [latestTurn]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Floor grid
    ctx.strokeStyle = "#1a1a3a";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.7);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = Math.floor(h * 0.7); y < h; y += 15) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw bots
    const bot1X =
      w * 0.15 + (shakeBot === "bot1" ? (Math.random() - 0.5) * 8 : 0);
    const bot2X =
      w * 0.65 + (shakeBot === "bot2" ? (Math.random() - 0.5) * 8 : 0);
    const botY = h * 0.3;

    drawBotSprite(ctx, bot1X, botY, bot1.modules, 3, false, bot1.element);
    drawBotSprite(ctx, bot2X, botY, bot2.modules, 3, true, bot2.element);

    // Action indicators
    if (latestTurn) {
      // Hit particles
      if (latestTurn.bot2.damage > 0) {
        drawHitParticles(ctx, bot2X + 40, botY + 30, "#ff0040");
      }
      if (latestTurn.bot1.damage > 0) {
        drawHitParticles(ctx, bot1X + 40, botY + 30, "#ff0040");
      }
    }
  }, [bot1, bot2, latestTurn, shakeBot, canvasSize]);

  return (
    <div ref={containerRef} className="border border-neon-green-dim bg-bg p-2">
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        className="w-full max-w-full bg-bg"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}

function drawHitParticles(ctx, x, y, color) {
  for (let i = 0; i < 6; i++) {
    const px = x + (Math.random() - 0.5) * 40;
    const py = y + (Math.random() - 0.5) * 40;
    const size = 2 + Math.random() * 4;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5 + Math.random() * 0.5;
    ctx.fillRect(px, py, size, size);
  }
  ctx.globalAlpha = 1;
}
