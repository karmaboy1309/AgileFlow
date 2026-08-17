import { useEffect, useRef } from 'react';

export default function IssueAgeHistogram({ bins }) {
  const canvasRef = useRef(null);

  const draw = () => {
    if (!canvasRef.current || !bins) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    const keys = Object.keys(bins);
    const vals = Object.values(bins);
    const maxVal = Math.max(...vals, 1);

    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(50, H - 40);
    ctx.lineTo(W - 30, H - 40);
    ctx.stroke();

    const colors = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#ef4444'];

    keys.forEach((key, idx) => {
      const val = bins[key];
      const barH = (val / maxVal) * (H - 80);
      const x = 60 + idx * 75;
      
      // Bar drawing
      ctx.fillStyle = colors[idx] + '22';
      ctx.fillRect(x, H - 40 - barH, 45, barH);
      ctx.strokeStyle = colors[idx];
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, H - 40 - barH, 45, barH);

      // Label below bar
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(key, x + 22, H - 20);

      // Counter inside or above bar
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px Inter,sans-serif';
      ctx.fillText(String(val), x + 22, H - 40 - barH - 8);
    });

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 12px Inter,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Issue Age Distribution (SLA Alert zones)', W / 2, 25);
  };

  useEffect(() => { draw(); }, [bins]);

  return (
    <div className="age-histogram-card">
      <canvas ref={canvasRef} width={450} height={200} style={{ width: '100%', display: 'block', borderRadius: '0.5rem' }} />
    </div>
  );
}
