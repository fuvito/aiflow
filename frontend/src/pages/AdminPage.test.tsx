import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminPage from './AdminPage';

const { mockUseAuth, fetchMock } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.stubGlobal('fetch', fetchMock);

const USERS = [
  {
    id: 'u1', email: 'alice@example.com', access_status: 'pending',
    role: 'user', created_at: '2026-01-01T00:00:00Z', last_login: null,
  },
  {
    id: 'u2', email: 'bob@example.com', access_status: 'approved',
    role: 'admin', created_at: '2026-01-01T00:00:00Z', last_login: '2026-09-26T10:00:00Z',
  },
];

const REQUESTS = [
  {
    id: 'r1', name: 'Carol', email: 'carol@example.com',
    linkedin_url: 'https://linkedin.com/in/carol',
    company: 'Acme', message: 'I want in', status: 'pending',
    created_at: '2026-09-01T00:00:00Z',
  },
];

function setupFetch(users = USERS, requests = REQUESTS) {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes('/admin/access-requests/')) {
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }
    if (url.includes('/admin/users/')) {
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }
    if (url.includes('/admin/analytics')) {
      return Promise.resolve({ ok: true, json: async () => ({ totals: {}, daily: [] }) });
    }
    if (url.includes('/admin/users')) {
      return Promise.resolve({ ok: true, json: async () => users });
    }
    if (url.includes('/admin/access-requests')) {
      return Promise.resolve({ ok: true, json: async () => requests });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  mockUseAuth.mockReturnValue({ session: { access_token: 'admin-tok' } });
});

describe('AdminPage', () => {
  it('shows loading then renders users table', async () => {
    setupFetch();
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('shows error when fetch fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/failed to load users/i)).toBeInTheDocument());
  });

  it('switches to Requests tab and shows request data', async () => {
    setupFetch();
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await waitFor(() => screen.getByText('alice@example.com'));
    fireEvent.click(screen.getByRole('button', { name: /requests/i }));
    expect(screen.getByText('Carol')).toBeInTheDocument();
    expect(screen.getByText('carol@example.com')).toBeInTheDocument();
  });

  it('shows Approve and Disable buttons for a pending user', async () => {
    setupFetch();
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await waitFor(() => screen.getByText('alice@example.com'));
    const aliceRow = screen.getAllByRole('row').find(r => r.textContent?.includes('alice@example.com'))!;
    expect(aliceRow.querySelector('.admin-action-approve')).toBeInTheDocument();
    expect(aliceRow.querySelector('.admin-action-disable')).toBeInTheDocument();
  });

  it('does not show Approve button for an already-approved user', async () => {
    setupFetch();
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await waitFor(() => screen.getByText('bob@example.com'));
    const bobRow = screen.getAllByRole('row').find(r => r.textContent?.includes('bob@example.com'))!;
    expect(bobRow.querySelector('.admin-action-approve')).not.toBeInTheDocument();
  });
});
