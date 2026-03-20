// battleAnimations.js — particle system, projectile factory, drawing utilities

// ── Particle factory ──

export function createParticle({
  x,
  y,
  vx = 0,
  vy = 0,
  gravity = 0,
  size = 3,
  color = "#ff0040",
  lifetime = 600,
  alpha = 1,
  decay = true,
  shape = "square",
  text = null,
  fontSize = 10,
  shrink = false,
}) {
  return {
    x,
    y,
    vx,
    vy,
    gravity,
    size,
    color,
    lifetime,
    maxLifetime: lifetime,
    alpha,
    decay,
    shape,
    text,
    fontSize,
    shrink,
    age: 0,
    alive: true,
  };
}

export function updateParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    if (p.age >= p.lifetime) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * (dt / 16);
    p.y += p.vy * (dt / 16);
    p.vy += p.gravity * (dt / 16);
    if (p.decay) {
      p.alpha = Math.max(0, 1 - p.age / p.lifetime);
    }
    if (p.shrink) {
      p.size = p.size * (1 - p.age / p.lifetime);
    }
  }
  // Cap at 100
  if (particles.length > 100) particles.splice(0, particles.length - 100);
}

export function drawParticles(ctx, particles) {
  for (const p of particles) {
    if (!p.alive && p.age >= p.lifetime) continue;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    if (p.text) {
      ctx.fillStyle = p.color;
      ctx.font = `${p.fontSize}px monospace`;
      ctx.fillText(p.text, p.x, p.y);
    } else if (p.shape === "circle") {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }
}

// ── Hit effects ──

export function spawnHitEffect(particles, x, y, color, count = 15) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 1.5 + Math.random() * 3;
    particles.push(
      createParticle({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 0.08,
        size: 2 + Math.random() * 3,
        color,
        lifetime: 400 + Math.random() * 300,
        shrink: true,
      }),
    );
  }
}

export function spawnHealEffect(particles, x, y) {
  for (let i = 0; i < 10; i++) {
    particles.push(
      createParticle({
        x: x + (Math.random() - 0.5) * 30,
        y: y + Math.random() * 20,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.8 - Math.random() * 1.2,
        size: 2 + Math.random() * 2,
        color: "#00ff41",
        lifetime: 600 + Math.random() * 400,
        shape: "circle",
        shrink: true,
      }),
    );
  }
}

// ── Projectile / active effect factory ──

export function spawnProjectile(effects, from, to, color, config = {}) {
  const {
    type = "block", // block, beam, multi, ring, lightning
    size = 6,
    speed = 6, // px per frame
    trailColor = null,
    width = 2,
    pulseRate = 0,
  } = config;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const duration = type === "beam" ? 200 : (dist / speed) * 16;

  effects.push({
    type,
    from: { ...from },
    to: { ...to },
    color,
    size,
    width,
    trailColor: trailColor || color,
    progress: 0,
    duration,
    alive: true,
    pulseRate,
    trail: [],
  });
}

export function updateEffects(effects, dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.progress += dt;
    if (e.progress >= e.duration) {
      effects.splice(i, 1);
      continue;
    }
    // Store trail positions for block projectiles
    if (e.type === "block" || e.type === "multi") {
      const t = Math.min(1, e.progress / e.duration);
      const cx = e.from.x + (e.to.x - e.from.x) * t;
      const cy = e.from.y + (e.to.y - e.from.y) * t;
      e.trail.push({ x: cx, y: cy, age: 0 });
      if (e.trail.length > 8) e.trail.shift();
    }
  }
}

