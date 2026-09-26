import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../config';
import { useAnalytics } from '../hooks/useAnalytics';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

export default function RequestAccessPage() {
  const { track } = useAnalytics();
  const [form, setForm] = useState({
    name: '',
    email: '',
    linkedin_url: '',
    company: '',
    message: '',
    website: '',  // honeypot
  });
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<HTMLDivElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    track('page_view', 'request_access');
  }, [track]);

  // Mount Cloudflare Turnstile widget once the script has loaded
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const body = {
      name: form.name,
      email: form.email,
      linkedin_url: form.linkedin_url,
      ...(form.company && { company: form.company }),
      ...(form.message && { message: form.message }),
      website: form.website,
      turnstile_token: turnstileToken,
    };

    try {
      const res = await fetch(`${API_BASE}/api/access-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? 'Something went wrong. Please try again.');
      }
      track('request_access_submit');
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <span className="auth-logo-icon">⬡</span>
            <span className="auth-logo-text">AiFlow</span>
          </div>
          <div className="auth-sent-icon">✓</div>
          <h2>Request received</h2>
          <p className="auth-subtitle">
            Thanks! You'll receive instructions on how to access AiFlow once your request is approved.
          </p>
          <Link to="/" className="auth-btn-primary" style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}>
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-logo">
          <span className="auth-logo-icon">⬡</span>
          <span className="auth-logo-text">AiFlow</span>
        </div>
        <h1>Request access</h1>
        <p className="auth-subtitle">
          AiFlow is in private access. Fill in the form and we'll review your request.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-row">
            <div className="auth-form-field">
              <label htmlFor="name">Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Your name"
                required
              />
            </div>
            <div className="auth-form-field">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div className="auth-form-row">
            <div className="auth-form-field">
              <label htmlFor="company">Company</label>
              <input
                id="company"
                name="company"
                type="text"
                value={form.company}
                onChange={handleChange}
                placeholder="Your company (optional)"
              />
            </div>
            <div className="auth-form-field">
              <label htmlFor="linkedin_url">LinkedIn *</label>
              <input
                id="linkedin_url"
                name="linkedin_url"
                type="url"
                value={form.linkedin_url}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/..."
                required
              />
            </div>
          </div>

          <label htmlFor="message">Why are you interested in AiFlow?</label>
          <textarea
            id="message"
            name="message"
            value={form.message}
            onChange={handleChange}
            rows={4}
            placeholder="I'm interested in exploring AiFlow because… (optional)"
          />

          {/* Honeypot — hidden from real users, bots fill it in */}
          <div className="auth-honey" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              type="text"
              value={form.website}
              onChange={handleChange}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {/* Cloudflare Turnstile — only rendered when VITE_TURNSTILE_SITE_KEY is set */}
          {TURNSTILE_SITE_KEY && <div ref={turnstileRef} />}

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            className="auth-btn-primary"
            disabled={loading || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
          >
            {loading ? 'Sending…' : 'Request access'}
          </button>
        </form>

        <p className="auth-footer">
          Already have access? <Link to="/login">Sign in</Link>
        </p>
        <p className="auth-footer">
          <Link to="/">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
