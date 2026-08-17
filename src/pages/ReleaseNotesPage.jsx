import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ReleaseNotesPanel from '../components/ReleaseNotesPanel';
import { projectsAPI } from '../api';

export default function ReleaseNotesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    projectsAPI.getAll().then(res => {
      const ps = res.data || [];
      setProjects(ps);
      if (ps.length > 0) setSelectedProject(ps[0]);
    });
  }, []);

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="page-body">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />
        <main className={`page-main ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
          <div className="rn-page-content" style={{ padding: '2rem' }}>
            <div className="rn-page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Release Notes & Changelogs</h1>
                <p style={{ color: 'var(--theme-text-muted)', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Review and copy automatically generated release markdown</p>
              </div>
              {projects.length > 1 && (
                <select
                  value={selectedProject?._id || ''}
                  onChange={e => setSelectedProject(projects.find(p => p._id === e.target.value))}
                  style={{ background: 'var(--theme-card)', border: '1px solid var(--theme-border)', borderRadius: '0.5rem', padding: '0.45rem 0.75rem', color: 'var(--theme-text)' }}
                >
                  {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              )}
            </div>
            {selectedProject && <ReleaseNotesPanel projectId={selectedProject._id} />}
          </div>
        </main>
      </div>
    </div>
  );
}
