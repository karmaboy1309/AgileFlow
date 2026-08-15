import { useState, useEffect, useRef } from 'react';
import { tasksAPI } from '../api';
import toast from 'react-hot-toast';

// ─── TaskTemplateSelector ─────────────────────────────────────────────────────
// Allows users to pick from predefined task templates that pre-fill
// title, description, checklist, and default story points.

const BUILT_IN_TEMPLATES = [
  {
    id: 'bug-report',
    name: '🐛 Bug Report',
    category: 'Engineering',
    issueType: 'bug',
    priority: 'high',
    storyPoints: 3,
    title: 'Bug: [Brief description]',
    description: `## Summary\n[Describe the bug briefly]\n\n## Steps to Reproduce\n1. Go to…\n2. Click…\n3. See error\n\n## Expected Behavior\n[What should happen]\n\n## Actual Behavior\n[What actually happens]\n\n## Environment\n- Browser: \n- OS: \n- Version: `,
    tags: ['bug', 'needs-triage'],
  },
  {
    id: 'feature-request',
    name: '✨ Feature Request',
    category: 'Product',
    issueType: 'story',
    priority: 'medium',
    storyPoints: 5,
    title: 'Feature: [Feature name]',
    description: `## User Story\nAs a [user type], I want [goal] so that [reason].\n\n## Acceptance Criteria\n- [ ] Criterion 1\n- [ ] Criterion 2\n- [ ] Criterion 3\n\n## Technical Notes\n[Any relevant implementation details]\n\n## Design Reference\n[Link to design mockup if available]`,
    tags: ['feature', 'needs-design'],
  },
  {
    id: 'code-review',
    name: '👀 Code Review',
    category: 'Engineering',
    issueType: 'task',
    priority: 'medium',
    storyPoints: 1,
    title: 'Review: [PR/Branch name]',
    description: `## What to Review\n- [ ] Code quality and readability\n- [ ] Test coverage\n- [ ] Security considerations\n- [ ] Performance impact\n- [ ] Documentation updates\n\n## PR Link\n[Link to pull request]\n\n## Review Deadline\n[Date]`,
    tags: ['review'],
  },
  {
    id: 'ui-component',
    name: '🎨 UI Component',
    category: 'Design',
    issueType: 'task',
    priority: 'medium',
    storyPoints: 3,
    title: 'UI: Build [Component name] component',
    description: `## Component Overview\n[Brief description of the component]\n\n## States to Implement\n- [ ] Default\n- [ ] Hover\n- [ ] Active/Selected\n- [ ] Disabled\n- [ ] Loading\n- [ ] Error\n\n## Props Interface\n\`\`\`\n// props here\n\`\`\`\n\n## Accessibility\n- [ ] ARIA labels\n- [ ] Keyboard navigation\n- [ ] Color contrast`,
    tags: ['ui', 'frontend'],
  },
  {
    id: 'api-endpoint',
    name: '🔌 API Endpoint',
    category: 'Engineering',
    issueType: 'task',
    priority: 'medium',
    storyPoints: 3,
    title: 'API: [METHOD] /api/[resource]',
    description: `## Endpoint\n\`[GET|POST|PUT|DELETE] /api/\`\n\n## Request\n\`\`\`json\n{\n  // body schema\n}\n\`\`\`\n\n## Response\n\`\`\`json\n{\n  // response schema\n}\n\`\`\`\n\n## Implementation Checklist\n- [ ] Route handler\n- [ ] Input validation\n- [ ] Authentication/authorization\n- [ ] Unit tests\n- [ ] API documentation`,
    tags: ['backend', 'api'],
  },
  {
    id: 'performance',
    name: '⚡ Performance Task',
    category: 'Engineering',
    issueType: 'task',
    priority: 'high',
    storyPoints: 5,
    title: 'Perf: Optimize [area]',
    description: `## Performance Issue\n[Describe the performance problem]\n\n## Current Metrics\n- Load time: \n- Lighthouse score: \n\n## Target Metrics\n- Load time: \n- Lighthouse score: \n\n## Proposed Solution\n[Technical approach]\n\n## Verification\n- [ ] Profile before\n- [ ] Implement changes\n- [ ] Profile after\n- [ ] Document improvement`,
    tags: ['performance', 'optimization'],
  },
];

export default function TaskTemplateSelector({ isOpen, onClose, onSelect }) {
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState('All');
  const [preview, setPreview]     = useState(null);

  if (!isOpen) return null;

  const categories = ['All', ...new Set(BUILT_IN_TEMPLATES.map(t => t.category))];
  const filtered = BUILT_IN_TEMPLATES.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase());
    const matchCat    = category === 'All' || t.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="tts-modal">
        <div className="tts-header">
          <h2 className="tts-title">Task Templates</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Search + Category */}
        <div className="tts-controls">
          <input className="tts-search" placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="tts-categories">
            {categories.map(cat => (
              <button key={cat} className={`tts-cat-btn ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>{cat}</button>
            ))}
          </div>
        </div>

        <div className="tts-body">
          {/* Template grid */}
          <div className="tts-grid">
            {filtered.map(tpl => (
              <div
                key={tpl.id}
                className={`tts-card ${preview?.id === tpl.id ? 'selected' : ''}`}
                onClick={() => setPreview(tpl)}
              >
                <div className="tts-card-name">{tpl.name}</div>
                <div className="tts-card-cat">{tpl.category}</div>
                <div className="tts-card-meta">
                  <span className="tts-meta-badge">{tpl.issueType}</span>
                  <span className="tts-meta-pts">{tpl.storyPoints} pts</span>
                </div>
                {tpl.tags?.length > 0 && (
                  <div className="tts-tags">
                    {tpl.tags.map(tag => <span key={tag} className="tts-tag">{tag}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Preview pane */}
          {preview && (
            <div className="tts-preview">
              <div className="tts-preview-title">{preview.name}</div>
              <div className="tts-preview-field"><strong>Type:</strong> {preview.issueType}</div>
              <div className="tts-preview-field"><strong>Priority:</strong> {preview.priority}</div>
              <div className="tts-preview-field"><strong>Points:</strong> {preview.storyPoints}</div>
              <div className="tts-preview-desc">
                <strong>Description Preview:</strong>
                <pre className="tts-preview-pre">{preview.description}</pre>
              </div>
              <button className="btn btn-primary tts-use-btn" onClick={() => { onSelect(preview); onClose(); }}>
                Use This Template →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
