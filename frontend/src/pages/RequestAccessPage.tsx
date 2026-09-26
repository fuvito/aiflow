import { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../config';

export default function RequestAccessPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    linkedin_url: '',
    company: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
            Thanks! You'll receive an email with a magic link when your access is approved.
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

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn-primary" disabled={loading}>
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
