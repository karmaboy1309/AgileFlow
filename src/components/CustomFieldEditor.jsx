import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// ─── CustomFieldEditor ────────────────────────────────────────────────────────
// UI for managing per-project custom field definitions: create, reorder,
// archive. Supports all field types with validation rule configuration.

const FIELD_TYPES = [
  { value: 'text',         label: '📝 Text',         desc: 'Single-line text' },
  { value: 'textarea',     label: '📄 Long Text',    desc: 'Multi-line text area' },
  { value: 'number',       label: '🔢 Number',       desc: 'Numeric value with optional min/max' },
  { value: 'date',         label: '📅 Date',         desc: 'Date picker' },
  { value: 'select',       label: '🔽 Select',       desc: 'Single choice from options' },
  { value: 'multi_select', label: '☑️ Multi-Select', desc: 'Multiple choices from options' },
  { value: 'user',         label: '👤 User',         desc: 'Assignee picker' },
  { value: 'url',          label: '🔗 URL',          desc: 'Web link with validation' },
  { value: 'boolean',      label: '✅ Checkbox',     desc: 'True/false toggle' },
];

const EMPTY_FORM = { name: '', key: '', fieldType: 'text', description: '', isRequired: false, displayInList: true, options: [], validation: {} };

function generateKey(name) {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 40);
}

export default function CustomFieldEditor({ projectId }) {
  const [fields, setFields]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [newOption, setNewOption] = useState('');
  const [saving, setSaving]     = useState(false);
  const token = localStorage.getItem('agileflow_token');

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/custom-fields?projectId=${projectId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setFields(data.fields || []);
    } catch { toast.error('Failed to load custom fields'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.fieldType) return;
    setSaving(true);
    try {
      const res = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, project: projectId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      toast.success('Custom field created');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleArchive = async (id) => {
    if (!confirm('Archive this custom field? It will no longer appear on tasks.')) return;
    await fetch(`/api/custom-fields/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    toast.success('Custom field archived');
    await load();
  };

  const addOption = () => {
    const opt = newOption.trim();
    if (!opt) return;
    setForm(f => ({ ...f, options: [...f.options, { label: opt, value: opt.toLowerCase().replace(/\s+/g, '_') }] }));
    setNewOption('');
  };

  const removeOption = (idx) => setForm(f => ({ ...f, options: f.options.filter((_, i) => i !== idx) }));

  const TYPE_ICONS = { text: '📝', textarea: '📄', number: '🔢', date: '📅', select: '🔽', multi_select: '☑️', user: '👤', url: '🔗', boolean: '✅' };

  return (
    <div className="cfe-panel">
      <div className="cfe-header">
        <div>
          <h3 className="cfe-title">Custom Fields</h3>
          <p className="cfe-subtitle">Add custom data fields to all tasks in this project</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(v => !v)}>
          {showCreate ? 'Cancel' : '+ Add Field'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form className="cfe-create-form" onSubmit={handleCreate}>
          <div className="cfe-row">
            <div className="cfe-field">
              <label className="cfe-label">Field Name *</label>
              <input className="cfe-input" placeholder="e.g. Customer Region" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value, key: generateKey(e.target.value) }))} required />
            </div>
            <div className="cfe-field">
              <label className="cfe-label">Field Key</label>
              <input className="cfe-input cfe-key" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} />
            </div>
          </div>

          <div className="cfe-type-grid">
            {FIELD_TYPES.map(t => (
              <div key={t.value} className={`cfe-type-card ${form.fieldType === t.value ? 'selected' : ''}`} onClick={() => setForm(f => ({ ...f, fieldType: t.value }))}>
                <span className="cfe-type-icon">{t.label.split(' ')[0]}</span>
                <span className="cfe-type-name">{t.label.split(' ').slice(1).join(' ')}</span>
              </div>
            ))}
          </div>

          {['select', 'multi_select'].includes(form.fieldType) && (
            <div className="cfe-options">
              <label className="cfe-label">Options</label>
              <div className="cfe-options-list">
                {form.options.map((opt, i) => (
                  <div key={i} className="cfe-option-item">
                    <span>{opt.label}</span>
                    <button type="button" className="cfe-option-remove" onClick={() => removeOption(i)}>✕</button>
                  </div>
                ))}
              </div>
              <div className="cfe-option-add-row">
                <input className="cfe-input" placeholder="Option label…" value={newOption} onChange={e => setNewOption(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())} />
                <button type="button" className="btn btn-secondary btn-sm" onClick={addOption}>Add</button>
              </div>
            </div>
          )}

          <div className="cfe-checkboxes">
            <label className="cfe-checkbox-label">
              <input type="checkbox" checked={form.isRequired} onChange={e => setForm(f => ({ ...f, isRequired: e.target.checked }))} /> Required field
            </label>
            <label className="cfe-checkbox-label">
              <input type="checkbox" checked={form.displayInList} onChange={e => setForm(f => ({ ...f, displayInList: e.target.checked }))} /> Show in task list
            </label>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Field'}</button>
        </form>
      )}

      {/* Fields list */}
      <div className="cfe-list">
        {loading && <div className="cfe-loading">Loading fields…</div>}
        {!loading && fields.length === 0 && !showCreate && (
          <div className="cfe-empty"><div className="cfe-empty-icon">🔧</div><p>No custom fields yet. Add one to extend task data for this project.</p></div>
        )}
        {fields.map(field => (
          <div key={field._id} className="cfe-field-row">
            <span className="cfe-field-type-icon">{TYPE_ICONS[field.fieldType] || '📋'}</span>
            <div className="cfe-field-info">
              <div className="cfe-field-name">{field.name} {field.isRequired && <span className="cfe-required-badge">Required</span>}</div>
              <div className="cfe-field-meta">{field.fieldType} · key: <code>{field.key}</code></div>
            </div>
            <button className="cfe-archive-btn" onClick={() => handleArchive(field._id)} title="Archive field">Archive</button>
          </div>
        ))}
      </div>
    </div>
  );
}