export function drawEffects(ctx, effects, time) {
  for (const e of effects) {
    const t = Math.min(1, e.progress / e.duration);
    ctx.save();

    if (e.type === "block" || e.type === "multi") {
      // Draw trail
      for (let i = 0; i < e.trail.length; i++) {
        const tr = e.trail[i];
        ctx.globalAlpha = (i / e.trail.length) * 0.4;
        ctx.fillStyle = e.trailColor;
        const s = e.size * (i / e.trail.length);
        ctx.fillRect(tr.x - s / 2, tr.y - s / 2, s, s);
      }
      // Draw projectile
      const cx = e.from.x + (e.to.x - e.from.x) * t;
      const cy = e.from.y + (e.to.y - e.from.y) * t;
      ctx.globalAlpha = 1;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = e.color;
      ctx.fillRect(cx - e.size / 2, cy - e.size / 2, e.size, e.size);
    } else if (e.type === "beam") {
      const alpha = t < 0.3 ? t / 0.3 : t > 0.7 ? (1 - t) / 0.3 : 1;
      ctx.globalAlpha = alpha * 0.8;
      ctx.strokeStyle = e.color;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 10;
      const w = e.width + (e.pulseRate ? Math.sin(time * e.pulseRate) * 2 : 0);
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(e.from.x, e.from.y);
      ctx.lineTo(e.to.x, e.to.y);
      ctx.stroke();
      // Bright center line
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(e.from.x, e.from.y);
      ctx.lineTo(e.to.x, e.to.y);
      ctx.stroke();
    } else if (e.type === "ring") {
      const radius = t * 120;
      ctx.globalAlpha = (1 - t) * 0.6;
      ctx.strokeStyle = e.color;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.from.x, e.from.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.type === "lightning") {
      ctx.globalAlpha = (1 - t) * 0.8;
      drawLightningArc(ctx, e.from, e.to, e.color, e.progress);
    } else if (e.type === "scanline") {
      // Horizontal scan line sweeping vertically
      const scanY = e.from.y + (e.to.y - e.from.y) * t;
      ctx.globalAlpha = (1 - t) * 0.7;
      ctx.strokeStyle = e.color;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 6;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(e.from.x, scanY);
      ctx.lineTo(e.to.x, scanY);
      ctx.stroke();
      // Crosshair at center
      const cx = (e.from.x + e.to.x) / 2;
      ctx.beginPath();
      ctx.arc(cx, scanY, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Drawing utilities ──

export function drawDamageNumber(ctx, x, y, damage, elapsed, color) {
  const t = Math.min(1, elapsed / 800);
  const yOff = -t * 40;
  const alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
  const size = damage > 15 ? 14 : damage > 8 ? 12 : 10;
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = "center";
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.fillText(damage > 0 ? `-${damage}` : "MISS", x, y + yOff);
  ctx.restore();
}

export function drawBlockText(ctx, x, y, text, elapsed, color = "#00d4ff") {
  const t = Math.min(1, elapsed / 800);
  const yOff = -t * 35;
  const alpha = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5;
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.fillStyle = color;
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.shadowColor = color;
  ctx.shadowBlur = 4;
  ctx.fillText(text, x, y + yOff);
  ctx.restore();
}

export function drawShield(ctx, x, y, w, h, time, layers = 1) {
  for (let i = 0; i < layers; i++) {
    const expand = i * 6;
    const alpha = 0.15 + Math.sin(time * 0.005 + i) * 0.05;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#00d4ff";
    ctx.shadowColor = "#00d4ff";
    ctx.shadowBlur = 6 + i * 2;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      x - expand - 2,
      y - expand - 2,
      w + expand * 2 + 4,
      h + expand * 2 + 4,
    );
    ctx.restore();
  }
}

export function drawBeam(ctx, from, to, color, width, time) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.lineWidth = width + Math.sin(time * 0.01) * 1;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  // White core
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

export function drawLightningArc(ctx, from, to, color, time) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.8;

  const segments = 8;
  const dx = (to.x - from.x) / segments;
  const dy = (to.y - from.y) / segments;

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  for (let i = 1; i < segments; i++) {
    const jitter = (Math.random() - 0.5) * 20;
    ctx.lineTo(from.x + dx * i + jitter, from.y + dy * i + jitter * 0.5);
  }
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

// ── Action parser ──

export function parseAction(actionStr) {
  if (!actionStr || actionStr === "REST")
    return { module: "REST", behavior: "Rest" };
  const dot = actionStr.indexOf(".");
  if (dot === -1) return { module: actionStr, behavior: null };
  return {
    module: actionStr.substring(0, dot),
    behavior: actionStr.substring(dot + 1),
  };
}

// ── Ambient particles ──

export function spawnAmbientParticle(particles, w, h) {
  particles.push(
    createParticle({
      x: Math.random() * w,
      y: h * 0.8 + Math.random() * h * 0.2,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -0.2 - Math.random() * 0.3,
      size: 1 + Math.random(),
      color: "#1a1a3a",
      lifetime: 3000 + Math.random() * 2000,
      shape: "circle",
      alpha: 0.3,
      decay: true,
    }),
  );
}
