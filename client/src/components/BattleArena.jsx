import React, { useRef, useEffect, useState } from "react";
import { MODULES, ELEMENTS } from "shared";
import {
  createParticle,
  updateParticles,
  drawParticles,
  spawnHitEffect,
  spawnHealEffect,
  spawnProjectile,
  updateEffects,
  drawEffects,
  drawDamageNumber,
  drawBlockText,
  drawShield,
  drawBeam,
  drawLightningArc,
  parseAction,
  spawnAmbientParticle,
} from "./battleAnimations.js";

// ── Bot sprite drawing (unchanged logic, extracted for clarity) ──

function drawBotSprite(ctx, x, y, modules, scale, flipped, element, opts = {}) {
  const {
    bobOffset = 0,
    alpha = 1,
    auraBlur = 12,
    auraAlpha = 1,
    eyesVisible = true,
    antennaAlpha = 1,
    coreScale = 1,
    ghostAlpha = 0, // for dodge effect
    tintColor = null, // for burst/evolve flash
  } = opts;

  const s = scale;
  const attack = modules.ATTACK || 0;
  const defense = modules.DEFENSE || 0;
  const tactics = modules.TACTICS || 0;
  const overclock = modules.OVERCLOCK || 0;

  ctx.save();
  ctx.globalAlpha = alpha;

  const drawY = y + bobOffset;

  if (flipped) {
    ctx.translate(x + 16 * s, drawY);
    ctx.scale(-1, 1);
    x = 0;
    // drawY applied via translate above
  } else {
    ctx.translate(0, bobOffset);
  }

  const actualY = flipped ? 0 : y;

  // Body dimensions
  const bodyW = 10 + attack;
  const bodyH = 14 + defense;
  const bodyX = (flipped ? 0 : x) + (16 - bodyW / 2) * s;
  const bodyY = actualY + (20 - bodyH) * s;

  // Element aura
  if (element && ELEMENTS[element]) {
    const auraColor = ELEMENTS[element].color;
    ctx.save();
    ctx.shadowColor = auraColor;
    ctx.shadowBlur = auraBlur * auraAlpha;
    ctx.fillStyle = auraColor + "20";
    ctx.globalAlpha = alpha * auraAlpha * 0.5;
    ctx.fillRect(
      bodyX - 4 * s,
      bodyY - 4 * s,
      (bodyW + 8) * s,
      (bodyH + 8) * s,
    );
    ctx.restore();
    ctx.globalAlpha = alpha;
  }

  // Ghost (dodge after-image)
  if (ghostAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = ghostAlpha * 0.3;
    const dominant = Object.entries(modules).sort((a, b) => b[1] - a[1])[0]?.[0];
    ctx.fillStyle = (dominant && MODULES[dominant]?.color) || "#ff0040";
    ctx.fillRect(bodyX, bodyY + 12, bodyW * s, bodyH * s);
    ctx.restore();
    ctx.globalAlpha = alpha;
  }

  // Body color
  const dominant = Object.entries(modules).sort((a, b) => b[1] - a[1])[0]?.[0];
  const bodyColor = tintColor || ((dominant && MODULES[dominant]?.color) || "#ff0040") + "cc";
  ctx.fillStyle = bodyColor;
  ctx.fillRect(bodyX, bodyY, bodyW * s, bodyH * s);

  // Armor plates (DEFENSE)
  if (defense >= 2) {
    ctx.fillStyle = "#00d4ff60";
    ctx.fillRect(bodyX - 2 * s, bodyY + 2 * s, 2 * s, (bodyH - 4) * s);
    ctx.fillRect(bodyX + bodyW * s, bodyY + 2 * s, 2 * s, (bodyH - 4) * s);
  }

  // Head
  const headSize = 8 + Math.floor(tactics * 0.8);
  const headX = (flipped ? 0 : x) + (16 - headSize / 2) * s;
  const headY = bodyY - headSize * s - s;
  ctx.fillStyle = "#aaaacc";
  ctx.fillRect(headX, headY, headSize * s, headSize * s);

  // Eyes
  if (eyesVisible) {
    ctx.fillStyle =
      dominant === "ATTACK"
        ? "#ff0040"
        : dominant === "TACTICS"
          ? "#ffb000"
          : "#00ff41";
    ctx.fillRect(headX + 2 * s, headY + 3 * s, 2 * s, 2 * s);
    ctx.fillRect(headX + (headSize - 4) * s, headY + 3 * s, 2 * s, 2 * s);
  }

  // Antenna (TACTICS)
  if (tactics >= 2) {
    ctx.strokeStyle = "#ffb000";
    ctx.lineWidth = s;
    ctx.globalAlpha = alpha * antennaAlpha;
    ctx.beginPath();
    ctx.moveTo(headX + (headSize * s) / 2, headY);
    ctx.lineTo(headX + (headSize * s) / 2, headY - (3 + tactics) * s);
    ctx.stroke();
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
    ctx.globalAlpha = alpha;
  }

  // Glowing core (OVERCLOCK)
  if (overclock >= 1) {
    const coreBrightness = 0.3 + (overclock / 5) * 0.7;
    const coreSize = (2 + overclock) * coreScale;
    ctx.shadowColor = "#00ff41";
    ctx.shadowBlur = (5 + overclock * 3) * coreScale;
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

// ── Bot center helper ──

function getBotCenter(baseX, baseY, modules, scale) {
  const attack = modules.ATTACK || 0;
  const defense = modules.DEFENSE || 0;
  const bodyW = 10 + attack;
  const bodyH = 14 + defense;
  return {
    x: baseX + 16 * scale,
    y: baseY + (20 - bodyH / 2) * scale,
  };
}

// ── Main component ──

export default function BattleArena({ bot1, bot2, latestTurn }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ w: 500, h: 300 });

  // Refs for animation state (never trigger re-renders)
  const animRef = useRef({
    startTime: performance.now(),
    particles: [],
    effects: [],
    ambientParticles: [],
    screenShake: { x: 0, y: 0, intensity: 0 },
    botOffsets: { bot1: { x: 0, y: 0 }, bot2: { x: 0, y: 0 } },
    turnAnim: {
      turn: -1,
      phase: "idle",
      startTime: 0,
      action1: null,
      action2: null,
    },
    damageNumbers: [], // { x, y, damage, startTime, color }
    eyeBlink: {
      bot1: { nextBlink: 3000, blinking: false },
      bot2: { nextBlink: 4200, blinking: false },
    },
    antennaFlicker: { bot1: 1, bot2: 1, lastUpdate: 0 },
    activeShields: { bot1: null, bot2: null }, // { layers, startTime }
    dodgeGhost: { bot1: 0, bot2: 0 },
    restState: { bot1: false, bot2: false },
    burstGlow: { bot1: 0, bot2: 0 },
    lastAmbientSpawn: 0,
    screenFlash: { color: null, startTime: 0, duration: 150 },
    lastFrameTime: performance.now(),
  });

  // Keep props in refs so rAF loop always reads current values
  const bot1Ref = useRef(bot1);
  const bot2Ref = useRef(bot2);
  const latestTurnRef = useRef(latestTurn);

  useEffect(() => {
    bot1Ref.current = bot1;
  }, [bot1]);
  useEffect(() => {
    bot2Ref.current = bot2;
  }, [bot2]);

  // Trigger turn animation when latestTurn changes
  useEffect(() => {
    latestTurnRef.current = latestTurn;
    if (!latestTurn) return;

    const anim = animRef.current;
    const turnNum = latestTurn.turn ?? -1;
    if (turnNum === anim.turnAnim.turn) return;

    const action1 = parseAction(latestTurn.bot1?.action);
    const action2 = parseAction(latestTurn.bot2?.action);
    console.log("[BattleArena] Turn animation triggered:", turnNum, action1, action2);

    anim.turnAnim = {
      turn: turnNum,
      phase: "windup",
      startTime: performance.now(),
      action1,
      action2,
      effectsSpawned: false,
      impactDone: false,
      dmgNumbersSpawned: false,
    };
    anim.restState.bot1 = action1.module === "REST";
    anim.restState.bot2 = action2.module === "REST";
    anim.activeShields.bot1 = null;
    anim.activeShields.bot2 = null;
    anim.dodgeGhost.bot1 = 0;
    anim.dodgeGhost.bot2 = 0;
    anim.burstGlow.bot1 = 0;
    anim.burstGlow.bot2 = 0;
  }, [latestTurn]);

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

  // ── rAF loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let rafId;

    function frame(now) {
      rafId = requestAnimationFrame(frame);
      try {

      const anim = animRef.current;
      const dt = Math.min(now - anim.lastFrameTime, 50); // cap dt to avoid spiral
      anim.lastFrameTime = now;
      const time = now - anim.startTime;

      const w = canvas.width;
      const h = canvas.height;
      const b1 = bot1Ref.current;
      const b2 = bot2Ref.current;
      const turn = latestTurnRef.current;
      if (!b1 || !b2 || !b1.modules || !b2.modules) return;

      // ── Update phase ──

      // Screen shake decay
      anim.screenShake.intensity *= 0.85;
      if (anim.screenShake.intensity < 0.3) anim.screenShake.intensity = 0;
      if (anim.screenShake.intensity > 0) {
        anim.screenShake.x =
          (Math.random() - 0.5) * anim.screenShake.intensity * 2;
        anim.screenShake.y =
          (Math.random() - 0.5) * anim.screenShake.intensity * 2;
      } else {
        anim.screenShake.x = 0;
        anim.screenShake.y = 0;
      }

      // Eye blink
      updateEyeBlink(anim.eyeBlink.bot1, time);
      updateEyeBlink(anim.eyeBlink.bot2, time);

      // Antenna flicker
      if (time - anim.antennaFlicker.lastUpdate > 200) {
        anim.antennaFlicker.bot1 = 0.4 + Math.random() * 0.6;
        anim.antennaFlicker.bot2 = 0.4 + Math.random() * 0.6;
        anim.antennaFlicker.lastUpdate = time;
      }

      // Ambient particles
      if (
        time - anim.lastAmbientSpawn > 500 &&
        anim.ambientParticles.length < 8
      ) {
        spawnAmbientParticle(anim.ambientParticles, w, h);
        anim.lastAmbientSpawn = time;
      }

      // Turn animation sequencer
      const ta = anim.turnAnim;
      const elapsed = now - ta.startTime;
      const botScale = 3;
      const bot1BaseX = w * 0.15;
      const bot2BaseX = w * 0.65;
      const botBaseY = h * 0.3;

      // Reset offsets
      anim.botOffsets.bot1.x = 0;
      anim.botOffsets.bot1.y = 0;
      anim.botOffsets.bot2.x = 0;
      anim.botOffsets.bot2.y = 0;

      if (ta.phase !== "idle" && ta.turn >= 0) {
        sequenceTurnAnimation(
          anim,
          elapsed,
          now,
          w,
          h,
          b1,
          b2,
          turn,
          bot1BaseX,
          bot2BaseX,
          botBaseY,
          botScale,
        );
      }

      // Rest ZZZ particles
      if (anim.restState.bot1 && Math.random() < 0.03) {
        const c1 = getBotCenter(bot1BaseX, botBaseY, b1.modules, botScale);
        anim.particles.push(
          createParticle({
            x: c1.x,
            y: c1.y - 20,
            vx: 0.3,
            vy: -0.5,
            text: "Z",
            fontSize: 8 + Math.random() * 4,
            color: "#00ff4180",
            lifetime: 1000,
            decay: true,
            size: 0,
          }),
        );
      }
      if (anim.restState.bot2 && Math.random() < 0.03) {
        const c2 = getBotCenter(bot2BaseX, botBaseY, b2.modules, botScale);
        anim.particles.push(
          createParticle({
            x: c2.x,
            y: c2.y - 20,
            vx: -0.3,
            vy: -0.5,
            text: "Z",
            fontSize: 8 + Math.random() * 4,
            color: "#00ff4180",
            lifetime: 1000,
            decay: true,
            size: 0,
          }),
        );
      }

      // Update systems
      updateParticles(anim.particles, dt);
      updateParticles(anim.ambientParticles, dt);
      updateEffects(anim.effects, dt);

      // Clean up old damage numbers
      anim.damageNumbers = anim.damageNumbers.filter(
        (d) => now - d.startTime < 900,
      );

      // ── Draw phase ──

      ctx.clearRect(0, 0, w, h);
      ctx.save();

      // Screen shake translate
      ctx.translate(anim.screenShake.x, anim.screenShake.y);

      // Screen flash
      if (
        anim.screenFlash.color &&
        now - anim.screenFlash.startTime < anim.screenFlash.duration
      ) {
        const flashT =
          (now - anim.screenFlash.startTime) / anim.screenFlash.duration;
        ctx.save();
        ctx.globalAlpha = 0.15 * (1 - flashT);
        ctx.fillStyle = anim.screenFlash.color;
        ctx.fillRect(-10, -10, w + 20, h + 20);
        ctx.restore();
      }

      // Animated grid floor
      const gridAlpha = 0.15 + Math.sin(time * 0.001) * 0.05;
      ctx.strokeStyle = `rgba(26, 26, 58, ${gridAlpha})`;
      ctx.lineWidth = 0.5;
      for (let gx = 0; gx < w; gx += 30) {
        ctx.beginPath();
        ctx.moveTo(gx, h * 0.7);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = Math.floor(h * 0.7); gy < h; gy += 15) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      // Ambient background particles
      drawParticles(ctx, anim.ambientParticles);

      // Idle bob
      const bob1 = Math.sin(time * 0.003) * 2;
      const bob2 = Math.sin(time * 0.003 + 1.5) * 2;

      // Bot positions with offsets
      const b1x = bot1BaseX + anim.botOffsets.bot1.x;
      const b1y = botBaseY + anim.botOffsets.bot1.y;
      const b2x = bot2BaseX + anim.botOffsets.bot2.x;
      const b2y = botBaseY + anim.botOffsets.bot2.y;

      // Aura pulse
      const aura1 = 12 + Math.sin(time * 0.004) * 3;
      const aura2 = 12 + Math.sin(time * 0.004 + 1) * 3;
      const auraAlpha1 = 0.7 + Math.sin(time * 0.003) * 0.3;
      const auraAlpha2 = 0.7 + Math.sin(time * 0.003 + 1) * 0.3;

      // Core pulse
      const coreScale1 = 0.8 + Math.sin(time * 0.005) * 0.2;
      const coreScale2 = 0.8 + Math.sin(time * 0.005 + 0.7) * 0.2;

      // Draw bot 1
      drawBotSprite(ctx, b1x, b1y, b1.modules, botScale, false, b1.element, {
        bobOffset: bob1,
        alpha: anim.restState.bot1 ? 0.8 : 1,
        auraBlur: aura1,
        auraAlpha: auraAlpha1,
        eyesVisible: !anim.eyeBlink.bot1.blinking,
        antennaAlpha: anim.antennaFlicker.bot1,
        coreScale: anim.burstGlow.bot1 > 0 ? 1.5 : coreScale1,
        ghostAlpha: anim.dodgeGhost.bot1,
        tintColor: anim.burstGlow.bot1 > 0 ? "#00ff41cc" : null,
      });

      // Draw bot 2
      drawBotSprite(ctx, b2x, b2y, b2.modules, botScale, true, b2.element, {
        bobOffset: bob2,
        alpha: anim.restState.bot2 ? 0.8 : 1,
        auraBlur: aura2,
        auraAlpha: auraAlpha2,
        eyesVisible: !anim.eyeBlink.bot2.blinking,
        antennaAlpha: anim.antennaFlicker.bot2,
        coreScale: anim.burstGlow.bot2 > 0 ? 1.5 : coreScale2,
        ghostAlpha: anim.dodgeGhost.bot2,
        tintColor: anim.burstGlow.bot2 > 0 ? "#00ff41cc" : null,
      });

      // Shields
      if (anim.activeShields.bot1) {
        const c = getBotCenter(b1x, b1y + bob1, b1.modules, botScale);
        drawShield(
          ctx,
          c.x - 30,
          c.y - 30,
          60,
          60,
          time,
          anim.activeShields.bot1.layers,
        );
      }
      if (anim.activeShields.bot2) {
        const c = getBotCenter(b2x, b2y + bob2, b2.modules, botScale);
        drawShield(
          ctx,
          c.x - 30,
          c.y - 30,
          60,
          60,
          time,
          anim.activeShields.bot2.layers,
        );
      }

      // Active effects (projectiles, beams, rings)
      drawEffects(ctx, anim.effects, time);

      // Foreground particles
      drawParticles(ctx, anim.particles);

      // Damage numbers
      for (const dn of anim.damageNumbers) {
        const dnElapsed = now - dn.startTime;
        if (dn.text) {
          drawBlockText(ctx, dn.x, dn.y, dn.text, dnElapsed, dn.color);
        } else {
          drawDamageNumber(ctx, dn.x, dn.y, dn.damage, dnElapsed, dn.color);
        }
      }

      ctx.restore();

      } catch (err) {
        console.error("[BattleArena] frame error:", err);
      }
    }

    console.log("[BattleArena] rAF loop started, canvas:", canvasSize.w, "x", canvasSize.h);
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [canvasSize]); // only restart loop if canvas resizes

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

