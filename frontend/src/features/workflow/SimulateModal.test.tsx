import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SimulateModal } from './SimulateModal';
import { NodeType } from '../../models/workflow';
import type { Workflow } from '../../models/workflow';
import type { ExecutionTrace } from '../../models/simulation';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ session: { access_token: 'test-token' } }),
}));

// ── Fetch mock ───────────────────────────────────────────────────────
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
});

// ── Fixtures ─────────────────────────────────────────────────────────
function makeWorkflow(): Workflow {
  return {
    version: '1.0', id: 'wf-1', name: 'Test', description: '',
    nodes: [
      { id: 'start', type: NodeType.START, name: 'Start', position: { x: 0, y: 0 },   config: {} },
      { id: 'end',   type: NodeType.END,   name: 'End',   position: { x: 0, y: 200 }, config: {} },
    ],
    edges: [{ source: 'start', target: 'end' }],
    metadata: {},
  };
}

const MOCK_TRACE: ExecutionTrace = {
  trace_id: 'trace-1', workflow_id: 'wf-1', workflow_name: 'Test',
  started_at: '2024-01-01T00:00:00Z', completed_at: '2024-01-01T00:00:01Z',
  status: 'complete',
  steps: [
    {
      node_id: 'start', node_name: 'Start', node_type: 'START', status: 'success',
      started_at: '2024-01-01T00:00:00Z', completed_at: '2024-01-01T00:00:01Z',
      input: {}, output: {},
    },
  ],
};

// ── Rendering ────────────────────────────────────────────────────────
describe('SimulateModal — rendering', () => {
  it('shows modal title', () => {
    render(<SimulateModal workflow={makeWorkflow()} onClose={vi.fn()} onSimulated={vi.fn()} />);
    expect(screen.getByText('Simulate Workflow')).toBeInTheDocument();
  });

  it('renders JSON input textarea with default empty object', () => {
    render(<SimulateModal workflow={makeWorkflow()} onClose={vi.fn()} onSimulated={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('{}');
  });

  it('renders HITL mode select', () => {
    render(<SimulateModal workflow={makeWorkflow()} onClose={vi.fn()} onSimulated={vi.fn()} />);
    expect(screen.getByText('Auto-approve')).toBeInTheDocument();
  });

  it('renders condition mode select', () => {
    render(<SimulateModal workflow={makeWorkflow()} onClose={vi.fn()} onSimulated={vi.fn()} />);
    expect(screen.getByText('Expression eval')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<SimulateModal workflow={makeWorkflow()} onClose={onClose} onSimulated={vi.fn()} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when ✕ is clicked', () => {
    const onClose = vi.fn();
    render(<SimulateModal workflow={makeWorkflow()} onClose={onClose} onSimulated={vi.fn()} />);
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

// ── JSON validation ───────────────────────────────────────────────────
describe('SimulateModal — JSON validation', () => {
  it('shows error for invalid JSON', () => {
    render(<SimulateModal workflow={makeWorkflow()} onClose={vi.fn()} onSimulated={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'not json' } });
    expect(screen.getByText('Invalid JSON')).toBeInTheDocument();
  });

  it('shows error when JSON is an array', () => {
    render(<SimulateModal workflow={makeWorkflow()} onClose={vi.fn()} onSimulated={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '[1, 2]' } });
    expect(screen.getByText(/must be a JSON object/i)).toBeInTheDocument();
  });

  it('disables submit button when input is invalid', () => {
    render(<SimulateModal workflow={makeWorkflow()} onClose={vi.fn()} onSimulated={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'bad' } });
    expect(screen.getByText('Run Simulation')).toBeDisabled();
  });

  it('clears error when input becomes valid again', () => {
    render(<SimulateModal workflow={makeWorkflow()} onClose={vi.fn()} onSimulated={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'bad' } });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '{}' } });
    expect(screen.queryByText('Invalid JSON')).not.toBeInTheDocument();
    expect(screen.getByText('Run Simulation')).not.toBeDisabled();
  });
});

// ── Submission ────────────────────────────────────────────────────────
describe('SimulateModal — submission', () => {
  it('calls onSimulated and onClose on successful response', async () => {
    const onSimulated = vi.fn();
    const onClose = vi.fn();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ trace: MOCK_TRACE, evaluation: null }),
    });

    render(<SimulateModal workflow={makeWorkflow()} onClose={onClose} onSimulated={onSimulated} />);
    fireEvent.click(screen.getByText('Run Simulation'));

    await waitFor(() => expect(onSimulated).toHaveBeenCalledOnce());
    expect(onSimulated).toHaveBeenCalledWith(
      MOCK_TRACE,
      null,
      expect.objectContaining({ llm_mode: 'mock' }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('forwards evaluation to onSimulated when present', async () => {
    const onSimulated = vi.fn();
    const evaluation = { score: 8, summary: 'Good', strengths: [], issues: [], recommendations: [] };
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ trace: MOCK_TRACE, evaluation }),
    });

    render(<SimulateModal workflow={makeWorkflow()} onClose={vi.fn()} onSimulated={onSimulated} />);
    fireEvent.click(screen.getByText('Run Simulation'));

    await waitFor(() => expect(onSimulated).toHaveBeenCalledWith(MOCK_TRACE, evaluation, expect.anything()));
  });

  it('shows loading state while fetch is in flight', async () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // never resolves
    render(<SimulateModal workflow={makeWorkflow()} onClose={vi.fn()} onSimulated={vi.fn()} />);
    fireEvent.click(screen.getByText('Run Simulation'));
    await waitFor(() => expect(screen.getByText(/Simulating/)).toBeInTheDocument());
  });

  it('shows server error message from response detail', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ detail: 'Workflow has no START node' }),
    });

    render(<SimulateModal workflow={makeWorkflow()} onClose={vi.fn()} onSimulated={vi.fn()} />);
    fireEvent.click(screen.getByText('Run Simulation'));

    await waitFor(() =>
      expect(screen.getByText('Workflow has no START node')).toBeInTheDocument(),
    );
  });

  it('shows fallback server error when no detail in response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    render(<SimulateModal workflow={makeWorkflow()} onClose={vi.fn()} onSimulated={vi.fn()} />);
    fireEvent.click(screen.getByText('Run Simulation'));

    await waitFor(() =>
      expect(screen.getByText(/server error/i)).toBeInTheDocument(),
    );
  });

  it('shows backend unreachable error on network failure', async () => {
    fetchMock.mockRejectedValue(new Error('fetch failed'));
    render(<SimulateModal workflow={makeWorkflow()} onClose={vi.fn()} onSimulated={vi.fn()} />);
    fireEvent.click(screen.getByText('Run Simulation'));

    await waitFor(() =>
      expect(screen.getByText(/could not reach backend/i)).toBeInTheDocument(),
    );
  });
});
