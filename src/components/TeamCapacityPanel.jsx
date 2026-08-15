// ─── TeamCapacityPanel ────────────────────────────────────────────────────────
// Displays per-member sprint load distribution as a visual capacity bar chart
// with completion rates, task counts, and story point breakdowns.

export default function TeamCapacityPanel({ members = [], compact = false }) {
  if (!members || members.length === 0) {
    return (
      <div className="capacity-empty">
        <div className="capacity-empty-icon">👥</div>
        <p>No team members assigned to this sprint.</p>
      </div>
    );
  }

  const maxPoints = Math.max(...members.map(m => m.points), 1);

  return (
    <div className={`capacity-panel ${compact ? 'compact' : ''}`}>
      {!compact && (
        <div className="capacity-header">
          <h3>Team Capacity</h3>
          <span className="capacity-subtitle">{members.length} members</span>
        </div>
      )}

      <div className="capacity-grid">
        {members.map((member) => {
          const loadColor = member.loadPercent > 80
            ? '#ef4444'
            : member.loadPercent > 60
            ? '#f59e0b'
            : '#10b981';

          return (
            <div key={member.userId || member.name} className="capacity-member">
              {/* Avatar + Name */}
              <div className="capacity-member-info">
                <div className="capacity-avatar" style={{ background: member.avatarColor || '#6366f1' }}>
                  {member.name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="capacity-member-details">
                  <div className="capacity-member-name">{member.name}</div>
                  {!compact && (
                    <div className="capacity-member-meta">
                      {member.tasks} tasks · {member.points} pts
                    </div>
                  )}
                </div>
              </div>

              {/* Load bar */}
              <div className="capacity-bar-wrapper">
                <div className="capacity-bar-track">
                  <div
                    className="capacity-bar-fill"
                    style={{
                      width: `${member.loadPercent}%`,
                      background: `linear-gradient(90deg, ${loadColor}99, ${loadColor})`,
                    }}
                  />
                </div>
                <span className="capacity-bar-percent" style={{ color: loadColor }}>
                  {member.loadPercent}%
                </span>
              </div>

              {/* Completion mini-bar */}
              {!compact && (
                <div className="capacity-completion">
                  <div className="capacity-completion-track">
                    <div
                      className="capacity-completion-fill"
                      style={{ width: `${member.completionRate}%` }}
                    />
                  </div>
                  <span className="capacity-completion-label">{member.completionRate}% done</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!compact && (
        <div className="capacity-legend">
          <span className="capacity-legend-item low">● Low load</span>
          <span className="capacity-legend-item medium">● Normal</span>
          <span className="capacity-legend-item high">● Over-allocated</span>
        </div>
      )}
    </div>
  );
}
