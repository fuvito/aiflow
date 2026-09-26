import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PendingPage from './PendingPage';
import type { UserProfile } from '../context/AuthContext';

const { mockSignOut, mockUseAuth } = vi.hoisted(() => ({
  mockSignOut: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({ useAuth: mockUseAuth }));

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'uid', email: 'pending@example.com',
    access_status: 'pending', role: 'user',
    must_change_password: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    last_login: null,
    ...overrides,
  };
}

describe('PendingPage — pending account', () => {
  it('shows pending heading and user email', () => {
    mockUseAuth.mockReturnValue({ profile: makeProfile(), signOut: mockSignOut });
    render(<MemoryRouter><PendingPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /access pending/i })).toBeInTheDocument();
    expect(screen.getByText(/pending@example.com/)).toBeInTheDocument();
  });
});

describe('PendingPage — disabled account', () => {
  it('shows disabled heading and hides email', () => {
    mockUseAuth.mockReturnValue({
      profile: makeProfile({ access_status: 'disabled' }),
      signOut: mockSignOut,
    });
    render(<MemoryRouter><PendingPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /access disabled/i })).toBeInTheDocument();
    expect(screen.queryByText(/pending@example.com/)).not.toBeInTheDocument();
  });
});

describe('PendingPage — actions', () => {
  it('calls signOut when Sign out is clicked', () => {
    mockUseAuth.mockReturnValue({ profile: makeProfile(), signOut: mockSignOut });
    render(<MemoryRouter><PendingPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('links back to home', () => {
    mockUseAuth.mockReturnValue({ profile: makeProfile(), signOut: mockSignOut });
    render(<MemoryRouter><PendingPage /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/');
  });
});