// ── Turn animation sequencer ──

function sequenceTurnAnimation(
  anim,
  elapsed,
  now,
  w,
  h,
  b1,
  b2,
  turn,
  bot1BaseX,
  bot2BaseX,
  botBaseY,
  botScale,
) {
  const ta = anim.turnAnim;
  const a1 = ta.action1; // { module, behavior }
  const a2 = ta.action2;
  const dmg1 = turn?.bot1?.damage || 0; // damage dealt BY bot1 (taken by bot2)
  const dmg2 = turn?.bot2?.damage || 0; // damage dealt BY bot2 (taken by bot1)

  const c1 = getBotCenter(bot1BaseX, botBaseY, b1.modules, botScale);
  const c2 = getBotCenter(bot2BaseX, botBaseY, b2.modules, botScale);

  const isAttack = (a) => a && a.module === "ATTACK";
  const isDefense = (a) => a && a.module === "DEFENSE";
  const isTactics = (a) => a && a.module === "TACTICS";
  const isOverclock = (a) => a && a.module === "OVERCLOCK";
  const isRest = (a) => a && a.module === "REST";

  // Color helpers
  const getColor = (bot) => {
    const el = bot.element && ELEMENTS[bot.element];
    return el ? el.color : "#ff0040";
  };
  const getModColor = (a) => {
    if (!a || !a.module || a.module === "REST") return "#00ff41";
    return MODULES[a.module]?.color || "#ffffff";
  };

  // ── Phase: Windup (0-200ms) ──
  if (elapsed < 200) {
    const t = elapsed / 200;
    // Attackers lean back
    if (isAttack(a1) || isOverclock(a1)) anim.botOffsets.bot1.x = -8 * t;
    if (isAttack(a2) || isOverclock(a2)) anim.botOffsets.bot2.x = 8 * t;
    // Defenders brace
    if (isDefense(a1)) triggerDefenseVisual(anim, "bot1", a1, now);
    if (isDefense(a2)) triggerDefenseVisual(anim, "bot2", a2, now);
    // Tactics windup
    if (isTactics(a1)) anim.botOffsets.bot1.y = -3 * t;
    if (isTactics(a2)) anim.botOffsets.bot2.y = -3 * t;
    // Overclock glow
    if (isOverclock(a1)) anim.burstGlow.bot1 = t;
    if (isOverclock(a2)) anim.burstGlow.bot2 = t;
  }
  // ── Phase: Lunge (200-400ms) ──
  else if (elapsed < 400) {
    const t = (elapsed - 200) / 200;
    if (isAttack(a1) || isTactics(a1)) anim.botOffsets.bot1.x = -8 + 38 * t;
    if (isAttack(a2) || isTactics(a2)) anim.botOffsets.bot2.x = 8 - 38 * t;
    if (isOverclock(a1)) anim.botOffsets.bot1.x = -8 + 38 * t;
    if (isOverclock(a2)) anim.botOffsets.bot2.x = 8 - 38 * t;
  }
  // ── Phase: Projectile (350-500ms) ──
  if (elapsed >= 350 && elapsed < 500 && !ta.effectsSpawned) {
    ta.effectsSpawned = true;
    // Bot1 action effects
    spawnActionEffect(anim, a1, c1, c2, b1, b2, "bot1");
    // Bot2 action effects
    spawnActionEffect(anim, a2, c2, c1, b2, b1, "bot2");
  }
  // ── Phase: Impact (450-550ms) ──
  if (elapsed >= 450 && !ta.impactDone) {
    ta.impactDone = true;

    // Bot2 takes damage from bot1's attack
    if (dmg1 > 0) {
      anim.screenShake.intensity = Math.min(15, dmg1 * 0.4);
      spawnHitEffect(
        anim.particles,
        c2.x,
        c2.y,
        getColor(b1),
        Math.min(20, 12 + dmg1),
      );
      anim.screenFlash = { color: getColor(b1), startTime: now, duration: 150 };
    }
    // Bot1 takes damage from bot2's attack
    if (dmg2 > 0) {
      anim.screenShake.intensity = Math.max(
        anim.screenShake.intensity,
        Math.min(15, dmg2 * 0.4),
      );
      spawnHitEffect(
        anim.particles,
        c1.x,
        c1.y,
        getColor(b2),
        Math.min(20, 12 + dmg2),
      );
      if (!anim.screenFlash.color) {
        anim.screenFlash = {
          color: getColor(b2),
          startTime: now,
          duration: 150,
        };
      }
    }

    // Heal effects
    if (a1.behavior === "Self-Repair" || a1.behavior === "Regeneration") {
      spawnHealEffect(anim.particles, c1.x, c1.y);
    }
    if (a2.behavior === "Self-Repair" || a2.behavior === "Regeneration") {
      spawnHealEffect(anim.particles, c2.x, c2.y);
    }

    // Rest energy particles
    if (isRest(a1)) {
      spawnHealEffect(anim.particles, c1.x, c1.y);
    }
    if (isRest(a2)) {
      spawnHealEffect(anim.particles, c2.x, c2.y);
    }
  }
  // ── Phase: Recoil (550-900ms) ──
  else if (elapsed >= 550 && elapsed < 900) {
    const t = (elapsed - 550) / 350;
    // Attacker slides home
    if (isAttack(a1) || isTactics(a1) || isOverclock(a1)) {
      anim.botOffsets.bot1.x = 30 * (1 - t);
    }
    if (isAttack(a2) || isTactics(a2) || isOverclock(a2)) {
      anim.botOffsets.bot2.x = -30 * (1 - t);
    }
    // Defender recoils
    if (dmg2 > 0) anim.botOffsets.bot1.x += -6 * (1 - t);
    if (dmg1 > 0) anim.botOffsets.bot2.x += 6 * (1 - t);

    // Decay effects
    anim.burstGlow.bot1 *= 0.95;
    anim.burstGlow.bot2 *= 0.95;
    anim.dodgeGhost.bot1 *= 0.9;
    anim.dodgeGhost.bot2 *= 0.9;
  }
  // ── Phase: Resolve (900-1200ms) ──
  else if (elapsed >= 900 && elapsed < 1200) {
    if (!ta.dmgNumbersSpawned) {
      ta.dmgNumbersSpawned = true;
      // Damage numbers
      if (dmg1 > 0) {
        anim.damageNumbers.push({
          x: c2.x,
          y: c2.y - 20,
          damage: dmg1,
          startTime: now,
          color: "#ff0040",
        });
      } else if (isAttack(a1) && dmg1 === 0) {
        const blocked = isDefense(a2);
        anim.damageNumbers.push({
          x: c2.x,
          y: c2.y - 20,
          damage: 0,
          startTime: now,
          color: "#00d4ff",
          text: blocked ? "BLOCKED" : "DODGED",
        });
      }
      if (dmg2 > 0) {
        anim.damageNumbers.push({
          x: c1.x,
          y: c1.y - 20,
          damage: dmg2,
          startTime: now,
          color: "#ff0040",
        });
      } else if (isAttack(a2) && dmg2 === 0) {
        const blocked = isDefense(a1);
        anim.damageNumbers.push({
          x: c1.x,
          y: c1.y - 20,
          damage: 0,
          startTime: now,
          color: "#00d4ff",
          text: blocked ? "BLOCKED" : "DODGED",
        });
      }
    }

    // Settle to idle
    const t = (elapsed - 900) / 300;
    anim.botOffsets.bot1.x *= 1 - t;
    anim.botOffsets.bot1.y *= 1 - t;
    anim.botOffsets.bot2.x *= 1 - t;
    anim.botOffsets.bot2.y *= 1 - t;
    anim.burstGlow.bot1 *= 1 - t;
    anim.burstGlow.bot2 *= 1 - t;
  }
  // ── Done ──
  else if (elapsed >= 1200) {
    ta.phase = "idle";
    anim.botOffsets.bot1.x = 0;
    anim.botOffsets.bot1.y = 0;
    anim.botOffsets.bot2.x = 0;
    anim.botOffsets.bot2.y = 0;
    anim.burstGlow.bot1 = 0;
    anim.burstGlow.bot2 = 0;
  }
}

