import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: Props) {
  const { session, profile, profileError, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but backend rejected the profile fetch — show the exact reason.
  if (!profile) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <span className="auth-logo-icon">⬡</span>
            <span className="auth-logo-text">AiFlow</span>
          </div>
          <div className="auth-status-icon auth-status-error">✕</div>
          <h1>Access denied</h1>
          <p className="auth-subtitle" style={{ color: '#f87171' }}>
            {profileError ?? 'Unable to load your profile.'}
          </p>
          <p className="auth-subtitle" style={{ marginTop: 8 }}>
            If this is unexpected, contact the owner or check the backend logs.
          </p>
          <div className="auth-pending-actions" style={{ marginTop: 8 }}>
            <button
              className="auth-btn-ghost"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
            <a href="/" className="auth-btn-ghost">← Home</a>
          </div>
        </div>
      </div>
    );
  }

  if (profile.access_status === 'pending' || profile.access_status === 'disabled') {
    return <Navigate to="/pending" replace />;
  }

  if (profile.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  if (requireAdmin && profile.role !== 'admin') {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
