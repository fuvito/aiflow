import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

// ── Supabase mock ────────────────────────────────────────────────────
const { mockGetSession, mockOnAuthStateChange, mockSignOut } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
    },
  },
}));

const fetchMock = vi.hoisted(() => vi.fn());
vi.stubGlobal('fetch', fetchMock);

// Helper: renders a consumer that surfaces auth context values
function Consumer() {
  const { profile, profileError, loading, session } = useAuth();
  if (loading) return <div>loading</div>;
  if (profileError) return <div>error: {profileError}</div>;
  if (profile) return <div>profile: {profile.email}</div>;
  if (!session) return <div>no session</div>;
  return <div>session only</div>;
}

const MOCK_SESSION = {
  access_token: 'tok',
  user: { id: 'uid', email: 'u@example.com' },
};

const MOCK_PROFILE = {
  id: 'uid', email: 'u@example.com',
  access_status: 'approved', role: 'user',
  must_change_password: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  last_login: null,
};

beforeEach(() => {
  mockGetSession.mockReset();
  mockSignOut.mockReset();
  fetchMock.mockReset();
  // Default: no-op subscription
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
});

describe('AuthContext — no session', () => {
  it('shows no session state when getSession returns null', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('no session')).toBeInTheDocument());
  });
});

describe('AuthContext — successful profile fetch', () => {
  it('fetches and surfaces the user profile', async () => {
    mockGetSession.mockResolvedValue({ data: { session: MOCK_SESSION } });
    fetchMock.mockResolvedValue({ ok: true, json: async () => MOCK_PROFILE });
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('profile: u@example.com')).toBeInTheDocument());
  });
});

describe('AuthContext — profile fetch error', () => {
  it('surfaces the backend error detail', async () => {
    mockGetSession.mockResolvedValue({ data: { session: MOCK_SESSION } });
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Account disabled.' }),
    });
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('error: Account disabled.')).toBeInTheDocument());
  });

  it('shows generic error when backend is unreachable', async () => {
    mockGetSession.mockResolvedValue({ data: { session: MOCK_SESSION } });
    fetchMock.mockImplementation(() => { throw new Error('fetch failed'); });
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByText(/could not reach the backend/i)).toBeInTheDocument());
  });
});

describe('AuthContext — signOut', () => {
  it('clears profile on sign out', async () => {
    mockGetSession.mockResolvedValue({ data: { session: MOCK_SESSION } });
    fetchMock.mockResolvedValue({ ok: true, json: async () => MOCK_PROFILE });
    mockSignOut.mockResolvedValue({});

    function SignOutConsumer() {
      const { profile, signOut } = useAuth();
      return (
        <>
          <div>{profile ? `profile: ${profile.email}` : 'no profile'}</div>
          <button onClick={signOut}>sign out</button>
        </>
      );
    }

    render(<AuthProvider><SignOutConsumer /></AuthProvider>);
    await waitFor(() => screen.getByText('profile: u@example.com'));
    await act(async () => {
      screen.getByRole('button', { name: /sign out/i }).click();
    });
    expect(mockSignOut).toHaveBeenCalled();
  });
});
