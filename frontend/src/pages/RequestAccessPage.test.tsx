import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RequestAccessPage from './RequestAccessPage';

const fetchMock = vi.hoisted(() => vi.fn());
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => fetchMock.mockReset());

function fillForm() {
  fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: 'Alice Smith' } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alice@example.com' } });
  fireEvent.change(screen.getByLabelText(/linkedin/i), { target: { value: 'https://linkedin.com/in/alice' } });
}

describe('RequestAccessPage', () => {
  it('renders the request access form with required fields', () => {
    render(<MemoryRouter><RequestAccessPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /request access/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/linkedin/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request access/i })).toBeInTheDocument();
  });

  it('shows success view after successful submission', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    render(<MemoryRouter><RequestAccessPage /></MemoryRouter>);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /request access/i }));
    await waitFor(() => expect(screen.getByText(/request received/i)).toBeInTheDocument());
    expect(screen.getByText(/you'll receive instructions/i)).toBeInTheDocument();
  });

  it('shows error message on failed submission', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Email already registered' }),
    });
    render(<MemoryRouter><RequestAccessPage /></MemoryRouter>);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /request access/i }));
    await waitFor(() => expect(screen.getByText('Email already registered')).toBeInTheDocument());
  });

  it('shows generic error when response body is not JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => { throw new SyntaxError('bad json'); },
    });
    render(<MemoryRouter><RequestAccessPage /></MemoryRouter>);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /request access/i }));
    await waitFor(() => expect(screen.getByText(/something went wrong/i)).toBeInTheDocument());
  });

  it('has a sign in link', () => {
    render(<MemoryRouter><RequestAccessPage /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });
});
