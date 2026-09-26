import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserAvatar } from './UserAvatar';

const { mockUseAuth, fetchMock } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.stubGlobal('fetch', fetchMock);

function makeUser(email: string, fullName?: string) {
  return {
    email,
    user_metadata: fullName ? { full_name: fullName } : {},
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  mockUseAuth.mockReturnValue({
    user: makeUser('alice@example.com', 'Alice Smith'),
    profile: { role: 'user', access_status: 'approved' },
    session: { access_token: 'tok' },
    signOut: vi.fn(),
  });
});

describe('UserAvatar — button', () => {
  it('renders initials from display name', () => {
    render(<MemoryRouter><UserAvatar /></MemoryRouter>);
    const btn = screen.getByTitle('alice@example.com');
    expect(btn).toHaveTextContent('AS');
  });

  it('falls back to email initials when no display name', () => {
    mockUseAuth.mockReturnValue({
      user: makeUser('bob@example.com'),
      profile: { role: 'user', access_status: 'approved' },
      session: { access_token: 'tok' },
      signOut: vi.fn(),
    });
    render(<MemoryRouter><UserAvatar /></MemoryRouter>);
    expect(screen.getByTitle('bob@example.com')).toHaveTextContent('BO');
  });
});

describe('UserAvatar — dropdown', () => {
  it('opens dropdown on click and shows identity', async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ executions: 2, llm_requests: 5, max_executions: 10, max_llm_requests: 20 }),
    });
    render(<MemoryRouter><UserAvatar /></MemoryRouter>);
    fireEvent.click(screen.getByTitle('alice@example.com'));
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('shows usage stats after fetch', async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ executions: 3, llm_requests: 7, max_executions: 10, max_llm_requests: 20 }),
    });
    render(<MemoryRouter><UserAvatar /></MemoryRouter>);
    fireEvent.click(screen.getByTitle('alice@example.com'));
    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('shows unlimited symbol when max is 0', async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ executions: 1, llm_requests: 2, max_executions: 0, max_llm_requests: 0 }),
    });
    render(<MemoryRouter><UserAvatar /></MemoryRouter>);
    fireEvent.click(screen.getByTitle('alice@example.com'));
    await waitFor(() => screen.getByText('1'));
    // ∞ appears inside a <span> alongside " / " — use regex to match partial text
    expect(screen.getAllByText(/∞/).length).toBeGreaterThan(0);
  });

  it('closes dropdown on outside click', () => {
    fetchMock.mockResolvedValue({ json: async () => ({}) });
    render(<MemoryRouter><UserAvatar /></MemoryRouter>);
    fireEvent.click(screen.getByTitle('alice@example.com'));
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument();
  });

  it('has a Change password link', async () => {
    fetchMock.mockResolvedValue({ json: async () => ({}) });
    render(<MemoryRouter><UserAvatar /></MemoryRouter>);
    fireEvent.click(screen.getByTitle('alice@example.com'));
    expect(screen.getByRole('link', { name: /change password/i })).toHaveAttribute('href', '/change-password');
  });

  it('calls signOut when Sign out is clicked', () => {
    const mockSignOut = vi.fn();
    mockUseAuth.mockReturnValue({
      user: makeUser('alice@example.com', 'Alice Smith'),
      profile: { role: 'user', access_status: 'approved' },
      session: { access_token: 'tok' },
      signOut: mockSignOut,
    });
    fetchMock.mockResolvedValue({ json: async () => ({}) });
    render(<MemoryRouter><UserAvatar /></MemoryRouter>);
    fireEvent.click(screen.getByTitle('alice@example.com'));
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(mockSignOut).toHaveBeenCalled();
  });
});
