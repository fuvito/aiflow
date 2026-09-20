import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TracePanel } from './TracePanel';
import type { ExecutionTrace, SimulationSettings } from '../../models/simulation';

// ── Fixtures ─────────────────────────────────────────────────────────
const SETTINGS: SimulationSettings = {
  llm_mode: 'mock', hitl_mode: 'auto-approve', condition_mode: 'expression',
  display_mode: 'instant', animation_delay_ms: 600, evaluate: false,
};

const MANUAL_SETTINGS: SimulationSettings = { ...SETTINGS, display_mode: 'manual' };

const COMPLETE_TRACE: ExecutionTrace = {
  trace_id: 'trace-1', workflow_id: 'wf-1', workflow_name: 'Test',
  started_at: '2024-01-01T00:00:00Z', completed_at: '2024-01-01T00:00:02Z',
  status: 'complete',
  steps: [
    {
      node_id: 'start', node_name: 'Start', node_type: 'START', status: 'success',
      started_at: '2024-01-01T00:00:00Z', completed_at: '2024-01-01T00:00:01Z',
      input: { query: 'hello' }, output: { result: 'world' },
    },
    {
      node_id: 'llm-1', node_name: 'Generate Reply', node_type: 'LLM', status: 'success',
      started_at: '2024-01-01T00:00:01Z', completed_at: '2024-01-01T00:00:02Z',
      input: { text: 'hi' }, output: { reply: 'Hello!' },
    },
  ],
};

const PAUSED_TRACE: ExecutionTrace = {
  ...COMPLETE_TRACE,
  status: 'paused',
  completed_at: undefined,
  steps: [
    COMPLETE_TRACE.steps[0],
    {
      node_id: 'hitl-1', node_name: 'Human Review', node_type: 'HITL', status: 'waiting',
      started_at: '2024-01-01T00:00:01Z',
      input: { context: 'review this' },
    },
  ],
};

function defaultProps(overrides: Partial<Parameters<typeof TracePanel>[0]> = {}) {
  return {
    trace: COMPLETE_TRACE,
    evaluation: null,
    settings: SETTINGS,
    visibleStepCount: COMPLETE_TRACE.steps.length,
    onAdvanceStep: vi.fn(),
    onResume: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  };
}

// ── Step list ─────────────────────────────────────────────────────────
describe('TracePanel — step list', () => {
  it('renders visible step names', () => {
    render(<TracePanel {...defaultProps()} />);
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('Generate Reply')).toBeInTheDocument();
  });

  it('shows empty message when trace has no steps', () => {
    render(<TracePanel {...defaultProps({ trace: { ...COMPLETE_TRACE, steps: [] }, visibleStepCount: 0 })} />);
    expect(screen.getByText(/no steps yet/i)).toBeInTheDocument();
  });

  it('only renders steps up to visibleStepCount', () => {
    render(<TracePanel {...defaultProps({ visibleStepCount: 1 })} />);
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.queryByText('Generate Reply')).not.toBeInTheDocument();
  });

  it('shows node type label for each step', () => {
    render(<TracePanel {...defaultProps()} />);
    expect(screen.getByText('START')).toBeInTheDocument();
    expect(screen.getByText('LLM')).toBeInTheDocument();
  });

  it('shows simulation status badge', () => {
    render(<TracePanel {...defaultProps()} />);
    expect(screen.getByText('complete')).toBeInTheDocument();
  });
});

// ── Expand / collapse ─────────────────────────────────────────────────
describe('TracePanel — expand/collapse', () => {
  it('shows input and output JSON when a step is expanded', () => {
    render(<TracePanel {...defaultProps()} />);
    fireEvent.click(screen.getByText('Start'));
    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('Output')).toBeInTheDocument();
  });

  it('collapses the detail area on a second click', () => {
    render(<TracePanel {...defaultProps()} />);
    fireEvent.click(screen.getByText('Start'));
    expect(screen.getByText('Input')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Start'));
    expect(screen.queryByText('Input')).not.toBeInTheDocument();
  });

  it('expands each step independently', () => {
    render(<TracePanel {...defaultProps()} />);
    fireEvent.click(screen.getByText('Start'));
    // Only the Start step's detail should be visible, not Generate Reply's
    expect(screen.getAllByText('Input')).toHaveLength(1);
  });
});

