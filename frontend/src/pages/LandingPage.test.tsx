import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from './LandingPage';

// jsdom localStorage is stubbed — replace with a real Map-backed implementation.
const localStorageMock = (() => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

beforeEach(() => {
  localStorageMock.removeItem('aiflow-theme');
  document.documentElement.removeAttribute('data-theme');
});

describe('LandingPage', () => {
  it('renders the main heading and call-to-action', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByText(/agentic AI workflows/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /request/i }).length).toBeGreaterThan(0);
  });

  it('renders all workflow step labels', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    for (const label of ['Describe', 'Generate', 'Design', 'Simulate', 'Evaluate']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('renders the workflow node type chips', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    // TOOL, RAG, CONDITION, HITL only appear in the node-chip section
    for (const type of ['TOOL', 'RAG', 'CONDITION', 'HITL']) {
      expect(screen.getAllByText(type).length).toBeGreaterThan(0);
    }
  });

  it('renders the SVG workflow diagram with START and END nodes', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(document.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('START')).toBeInTheDocument();
    expect(screen.getByText('END')).toBeInTheDocument();
  });

  it('defaults to dark theme when no preference is stored', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('uses light theme when stored preference is light', () => {
    localStorageMock.setItem('aiflow-theme', 'light');
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggles from dark to light theme when theme button is clicked', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    fireEvent.click(screen.getByTitle(/switch to light mode/i));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorageMock.getItem('aiflow-theme')).toBe('light');
  });

  it('renders footer with GitHub link and built-by text', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByText(/built by Fuat Yazar/i)).toBeInTheDocument();
    // "Sign in" appears in both nav and footer — verify at least one exists
    expect(screen.getAllByRole('link', { name: /sign in/i }).length).toBeGreaterThanOrEqual(1);
  });
});
