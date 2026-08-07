import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import BoardPage from './pages/BoardPage';
import BacklogPage from './pages/BacklogPage';
import RoadmapPage from './pages/RoadmapPage';
import ReportsPage from './pages/ReportsPage';
import ReleasePage from './pages/ReleasePage';
import ProjectSettingsPage from './pages/ProjectSettingsPage';
import NotFoundPage from './pages/NotFoundPage';

// ─── Protected Route Guard ────────────────────────────────────────────────────
function PrivateRoute({ children }) {
  const token = localStorage.getItem('agileflow_token');
  return token ? children : <Navigate to="/login" replace />;
}

// ─── Public Route Guard (redirect authenticated users away from auth pages) ───
function PublicRoute({ children }) {
  const token = localStorage.getItem('agileflow_token');
  return token ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        {/* Global toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e1e2d',
              color: '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#0f0f17' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0f0f17' } },
          }}
        />

        <Routes>
          {/* Root → redirect based on auth state */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Public auth routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />

          {/* Protected app routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/board/:epicId"
            element={
              <PrivateRoute>
                <BoardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/backlog"
            element={
              <PrivateRoute>
                <BacklogPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects/:projectId/backlog"
            element={
              <PrivateRoute>
                <BacklogPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/roadmap"
            element={
              <PrivateRoute>
                <RoadmapPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <ReportsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/releases"
            element={
              <PrivateRoute>
                <ReleasePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <ProjectSettingsPage />
              </PrivateRoute>
            }
          />

          {/* Catch-all → 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
