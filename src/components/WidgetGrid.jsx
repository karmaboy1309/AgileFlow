import { useState } from 'react';

const AVAILABLE_WIDGETS = [
  { id: 'capacity', name: '👥 Team Capacity', defaultVisible: true },
  { id: 'worklogs', name: '⏱️ Time Tracking Summary', defaultVisible: true },
  { id: 'predictions', name: '🔮 Predictive Completion Forecast', defaultVisible: true },
  { id: 'overdue', name: '🚨 Overdue Tasks Queue', defaultVisible: true },
];

export default function WidgetGrid({ children }) {
  const [visibleWidgets, setVisibleWidgets] = useState(
    AVAILABLE_WIDGETS.filter(w => w.defaultVisible).map(w => w.id)
  );
  const [showConfig, setShowConfig] = useState(false);

  const toggleWidget = (id) => {
    setVisibleWidgets(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };

  return (
    <div className="wg-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="wg-controls" style={{ display: 'flex', justifyContent: 'flex-end', position: 'relative' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowConfig(c => !c)}>
          ⚙️ Customize Dashboard Widgets
        </button>
        {showConfig && (
          <div className="wg-dropdown" style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--theme-surface)', border: '1px solid var(--theme-border)', borderRadius: '0.5rem', padding: '0.75rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.5rem', boxShadow: '0 8px 20px rgba(0,0,0,0.3)', width: '220px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--theme-text-muted)', textTransform: 'uppercase' }}>Visible Widgets</span>
            {AVAILABLE_WIDGETS.map(w => (
              <label key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--theme-text)' }}>
                <input type="checkbox" checked={visibleWidgets.includes(w.id)} onChange={() => toggleWidget(w.id)} />
                {w.name}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="wg-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '1.5rem' }}>
        {children.map(child => {
          if (!child || !visibleWidgets.includes(child.props.widgetId)) return null;
          return (
            <div key={child.props.widgetId} className="wg-widget-card" style={{ background: 'var(--theme-card)', border: '1px solid var(--theme-border)', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {child}
            </div>
          );
        })}
      </div>
    </div>
  );
}
