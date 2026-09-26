import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

interface UserRow {
  id: string;
  email: string;
  access_status: string;
  role: string;
  created_at: string;
  last_login: string | null;
}

interface AccessRequest {
  id: string;
  name: string;
  email: string;
  linkedin_url: string | null;
  company: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

type Tab = 'users' | 'requests';

export default function AdminPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = session?.access_token ?? '';

  const authHeaders = useCallback(
    () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }),
    [token]
  );

  async function fetchUsers() {
    const res = await fetch(`${API_BASE}/api/admin/users`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load users');
    setUsers(await res.json());
  }

  async function fetchRequests() {
    const res = await fetch(`${API_BASE}/api/admin/access-requests`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load access requests');
    setRequests(await res.json());
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchRequests()])
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function patchUser(userId: string, patch: Record<string, string>) {
    const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.detail ?? 'Update failed');
    }
    await fetchUsers();
  }

  async function patchRequest(reqId: string, status: string) {
    const res = await fetch(`${API_BASE}/api/admin/access-requests/${reqId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ access_status: status }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.detail ?? 'Update failed');
    }
    await fetchRequests();
  }

  function fmt(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  if (loading) return <div className="admin-loading">Loading…</div>;
  if (error) return <div className="admin-error">{error}</div>;

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Admin</h1>
        <div className="admin-tabs">
          <button
            className={`admin-tab ${tab === 'users' ? 'admin-tab-active' : ''}`}
            onClick={() => setTab('users')}
          >
            Users ({users.length})
          </button>
          <button
            className={`admin-tab ${tab === 'requests' ? 'admin-tab-active' : ''}`}
            onClick={() => setTab('requests')}
          >
            Requests ({requests.filter(r => r.status === 'pending').length} pending)
          </button>
        </div>
      </header>

      {tab === 'users' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Last login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>
                    <span className={`admin-badge admin-badge-${u.access_status}`}>
                      {u.access_status}
                    </span>
                  </td>
                  <td>{u.role}</td>
                  <td>{fmt(u.created_at)}</td>
                  <td>{fmt(u.last_login)}</td>
                  <td className="admin-actions">
                    {u.access_status !== 'approved' && (
                      <button
                        className="admin-action-btn admin-action-approve"
                        onClick={() => patchUser(u.id, { access_status: 'approved' })}
                      >
                        Approve
                      </button>
                    )}
                    {u.access_status !== 'demo' && (
                      <button
                        className="admin-action-btn admin-action-demo"
                        onClick={() => patchUser(u.id, { access_status: 'demo', role: 'demo' })}
                      >
                        Demo
                      </button>
                    )}
                    {u.access_status !== 'disabled' && (
                      <button
                        className="admin-action-btn admin-action-disable"
                        onClick={() => patchUser(u.id, { access_status: 'disabled' })}
                      >
                        Disable
                      </button>
                    )}
                    {u.role !== 'admin' && (
                      <button
                        className="admin-action-btn admin-action-admin"
                        onClick={() => patchUser(u.id, { role: 'admin', access_status: 'approved' })}
                      >
                        Make admin
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'requests' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>LinkedIn</th>
                <th>Message</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.email}</td>
                  <td>{r.company ?? '—'}</td>
                  <td>
                    {r.linkedin_url
                      ? <a href={r.linkedin_url} target="_blank" rel="noopener noreferrer">View</a>
                      : '—'}
                  </td>
                  <td className="admin-message-cell">
                    <span title={r.message ?? ''}>
                      {r.message ? r.message.slice(0, 60) + (r.message.length > 60 ? '…' : '') : '—'}
                    </span>
                  </td>
                  <td>{fmt(r.created_at)}</td>
                  <td>
                    <span className={`admin-badge admin-badge-${r.status}`}>{r.status}</span>
                  </td>
                  <td className="admin-actions">
                    {r.status === 'pending' && (
                      <>
                        <button
                          className="admin-action-btn admin-action-approve"
                          onClick={() => patchRequest(r.id, 'approved')}
                        >
                          Approve
                        </button>
                        <button
                          className="admin-action-btn admin-action-disable"
                          onClick={() => patchRequest(r.id, 'rejected')}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
