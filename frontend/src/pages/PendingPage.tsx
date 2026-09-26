import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PendingPage() {
  const { profile, signOut } = useAuth();
  const isDisabled = profile?.access_status === 'disabled';

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">⬡</span>
          <span className="auth-logo-text">AiFlow</span>
        </div>

        {isDisabled ? (
          <>
            <div className="auth-status-icon auth-status-error">✕</div>
            <h1>Access disabled</h1>
            <p className="auth-subtitle">
              This account has been disabled. Contact the owner if you believe this is a mistake.
            </p>
          </>
        ) : (
          <>
            <div className="auth-status-icon auth-status-pending">⏳</div>
            <h1>Access pending</h1>
            <p className="auth-subtitle">
              Your account <strong>{profile?.email}</strong> is awaiting approval.<br />
              You'll receive a magic link email once you're approved.
            </p>
          </>
        )}

        <div className="auth-pending-actions">
          <Link to="/" className="auth-btn-ghost">← Back to home</Link>
          <button onClick={signOut} className="auth-btn-ghost">Sign out</button>
        </div>
      </div>
    </div>
  );
}
