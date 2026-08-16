import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import CustomFieldEditor from '../components/CustomFieldEditor';
import IntegrationPanel from '../components/IntegrationPanel';
import { projectsAPI, rolesAPI, usersAPI } from '../api';
import toast from 'react-hot-toast';

// ─── ProjectSettingsPage ──────────────────────────────────────────────────────
// Enhanced project settings with Custom Fields and Integrations tabs added
// alongside existing General and Members management.

const TABS = [
  { id: 'general',      label: '⚙️ General',        desc: 'Project name, key, and description' },
  { id: 'members',      label: '👥 Members',         desc: 'Team roles and permissions' },
  { id: 'custom-fields', label: '🔧 Custom Fields',  desc: 'Add dynamic task fields' },
  { id: 'integrations', label: '🔗 Integrations',    desc: 'Webhooks and external services' },
  { id: 'danger',       label: '⚠️ Danger Zone',     desc: 'Destructive project actions' },
];

export default function ProjectSettingsPage() {
  const [activeTab, setActiveTab]     = useState('general');
  const [projects, setProjects]       = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading]         = useState(true);
  const [form, setForm]               = useState({ name: '', key: '', description: '' });
  const [saving, setSaving]           = useState(false);
  const [members, setMembers]         = useState([]);
  const [userSearch, setUserSearch]   = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    projectsAPI.getAll().then(res => {
      const ps = res.data || [];
      setProjects(ps);
      if (ps.length > 0) {
        setSelectedProject(ps[0]);
        setForm({ name: ps[0].name, key: ps[0].key, description: ps[0].description || '' });
        loadMembers(ps[0]._id);
      }
    }).finally(() => setLoading(false));
  }, []);

  const loadMembers = async (projectId) => {
    try {
      const res = await rolesAPI.getByProject(projectId);
      setMembers(res.data || []);
    } catch {}
  };

  const handleSaveGeneral = async () => {
    if (!selectedProject) return;
    setSaving(true);
    try {
      await projectsAPI.update(selectedProject._id, form);
      toast.success('Project settings saved');
    } catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const handleSearchUsers = async (q) => {
    setUserSearch(q);
    if (!q || q.length < 2) { setSearchResults([]); return; }
    try {
      const res = await usersAPI.getAll(q);
      setSearchResults(res.data?.users || res.data || []);
    } catch {}
  };

  const handleAddMember = async (userId) => {
    try {
      await rolesAPI.assign(selectedProject._id, { userId, role: 'member' });
      toast.success('Member added');
      await loadMembers(selectedProject._id);
      setSearchResults([]);
      setUserSearch('');
    } catch { toast.error('Failed to add member'); }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member from the project?')) return;
    try {
      await rolesAPI.remove(selectedProject._id, userId);
      toast.success('Member removed');
      await loadMembers(selectedProject._id);
    } catch { toast.error('Failed to remove member'); }
  };

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="page-body">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />
        <main className={`page-main ps-page ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>

          {/* Header */}
          <div className="ps-header">
            <h1 className="ps-title">Project Settings</h1>
            {projects.length > 1 && (
              <select className="ps-project-select" value={selectedProject?._id || ''} onChange={e => {
                const p = projects.find(p => p._id === e.target.value);
                if (p) { setSelectedProject(p); setForm({ name: p.name, key: p.key, description: p.description || '' }); loadMembers(p._id); }
              }}>
                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            )}
          </div>

          {loading ? <div className="ps-loading">Loading settings…</div> : selectedProject ? (
            <div className="ps-layout">
              {/* Sidebar tabs */}
              <div className="ps-tabs">
                {TABS.map(tab => (
                  <button key={tab.id} className={`ps-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                    <span className="ps-tab-label">{tab.label}</span>
                    <span className="ps-tab-desc">{tab.desc}</span>
                  </button>
                ))}
              </div>

              {/* Content area */}
              <div className="ps-content">

                {/* General */}
                {activeTab === 'general' && (
                  <div className="ps-section">
                    <h2 className="ps-section-title">General Settings</h2>
                    <div className="ps-form-grid">
                      <div className="ps-field"><label>Project Name</label><input className="ps-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                      <div className="ps-field"><label>Project Key</label><input className="ps-input" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value.toUpperCase() }))} maxLength={6} /></div>
                      <div className="ps-field ps-full"><label>Description</label><textarea className="ps-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
                    </div>
                    <button className="btn btn-primary" onClick={handleSaveGeneral} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
                  </div>
                )}

                {/* Members */}
                {activeTab === 'members' && (
                  <div className="ps-section">
                    <h2 className="ps-section-title">Team Members</h2>
                    <div className="ps-user-search">
                      <input className="ps-input" placeholder="Search users to add…" value={userSearch} onChange={e => handleSearchUsers(e.target.value)} />
                      {searchResults.length > 0 && (
                        <div className="ps-search-results">
                          {searchResults.map(u => (
                            <div key={u._id} className="ps-search-user" onClick={() => handleAddMember(u._id)}>
                              <div className="ps-user-avatar" style={{ background: u.avatarColor || '#6366f1' }}>{u.name.charAt(0)}</div>
                              <div><div className="ps-user-name">{u.name}</div><div className="ps-user-email">{u.email}</div></div>
                              <button className="btn btn-primary btn-xs">+ Add</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="ps-members-list">
                      {members.map(m => (
                        <div key={m.user?._id || m._id} className="ps-member-row">
                          <div className="ps-user-avatar" style={{ background: m.user?.avatarColor || '#6366f1' }}>{m.user?.name?.charAt(0) || '?'}</div>
                          <div className="ps-user-info"><div className="ps-user-name">{m.user?.name}</div><div className="ps-user-email">{m.user?.email}</div></div>
                          <span className="ps-member-role">{m.role}</span>
                          <button className="ps-remove-btn" onClick={() => handleRemoveMember(m.user?._id)}>Remove</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Fields */}
                {activeTab === 'custom-fields' && (
                  <CustomFieldEditor projectId={selectedProject._id} />
                )}

                {/* Integrations */}
                {activeTab === 'integrations' && (
                  <IntegrationPanel projectId={selectedProject._id} />
                )}

                {/* Danger Zone */}
                {activeTab === 'danger' && (
                  <div className="ps-section ps-danger">
                    <h2 className="ps-section-title" style={{ color: '#ef4444' }}>⚠ Danger Zone</h2>
                    <div className="ps-danger-card">
                      <div><strong>Delete This Project</strong><p>This will permanently delete all epics, tasks, sprints, and associated data. This action cannot be undone.</p></div>
                      <button className="btn btn-danger" onClick={() => toast.error('Type the project name to confirm deletion')}>Delete Project</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="ps-no-project">No projects found. Create a project to get started.</div>
          )}
        </main>
      </div>
    </div>
  );
}
