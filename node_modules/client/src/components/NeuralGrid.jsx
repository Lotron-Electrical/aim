import React, { useRef, useEffect } from 'react';
import { MODULES, MODULE_NAMES } from 'shared';

const NODE_RADIUS = 6;
const COLORS = {
  ATTACK: '#ff0040',
  DEFENSE: '#00d4ff',
  TACTICS: '#ffb000',
  OVERCLOCK: '#00ff41',
};

export default function NeuralGrid({ modules }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw background grid
    ctx.strokeStyle = '#1a1a3a';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Center node (core)
    const cx = w / 2;
    const cy = h / 2;

    // Module positions (4 corners)
    const positions = {
      ATTACK:    { x: w * 0.2, y: h * 0.25 },
      DEFENSE:   { x: w * 0.8, y: h * 0.25 },
      TACTICS:   { x: w * 0.2, y: h * 0.75 },
      OVERCLOCK: { x: w * 0.8, y: h * 0.75 },
    };

    // Draw connections from core to modules
    for (const mod of MODULE_NAMES) {
      const pos = positions[mod];
      const level = modules[mod] || 0;
      const color = COLORS[mod];

      if (level === 0) continue;

      // Connection line
      const alpha = 0.2 + (level / 5) * 0.6;
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1 + level * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      // Data flow particles along the line
      const time = Date.now() / 1000;
      for (let i = 0; i < level; i++) {
        const t = ((time * 0.5 + i * 0.2) % 1);
        const px = cx + (pos.x - cx) * t;
        const py = cy + (pos.y - cy) * t;
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Module node
      ctx.globalAlpha = 1;
      const nodeSize = NODE_RADIUS + level * 2;

      // Glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 10 + level * 3;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Level text
      ctx.fillStyle = '#0a0a1a';
      ctx.font = '8px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(level.toString(), pos.x, pos.y);

      // Label
      ctx.fillStyle = color;
      ctx.font = '6px "Press Start 2P"';
      ctx.fillText(mod, pos.x, pos.y + nodeSize + 10);
    }

    // Core node
    ctx.globalAlpha = 1;
    ctx.shadowColor = '#00ff41';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#00ff41';
    ctx.beginPath();
    ctx.arc(cx, cy, NODE_RADIUS + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#0a0a1a';
    ctx.font = '5px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('AI', cx, cy);

  }, [modules]);

  // Animate
  useEffect(() => {
    let frame;
    const animate = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        // Trigger re-render by re-running the draw
        const event = new Event('redraw');
        canvas.dispatchEvent(event);
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="border border-neon-green-dim bg-bg p-2">
      <h3 className="font-pixel text-[8px] text-neon-green mb-2">NEURAL NETWORK</h3>
      <canvas
        ref={canvasRef}
        width={300}
        height={200}
        className="w-full bg-bg"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}
