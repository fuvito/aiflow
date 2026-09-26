import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAnalytics } from '../hooks/useAnalytics';
import { PasswordInput } from '../components/PasswordInput';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

export default function LoginPage() {
  const { track } = useAnalytics();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: TURNSTILE_SITE_KEY && turnstileToken ? { captchaToken: turnstileToken } : undefined,
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      track('login');
      navigate('/app');
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">⬡</span>
          <span className="auth-logo-text">AiFlow</span>
        </div>

        <h1>Sign in to AiFlow</h1>

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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <label htmlFor="password">Password</label>
            <Link to="/forgot-password" className="auth-forgot-link" tabIndex={-1}>Forgot password?</Link>
          </div>
          <PasswordInput
            id="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your password"
            required
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
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have access? <Link to="/request-access">Request access</Link>
        </p>
        <p className="auth-footer">
          <Link to="/">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
