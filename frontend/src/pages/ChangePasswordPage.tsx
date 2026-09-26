import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';
import { PasswordInput } from '../components/PasswordInput';

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { session, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const isForced = profile?.must_change_password ?? false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Tell the backend to clear the must_change_password flag
    await fetch(`${API_BASE}/api/users/me/password-changed`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });

    await refreshProfile();
    navigate('/app');
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">⬡</span>
          <span className="auth-logo-text">AiFlow</span>
        </div>

        <div className="auth-status-icon" style={{ textAlign: 'center', fontSize: 28 }}>🔑</div>
        <h1>{isForced ? 'Set your password' : 'Change password'}</h1>
        <p className="auth-subtitle">
          {isForced
            ? "You're signing in for the first time. Please set a new password to continue."
            : 'Enter a new password for your account.'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="password">New password</label>
          <PasswordInput
            id="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            autoFocus
          />

          <label htmlFor="confirm">Confirm password</label>
          <PasswordInput
            id="confirm"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat your password"
            required
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? 'Saving…' : 'Set password and continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
