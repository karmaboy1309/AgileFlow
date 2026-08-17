import { useEffect, useRef } from 'react';

export default function TimeTrackingHeatmap({ logs }) {
  const canvasRef = useRef(null);

  const draw = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Group logs by day of week (0 = Sun, 6 = Sat)
    const dayHours = Array(7).fill(0);
    logs?.forEach(log => {
      const day = new Date(log.startDate).getDay();
      dayHours[day] += log.timeSpentHours || 0;
    });

    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const maxVal = Math.max(...dayHours, 1);

    dayNames.forEach((name, idx) => {
      const hrs = dayHours[idx];
      const intensity = Math.min(1, hrs / maxVal);
      const x = 35 + idx * 58;
      
      // Color cell based on intensity
      ctx.fillStyle = `rgba(99, 102, 241, ${0.1 + intensity * 0.9})`;
      ctx.beginPath();
      ctx.roundRect(x, 60, 48, 48, 8);
      ctx.fill();

      if (intensity > 0.4) {
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Day label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(name, x + 24, 125);

      // Hour count inside cell
      ctx.fillStyle = intensity > 0.5 ? '#ffffff' : '#e2e8f0';
      ctx.font = 'bold 11px Inter,sans-serif';
      ctx.fillText(`${hrs.toFixed(1)}h`, x + 24, 88);
    });

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 12px Inter,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Weekly Time-Tracking Heatmap Calendar', W / 2, 25);
  };

  useEffect(() => { draw(); }, [logs]);

  return (
    <div className="time-heatmap-card">
      <canvas ref={canvasRef} width={450} height={150} style={{ width: '100%', display: 'block', borderRadius: '0.5rem' }} />
    </div>
  );
}
