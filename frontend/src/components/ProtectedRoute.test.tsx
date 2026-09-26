import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import type { UserProfile } from '../context/AuthContext';

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: mockUseAuth }));

// Suppress jsdom's "Not implemented: navigation" for window.location.reload
Object.defineProperty(window, 'location', {
  value: { ...window.location, reload: vi.fn() },
  writable: true,
});

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'uid', email: 'u@example.com',
    access_status: 'approved', role: 'user',
    must_change_password: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    last_login: null,
    ...overrides,
  };
}

function renderRoute(authState: object, requireAdmin = false) {
  mockUseAuth.mockReturnValue(authState);
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <Routes>
        <Route
          path="/app"
          element={
            <ProtectedRoute requireAdmin={requireAdmin}>
              <div>Protected content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login"           element={<div>Login page</div>} />
        <Route path="/pending"         element={<div>Pending page</div>} />
        <Route path="/change-password" element={<div>Change password page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('shows loading spinner while auth is loading', () => {
    renderRoute({ loading: true, session: null, profile: null, profileError: null });
    expect(document.querySelector('.auth-loading')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('redirects to /login when there is no session', () => {
    renderRoute({ loading: false, session: null, profile: null, profileError: null });
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('shows access denied card when profile fetch failed', () => {
    renderRoute({
      loading: false,
      session: { access_token: 'tok' },
      profile: null,
      profileError: 'Access pending approval.',
    });
    expect(screen.getByRole('heading', { name: /access denied/i })).toBeInTheDocument();
    expect(screen.getByText('Access pending approval.')).toBeInTheDocument();
  });

  it('shows fallback message when profileError is null', () => {
    renderRoute({
      loading: false,
      session: { access_token: 'tok' },
      profile: null,
      profileError: null,
    });
    expect(screen.getByText(/unable to load your profile/i)).toBeInTheDocument();
  });

  it('calls window.location.reload when Retry is clicked', () => {
    renderRoute({
      loading: false,
      session: { access_token: 'tok' },
      profile: null,
      profileError: 'some error',
    });
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('redirects to /pending for a pending account', () => {
    renderRoute({
      loading: false,
      session: { access_token: 'tok' },
      profile: makeProfile({ access_status: 'pending' }),
      profileError: null,
    });
    expect(screen.getByText('Pending page')).toBeInTheDocument();
  });

  it('redirects to /pending for a disabled account', () => {
    renderRoute({
      loading: false,
      session: { access_token: 'tok' },
      profile: makeProfile({ access_status: 'disabled' }),
      profileError: null,
    });
    expect(screen.getByText('Pending page')).toBeInTheDocument();
  });

  it('redirects to /change-password when must_change_password is true', () => {
    renderRoute({
      loading: false,
      session: { access_token: 'tok' },
      profile: makeProfile({ must_change_password: true }),
      profileError: null,
    });
    expect(screen.getByText('Change password page')).toBeInTheDocument();
  });

  it('redirects non-admin to /app when requireAdmin is true', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      session: { access_token: 'tok' },
      profile: makeProfile({ role: 'user' }),
      profileError: null,
    });
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<ProtectedRoute requireAdmin><div>Admin content</div></ProtectedRoute>} />
          <Route path="/app"   element={<div>App page</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('App page')).toBeInTheDocument();
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
  });

  it('renders children for an approved user', () => {
    renderRoute({
      loading: false,
      session: { access_token: 'tok' },
      profile: makeProfile(),
      profileError: null,
    });
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('renders children for an admin when requireAdmin is true', () => {
    renderRoute(
      { loading: false, session: { access_token: 'tok' }, profile: makeProfile({ role: 'admin' }), profileError: null },
      true,
    );
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
});