// ── HITL pause ────────────────────────────────────────────────────────
describe('TracePanel — HITL pause bar', () => {
  it('shows waiting label when trace is paused', () => {
    render(<TracePanel {...defaultProps({ trace: PAUSED_TRACE, visibleStepCount: PAUSED_TRACE.steps.length })} />);
    expect(screen.getByText(/waiting for review/i)).toBeInTheDocument();
  });

  it('shows Approve and Reject buttons when paused', () => {
    render(<TracePanel {...defaultProps({ trace: PAUSED_TRACE, visibleStepCount: PAUSED_TRACE.steps.length })} />);
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('does not show HITL bar when trace is complete', () => {
    render(<TracePanel {...defaultProps()} />);
    expect(screen.queryByText(/waiting for review/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
  });

  it('calls onResume with approve when Approve is clicked', () => {
    const onResume = vi.fn();
    render(<TracePanel {...defaultProps({ trace: PAUSED_TRACE, visibleStepCount: PAUSED_TRACE.steps.length, onResume })} />);
    fireEvent.click(screen.getByText('Approve'));
    expect(onResume).toHaveBeenCalledWith('hitl-1', 'approve');
  });

  it('calls onResume with reject when Reject is clicked', () => {
    const onResume = vi.fn();
    render(<TracePanel {...defaultProps({ trace: PAUSED_TRACE, visibleStepCount: PAUSED_TRACE.steps.length, onResume })} />);
    fireEvent.click(screen.getByText('Reject'));
    expect(onResume).toHaveBeenCalledWith('hitl-1', 'reject');
  });
});

// ── Clear ─────────────────────────────────────────────────────────────
describe('TracePanel — clear', () => {
  it('calls onClear when Clear button is clicked', () => {
    const onClear = vi.fn();
    render(<TracePanel {...defaultProps({ onClear })} />);
    fireEvent.click(screen.getByText('Clear'));
    expect(onClear).toHaveBeenCalledOnce();
  });
});

// ── Manual step-through ───────────────────────────────────────────────
describe('TracePanel — manual step-through', () => {
  it('shows Next Step button in manual mode when steps remain', () => {
    render(<TracePanel {...defaultProps({ settings: MANUAL_SETTINGS, visibleStepCount: 0 })} />);
    expect(screen.getByText(/Next Step/)).toBeInTheDocument();
  });

  it('hides Next Step button when all steps are already visible', () => {
    render(<TracePanel {...defaultProps({ settings: MANUAL_SETTINGS, visibleStepCount: COMPLETE_TRACE.steps.length })} />);
    expect(screen.queryByText(/Next Step/)).not.toBeInTheDocument();
  });

  it('calls onAdvanceStep when Next Step is clicked', () => {
    const onAdvanceStep = vi.fn();
    render(<TracePanel {...defaultProps({ settings: MANUAL_SETTINGS, visibleStepCount: 0, onAdvanceStep })} />);
    fireEvent.click(screen.getByText(/Next Step/));
    expect(onAdvanceStep).toHaveBeenCalledOnce();
  });

  it('hides Next Step button in animated mode', () => {
    render(<TracePanel {...defaultProps({ settings: { ...SETTINGS, display_mode: 'animated' }, visibleStepCount: 0 })} />);
    expect(screen.queryByText(/Next Step/)).not.toBeInTheDocument();
  });

  it('hides Next Step button in instant mode', () => {
    render(<TracePanel {...defaultProps({ settings: { ...SETTINGS, display_mode: 'instant' }, visibleStepCount: 0 })} />);
    expect(screen.queryByText(/Next Step/)).not.toBeInTheDocument();
  });
});
