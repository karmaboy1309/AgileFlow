import { useEffect, useRef } from 'react';

export default function TeamRadarChart({ data }) {
  const canvasRef = useRef(null);

  const draw = () => {
    if (!canvasRef.current || !data?.length) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const radius = Math.min(W, H) / 2 - 40;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    const metrics = ['velocity', 'throughput', 'efficiency', 'quality', 'speed'];
    const numMetrics = metrics.length;

    // Draw concentric pentagons
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let r = 1; r <= 4; r++) {
      const curRadius = (r / 4) * radius;
      ctx.beginPath();
      for (let i = 0; i < numMetrics; i++) {
        const angle = (i * 2 * Math.PI) / numMetrics - Math.PI / 2;
        const x = cx + curRadius * Math.cos(angle);
        const y = cy + curRadius * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Draw axis lines and labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter,sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < numMetrics; i++) {
      const angle = (i * 2 * Math.PI) / numMetrics - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Label positioning offset
      const lx = cx + (radius + 20) * Math.cos(angle);
      const ly = cx + (radius + 15) * Math.sin(angle);
      ctx.fillText(metrics[i].toUpperCase(), lx, ly);
    }

    // Draw user polygons
    const COLORS = ['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'];
    data.forEach((user, uIdx) => {
      const color = COLORS[uIdx % COLORS.length];
      ctx.beginPath();
      for (let i = 0; i < numMetrics; i++) {
        const val = user[metrics[i]] || 5; // fallback simulated value
        const normalized = Math.min(10, val) / 10;
        const angle = (i * 2 * Math.PI) / numMetrics - Math.PI / 2;
        const x = cx + normalized * radius * Math.cos(angle);
        const y = cy + normalized * radius * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = color + '15';
      ctx.fill();
    });

    // Legend
    ctx.font = '10px Inter,sans-serif';
    ctx.textAlign = 'left';
    data.forEach((user, idx) => {
      const color = COLORS[idx % COLORS.length];
      ctx.fillStyle = color;
      ctx.fillRect(15, 15 + idx * 15, 8, 8);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(user.name, 28, 23 + idx * 15);
    });
  };

  useEffect(() => { draw(); }, [data]);

  return (
    <div className="radar-chart-card">
      <canvas ref={canvasRef} width={450} height={250} style={{ width: '100%', display: 'block', borderRadius: '0.5rem' }} />
    </div>
  );
}
