import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ChangePasswordPage from './ChangePasswordPage';
import type { UserProfile } from '../context/AuthContext';

const { mockNavigate, mockUpdateUser, mockRefreshProfile, mockUseAuth, fetchMock } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockRefreshProfile: vi.fn(),
  mockUseAuth: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
});

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { updateUser: mockUpdateUser } },
}));

vi.mock('../context/AuthContext', () => ({ useAuth: mockUseAuth }));

vi.stubGlobal('fetch', fetchMock);

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

beforeEach(() => {
  mockNavigate.mockReset();
  mockUpdateUser.mockReset();
  mockRefreshProfile.mockReset().mockResolvedValue(undefined);
  fetchMock.mockReset().mockResolvedValue({ ok: true });
  mockUseAuth.mockReturnValue({
    session: { access_token: 'tok' },
    profile: makeProfile(),
    refreshProfile: mockRefreshProfile,
  });
});

describe('ChangePasswordPage', () => {
  it('shows "Change password" heading for voluntary change', () => {
    render(<MemoryRouter><ChangePasswordPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument();
  });

  it('shows "Set your password" heading when must_change_password is true', () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: 'tok' },
      profile: makeProfile({ must_change_password: true }),
      refreshProfile: mockRefreshProfile,
    });
    render(<MemoryRouter><ChangePasswordPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /set your password/i })).toBeInTheDocument();
  });

  it('shows error when passwords do not match', () => {
    render(<MemoryRouter><ChangePasswordPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: 'password1!' } });
    fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'password2!' } });
    fireEvent.click(screen.getByRole('button', { name: /set password/i }));
    expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('shows error when password is too short', () => {
    render(<MemoryRouter><ChangePasswordPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /set password/i }));
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('shows auth error from supabase', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'Password too weak' } });
    render(<MemoryRouter><ChangePasswordPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: 'strongpass1' } });
    fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'strongpass1' } });
    fireEvent.click(screen.getByRole('button', { name: /set password/i }));
    await waitFor(() => expect(screen.getByText('Password too weak')).toBeInTheDocument());
  });

  it('calls supabase, backend, and navigates to /app on success', async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    render(<MemoryRouter><ChangePasswordPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: 'newpassword1' } });
    fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'newpassword1' } });
    fireEvent.click(screen.getByRole('button', { name: /set password/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/app'));
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpassword1' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/me/password-changed'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockRefreshProfile).toHaveBeenCalled();
  });
});
