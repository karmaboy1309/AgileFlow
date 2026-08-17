import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

export default function PredictiveForecastChart({ projectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);
  const token = localStorage.getItem('agileflow_token');

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetch(`/api/predictions/project-completion/${projectId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setData(d);
        draw(d);
      })
      .catch(() => toast.error('Failed to load predictions'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const draw = (predData) => {
    if (!canvasRef.current || !predData) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    const metrics = predData.metrics;
    const proj = predData.projections;

    // Draw reference line
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, H - 40);
    ctx.lineTo(W - 50, H - 40);
    ctx.stroke();

    // Draw projections as bars/steps
    const targets = [
      { label: 'Optimistic', val: proj.optimistic.sprints, color: '#10b981' },
      { label: 'Most Likely', val: proj.mostLikely.sprints, color: '#6366f1' },
      { label: 'Pessimistic', val: proj.pessimistic.sprints, color: '#ef4444' },
    ];

    targets.forEach((t, idx) => {
      const x = 100 + idx * 120;
      const height = (t.val / 20) * (H - 80);
      
      // Bar
      ctx.fillStyle = t.color + '22';
      ctx.fillRect(x, H - 40 - height, 60, height);
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, H - 40 - height, 60, height);

      // Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.label, x + 30, H - 20);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(`${t.val} sprints`, x + 30, H - 40 - height - 10);
    });

    // Title
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 12px Inter,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Project Completion Estimation Forecast', W / 2, 25);
  };

  useEffect(() => { if (data) draw(data); }, [data]);

  return (
    <div className="forecast-chart-card">
      {loading ? <p>Calculating completions...</p> : (
        <canvas ref={canvasRef} width={450} height={220} style={{ width: '100%', display: 'block', borderRadius: '0.5rem' }} />
      )}
    </div>
  );
}
