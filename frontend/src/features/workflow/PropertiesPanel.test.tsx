import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertiesPanel } from './PropertiesPanel';
import { NodeType } from '../../models/workflow';
import type { Workflow } from '../../models/workflow';

function makeWorkflow(): Workflow {
  return {
    version: '1.0',
    id: 'wf-1',
    name: 'Test',
    description: '',
    nodes: [
      { id: 'start', type: NodeType.START, name: 'Start', position: { x: 0, y: 0 }, config: {} },
      {
        id: 'llm-1',
        type: NodeType.LLM,
        name: 'My LLM',
        position: { x: 0, y: 200 },
        config: { prompt: 'Hello', temperature: 0.5 },
      },
    ],
    edges: [{ source: 'start', target: 'llm-1' }],
    metadata: {},
  };
}

describe('PropertiesPanel — empty state', () => {
  it('shows placeholder when no node is selected', () => {
    render(
      <PropertiesPanel
        workflow={makeWorkflow()}
        selectedNodeId={null}
        onNameChange={vi.fn()}
        onConfigChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/select a node/i)).toBeInTheDocument();
  });
});

describe('PropertiesPanel — node selected', () => {
  it('shows selected node name in editable input', () => {
    render(
      <PropertiesPanel
        workflow={makeWorkflow()}
        selectedNodeId="llm-1"
        onNameChange={vi.fn()}
        onConfigChange={vi.fn()}
      />,
    );
    const input = screen.getByDisplayValue('My LLM');
    expect(input).toBeInTheDocument();
  });

  it('shows node type badge', () => {
    render(
      <PropertiesPanel
        workflow={makeWorkflow()}
        selectedNodeId="llm-1"
        onNameChange={vi.fn()}
        onConfigChange={vi.fn()}
      />,
    );
    expect(screen.getByText('LLM')).toBeInTheDocument();
  });

  it('shows config fields for LLM node', () => {
    render(
      <PropertiesPanel
        workflow={makeWorkflow()}
        selectedNodeId="llm-1"
        onNameChange={vi.fn()}
        onConfigChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Prompt')).toBeInTheDocument();
    expect(screen.getByText('Temperature')).toBeInTheDocument();
  });

  it('shows no config fields for START node', () => {
    render(
      <PropertiesPanel
        workflow={makeWorkflow()}
        selectedNodeId="start"
        onNameChange={vi.fn()}
        onConfigChange={vi.fn()}
      />,
    );
    expect(screen.queryByText('Prompt')).not.toBeInTheDocument();
  });

  it('calls onNameChange when name is edited', () => {
    const onNameChange = vi.fn();
    render(
      <PropertiesPanel
        workflow={makeWorkflow()}
        selectedNodeId="llm-1"
        onNameChange={onNameChange}
        onConfigChange={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByDisplayValue('My LLM'), { target: { value: 'Renamed' } });
    expect(onNameChange).toHaveBeenCalledWith('llm-1', 'Renamed');
  });

  it('calls onConfigChange when config field is edited', () => {
    const onConfigChange = vi.fn();
    render(
      <PropertiesPanel
        workflow={makeWorkflow()}
        selectedNodeId="llm-1"
        onNameChange={vi.fn()}
        onConfigChange={onConfigChange}
      />,
    );
    // Temperature is a number input — find it by current value
    const tempInput = screen.getByDisplayValue('0.5');
    fireEvent.change(tempInput, { target: { value: '0.9' } });
    expect(onConfigChange).toHaveBeenCalledWith('llm-1', 'temperature', 0.9);
  });
});
