import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { WorkflowNodeComponent } from './WorkflowNodeComponent';
import { NodeType } from '../../../models/workflow';

// Stub @xyflow/react so Handle doesn't need a ReactFlow context
vi.mock('@xyflow/react', () => ({
  Handle:   () => null,
  Position: { Top: 'top', Bottom: 'bottom' },
}));

function makeProps(overrides: { executionStatus?: string; nodeType?: NodeType; selected?: boolean } = {}) {
  return {
    data: {
      label:           'Test Node',
      nodeType:        overrides.nodeType ?? NodeType.LLM,
      config:          {},
      executionStatus: overrides.executionStatus,
    },
    selected: overrides.selected ?? false,
  } as Parameters<typeof WorkflowNodeComponent>[0];
}

// ── Status CSS classes ────────────────────────────────────────────────
describe('WorkflowNodeComponent — status CSS classes', () => {
  it('applies node-status--running when status is running', () => {
    const { container } = render(<WorkflowNodeComponent {...makeProps({ executionStatus: 'running' })} />);
    expect(container.firstChild).toHaveClass('node-status--running');
  });

  it('applies node-status--success when status is success', () => {
    const { container } = render(<WorkflowNodeComponent {...makeProps({ executionStatus: 'success' })} />);
    expect(container.firstChild).toHaveClass('node-status--success');
  });

  it('applies node-status--error when status is error', () => {
    const { container } = render(<WorkflowNodeComponent {...makeProps({ executionStatus: 'error' })} />);
    expect(container.firstChild).toHaveClass('node-status--error');
  });

  it('applies node-status--waiting when status is waiting', () => {
    const { container } = render(<WorkflowNodeComponent {...makeProps({ executionStatus: 'waiting' })} />);
    expect(container.firstChild).toHaveClass('node-status--waiting');
  });

  it('applies node-status--pending when status is pending', () => {
    const { container } = render(<WorkflowNodeComponent {...makeProps({ executionStatus: 'pending' })} />);
    expect(container.firstChild).toHaveClass('node-status--pending');
  });

  it('applies no status class when executionStatus is undefined', () => {
    const { container } = render(<WorkflowNodeComponent {...makeProps()} />);
    expect((container.firstChild as HTMLElement).className).toBe('');
  });
});

// ── Pending opacity ───────────────────────────────────────────────────
describe('WorkflowNodeComponent — opacity', () => {
  it('sets opacity 0.4 for pending status', () => {
    const { container } = render(<WorkflowNodeComponent {...makeProps({ executionStatus: 'pending' })} />);
    expect((container.firstChild as HTMLElement).style.opacity).toBe('0.4');
  });

  it('sets opacity 1 for success status', () => {
    const { container } = render(<WorkflowNodeComponent {...makeProps({ executionStatus: 'success' })} />);
    expect((container.firstChild as HTMLElement).style.opacity).toBe('1');
  });

  it('sets opacity 1 when no status is set', () => {
    const { container } = render(<WorkflowNodeComponent {...makeProps()} />);
    expect((container.firstChild as HTMLElement).style.opacity).toBe('1');
  });
});

// ── Node content ──────────────────────────────────────────────────────
describe('WorkflowNodeComponent — content', () => {
  it('renders the node type label', () => {
    const { getByText } = render(<WorkflowNodeComponent {...makeProps()} />);
    expect(getByText('LLM')).toBeInTheDocument();
  });

  it('renders the node name for non-circle nodes', () => {
    const { getByText } = render(<WorkflowNodeComponent {...makeProps()} />);
    expect(getByText('Test Node')).toBeInTheDocument();
  });

  it('does not render name label for START node', () => {
    const { queryByText } = render(<WorkflowNodeComponent {...makeProps({ nodeType: NodeType.START })} />);
    expect(queryByText('Test Node')).not.toBeInTheDocument();
  });
});
