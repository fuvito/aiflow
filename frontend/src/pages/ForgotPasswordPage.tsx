import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current) return;
    let widgetId: string | undefined;
    let timer: ReturnType<typeof setTimeout>;

    function tryRender() {
      const w = window as any;
      if (w.turnstile) {
        widgetId = w.turnstile.render(turnstileRef.current!, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(''),
          'error-callback': () => setTurnstileToken(''),
        });
      } else {
        timer = setTimeout(tryRender, 100);
      }
    }

    tryRender();

    return () => {
      clearTimeout(timer);
      const w = window as any;
      if (w.turnstile && widgetId !== undefined) w.turnstile.remove(widgetId);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const redirectTo = `${window.location.origin}/change-password`;
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
      ...(TURNSTILE_SITE_KEY && turnstileToken ? { captchaToken: turnstileToken } : {}),
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <span className="auth-logo-icon">⬡</span>
            <span className="auth-logo-text">AiFlow</span>
          </div>
          <div className="auth-sent-icon">✉</div>
          <h2>Check your email</h2>
          <p className="auth-subtitle">
            If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.
          </p>
          <Link to="/login" className="auth-btn-primary" style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}>
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">⬡</span>
          <span className="auth-logo-text">AiFlow</span>
        </div>

        <h1>Reset password</h1>
        <p className="auth-subtitle">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
          />

          {TURNSTILE_SITE_KEY && (
            <div ref={turnstileRef} style={turnstileToken ? { display: 'none' } : undefined} />
          )}

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            className="auth-btn-primary"
            disabled={loading || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/login">← Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