// ── Defense visual trigger ──

function triggerDefenseVisual(anim, botKey, action, now) {
  if (anim.activeShields[botKey]) return; // already set this turn

  const b = action.behavior;
  if (b === "Shield Wall") {
    anim.activeShields[botKey] = { layers: 1, startTime: now };
  } else if (b === "Fortress Mode") {
    anim.activeShields[botKey] = { layers: 3, startTime: now };
  } else if (b === "Counter-Attack") {
    anim.activeShields[botKey] = { layers: 1, startTime: now };
  } else if (b === "Predict & Parry") {
    anim.activeShields[botKey] = { layers: 1, startTime: now };
  } else if (b === "Dodge Matrix") {
    anim.dodgeGhost[botKey] = 1;
    // Teleport offset
    anim.botOffsets[botKey].y = (Math.random() > 0.5 ? -1 : 1) * 15;
  } else if (b === "Regeneration") {
    // No shield, heal effect handled at impact
  }
}

// ── Spawn action-specific effects ──

function spawnActionEffect(
  anim,
  action,
  fromCenter,
  toCenter,
  attacker,
  defender,
  botKey,
) {
  if (!action || action.module === "REST") return;

  const elColor =
    attacker.element && ELEMENTS[attacker.element]
      ? ELEMENTS[attacker.element].color
      : "#ff0040";

  // ATTACK behaviors
  if (action.module === "ATTACK") {
    if (action.behavior === "Brute Force") {
      spawnProjectile(anim.effects, fromCenter, toCenter, "#ff0040", {
        type: "block",
        size: 8,
        speed: 5,
        trailColor: "#ff004080",
      });
    } else if (action.behavior === "Precision Strike") {
      spawnProjectile(anim.effects, fromCenter, toCenter, elColor, {
        type: "beam",
        width: 2,
      });
    } else if (action.behavior === "Multi-Target") {
      spawnProjectile(
        anim.effects,
        fromCenter,
        { x: toCenter.x, y: toCenter.y - 10 },
        "#ff0040",
        {
          type: "block",
          size: 4,
          speed: 6,
        },
      );
      // Second projectile slightly delayed via offset
      spawnProjectile(
        anim.effects,
        { x: fromCenter.x, y: fromCenter.y + 5 },
        { x: toCenter.x, y: toCenter.y + 10 },
        "#ff0040",
        {
          type: "block",
          size: 4,
          speed: 4.5,
        },
      );
    } else if (action.behavior === "Critical Hit") {
      spawnProjectile(anim.effects, fromCenter, toCenter, "#ffffff", {
        type: "block",
        size: 8,
        speed: 5,
        trailColor: "#ff0040",
      });
    } else if (action.behavior === "Overload Strike") {
      spawnProjectile(anim.effects, fromCenter, toCenter, elColor, {
        type: "beam",
        width: 5,
        pulseRate: 0.03,
      });
    } else {
      // Fallback attack
      spawnProjectile(anim.effects, fromCenter, toCenter, "#ff0040", {
        type: "block",
        size: 5,
        speed: 5,
      });
    }
  }

  // TACTICS behaviors
  if (action.module === "TACTICS") {
    if (action.behavior === "Feint") {
      // Quick lunge handled by sequencer; spawn "?" on opponent
      anim.particles.push(
        createParticle({
          x: toCenter.x,
          y: toCenter.y - 30,
          text: "?",
          fontSize: 14,
          color: "#ffb000",
          lifetime: 600,
          vx: 0,
          vy: -0.5,
        }),
      );
    } else if (action.behavior === "Energy Drain") {
      // Lightning arc from opponent to self
      anim.effects.push({
        type: "lightning",
        from: { ...toCenter },
        to: { ...fromCenter },
        color: "#ffb000",
        progress: 0,
        duration: 400,
        alive: true,
        trail: [],
      });
    } else if (action.behavior === "Predict & Parry") {
      // Shield handled in defense visual
      anim.activeShields[botKey] = { layers: 1, startTime: performance.now() };
    } else if (
      action.behavior === "Pattern Recognition" ||
      action.behavior === "Priority Targeting"
    ) {
      // Scan line on opponent
      anim.effects.push({
        type: "scanline",
        from: { x: toCenter.x - 25, y: toCenter.y - 30 },
        to: { x: toCenter.x + 25, y: toCenter.y + 30 },
        color: "#ffb000",
        progress: 0,
        duration: 500,
        alive: true,
        trail: [],
      });
    }
  }

  // OVERCLOCK behaviors
  if (action.module === "OVERCLOCK") {
    if (action.behavior === "Burst Mode") {
      anim.burstGlow[botKey] = 1;
    } else if (action.behavior === "Self-Repair") {
      // Heal handled at impact
    } else if (action.behavior === "EMP") {
      // Purple expanding ring from self
      spawnProjectile(anim.effects, fromCenter, fromCenter, "#c040ff", {
        type: "ring",
      });
    } else if (action.behavior === "Evolve") {
      // Flash through colors
      const colors = ["#ff0040", "#00d4ff", "#ffb000", "#00ff41"];
      colors.forEach((c, i) => {
        setTimeout(() => {
          anim.screenFlash = {
            color: c,
            startTime: performance.now(),
            duration: 80,
          };
        }, i * 80);
      });
    } else if (action.behavior === "Singularity") {
      // Spiral charge + massive beam
      spawnProjectile(anim.effects, fromCenter, toCenter, "#c040ff", {
        type: "beam",
        width: 8,
        pulseRate: 0.05,
      });
      spawnProjectile(anim.effects, fromCenter, fromCenter, "#00ff41", {
        type: "ring",
      });
    }
  }

  // DEFENSE with Counter-Attack — return projectile
  if (action.module === "DEFENSE" && action.behavior === "Counter-Attack") {
    // Delayed counter projectile
    setTimeout(() => {
      spawnProjectile(anim.effects, fromCenter, toCenter, "#00d4ff", {
        type: "block",
        size: 4,
        speed: 6,
      });
    }, 200);
  }
}

// ── Eye blink helper ──

function updateEyeBlink(state, time) {
  if (state.blinking) {
    if (time > state.blinkEnd) {
      state.blinking = false;
      state.nextBlink = time + 3000 + Math.random() * 2000;
    }
  } else if (time > state.nextBlink) {
    state.blinking = true;
    state.blinkEnd = time + 100;
  }
}
