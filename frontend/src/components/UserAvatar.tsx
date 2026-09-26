import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

interface Usage {
  executions: number;
  llm_requests: number;
  max_executions: number;
  max_llm_requests: number;
}

function initials(email: string, name: string): string {
  if (name) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function limit(n: number): string {
  return n === 0 ? '∞' : String(n);
}

function UsageBar({ value, max }: { value: number; max: number }) {
  if (max === 0) return null;
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = pct >= 90 ? '#f87171' : pct >= 70 ? '#fbbf24' : '#4af7c4';
  return (
    <div className="ua-bar-wrap">
      <div className="ua-bar-track">
        <div className="ua-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function UserAvatar() {
  const { user, profile, session, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const email = user?.email ?? '';
  const displayName: string = (user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? '') as string;
  const abbr = initials(email, displayName);

  // Fetch usage when dropdown opens
  useEffect(() => {
    if (!open || !session?.access_token) return;
    setUsageLoading(true);
    fetch(`${API_BASE}/api/users/me/usage`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(data => { setUsage(data); setUsageLoading(false); })
      .catch(() => setUsageLoading(false));
  }, [open, session?.access_token]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="ua-wrap" ref={ref}>
      <button className="ua-btn" onClick={() => setOpen(o => !o)} title={email}>
        {abbr}
      </button>

      {open && (
        <div className="ua-dropdown">
          {/* Identity */}
          <div className="ua-identity">
            <div className="ua-avatar-lg">{abbr}</div>
            <div className="ua-identity-info">
              {displayName && <div className="ua-name">{displayName}</div>}
              <div className="ua-email">{email}</div>
              <div className="ua-role">
                <span className={`ua-badge ua-badge-${profile?.role}`}>{profile?.role}</span>
                <span className={`ua-badge ua-badge-${profile?.access_status}`}>{profile?.access_status}</span>
              </div>
            </div>
          </div>

          <div className="ua-divider" />

          {/* Usage */}
          <div className="ua-usage">
            <div className="ua-usage-title">Today's usage</div>
            {usageLoading && <div className="ua-usage-loading">Loading…</div>}
            {!usageLoading && usage && (
              <>
                <div className="ua-usage-row">
                  <span>Executions</span>
                  <span className="ua-usage-val">
                    {usage.executions}
                    <span className="ua-usage-max"> / {limit(usage.max_executions)}</span>
                  </span>
                </div>
                <UsageBar value={usage.executions} max={usage.max_executions} />

                <div className="ua-usage-row" style={{ marginTop: 8 }}>
                  <span>AI requests</span>
                  <span className="ua-usage-val">
                    {usage.llm_requests}
                    <span className="ua-usage-max"> / {limit(usage.max_llm_requests)}</span>
                  </span>
                </div>
                <UsageBar value={usage.llm_requests} max={usage.max_llm_requests} />
              </>
            )}
          </div>

          <div className="ua-divider" />

          <Link to="/change-password" className="ua-menu-link" onClick={() => setOpen(false)}>
            Change password
          </Link>
          <button className="ua-signout" onClick={signOut}>Sign out</button>
        </div>
      )}
    </div>
  );
}
