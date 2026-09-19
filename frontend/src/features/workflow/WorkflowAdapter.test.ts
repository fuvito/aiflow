import { describe, it, expect } from 'vitest';
import {
  workflowToReactFlow,
  applyNodePositions,
  applyEdges,
  addNode,
  removeNode,
  updateNodeName,
  updateNodeConfig,
} from './WorkflowAdapter';
import { NodeType } from '../../models/workflow';
import type { Workflow } from '../../models/workflow';

function makeWorkflow(overrides?: Partial<Workflow>): Workflow {
  return {
    version: '1.0',
    id: 'test-wf',
    name: 'Test',
    description: '',
    nodes: [
      { id: 'start', type: NodeType.START, name: 'Start', position: { x: 100, y: 100 }, config: {} },
      { id: 'end',   type: NodeType.END,   name: 'End',   position: { x: 100, y: 300 }, config: {} },
    ],
    edges: [{ source: 'start', target: 'end' }],
    metadata: {},
    ...overrides,
  };
}

// ── workflowToReactFlow ─────────────────────────────────────────────

describe('workflowToReactFlow', () => {
  it('maps nodes to RF nodes with correct type and data', () => {
    const { nodes } = workflowToReactFlow(makeWorkflow());
    expect(nodes).toHaveLength(2);
    expect(nodes[0].type).toBe('workflowNode');
    expect(nodes[0].data.nodeType).toBe(NodeType.START);
    expect(nodes[0].data.label).toBe('Start');
    expect(nodes[0].position).toEqual({ x: 100, y: 100 });
  });

  it('maps edges with source and target', () => {
    const { edges } = workflowToReactFlow(makeWorkflow());
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('start');
    expect(edges[0].target).toBe('end');
  });

  it('sets edge label from condition', () => {
    const wf = makeWorkflow({
      edges: [{ source: 'start', target: 'end', condition: 'simple' }],
    });
    const { edges } = workflowToReactFlow(wf);
    expect(edges[0].label).toBe('simple');
  });

  it('produces a unique edge id per edge', () => {
    const wf = makeWorkflow({
      nodes: [
        ...makeWorkflow().nodes,
        { id: 'mid', type: NodeType.LLM, name: 'Mid', position: { x: 100, y: 200 }, config: {} },
      ],
      edges: [
        { source: 'start', target: 'mid' },
        { source: 'mid',   target: 'end' },
      ],
    });
    const { edges } = workflowToReactFlow(wf);
    const ids = edges.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── applyNodePositions ──────────────────────────────────────────────

describe('applyNodePositions', () => {
  it('updates positions from RF nodes', () => {
    const wf = makeWorkflow();
    const rfNodes = [
      { id: 'start', position: { x: 999, y: 888 }, data: {}, type: 'workflowNode' } as any,
      { id: 'end',   position: { x: 111, y: 222 }, data: {}, type: 'workflowNode' } as any,
    ];
    const updated = applyNodePositions(wf, rfNodes);
    expect(updated.nodes[0].position).toEqual({ x: 999, y: 888 });
    expect(updated.nodes[1].position).toEqual({ x: 111, y: 222 });
  });

  it('keeps original position when RF node is missing', () => {
    const wf = makeWorkflow();
    const updated = applyNodePositions(wf, []);
    expect(updated.nodes[0].position).toEqual({ x: 100, y: 100 });
  });
});

// ── applyEdges ──────────────────────────────────────────────────────

describe('applyEdges', () => {
  it('replaces workflow edges from RF edges', () => {
    const wf = makeWorkflow();
    const rfEdges = [
      { id: 'e1', source: 'start', target: 'end', label: 'ok' } as any,
    ];
    const updated = applyEdges(wf, rfEdges);
    expect(updated.edges).toHaveLength(1);
    expect(updated.edges[0].condition).toBe('ok');
  });

  it('clears edges when given empty array', () => {
    const updated = applyEdges(makeWorkflow(), []);
    expect(updated.edges).toHaveLength(0);
  });
});

// ── addNode ─────────────────────────────────────────────────────────

describe('addNode', () => {
  it('adds a node with correct type and position', () => {
    const wf = makeWorkflow();
    const updated = addNode(wf, NodeType.LLM, { x: 200, y: 200 });
    expect(updated.nodes).toHaveLength(3);
    const newNode = updated.nodes[2];
    expect(newNode.type).toBe(NodeType.LLM);
    expect(newNode.position).toEqual({ x: 200, y: 200 });
  });

  it('generates a unique id', () => {
    const wf = makeWorkflow();
    const a = addNode(wf, NodeType.LLM, { x: 0, y: 0 });
    const b = addNode(a, NodeType.LLM, { x: 0, y: 0 });
    const ids = b.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not mutate the original workflow', () => {
    const wf = makeWorkflow();
    addNode(wf, NodeType.TOOL, { x: 0, y: 0 });
    expect(wf.nodes).toHaveLength(2);
  });
});

// ── removeNode ──────────────────────────────────────────────────────

describe('removeNode', () => {
  it('removes the node by id', () => {
    const updated = removeNode(makeWorkflow(), 'start');
    expect(updated.nodes.find((n) => n.id === 'start')).toBeUndefined();
  });

  it('removes edges connected to the removed node', () => {
    const updated = removeNode(makeWorkflow(), 'start');
    expect(updated.edges).toHaveLength(0);
  });

  it('does not mutate the original workflow', () => {
    const wf = makeWorkflow();
    removeNode(wf, 'start');
    expect(wf.nodes).toHaveLength(2);
  });
});

// ── updateNodeName ──────────────────────────────────────────────────

describe('updateNodeName', () => {
  it('updates the name of the target node only', () => {
    const updated = updateNodeName(makeWorkflow(), 'start', 'Entry');
    expect(updated.nodes[0].name).toBe('Entry');
    expect(updated.nodes[1].name).toBe('End');
  });
});

// ── updateNodeConfig ────────────────────────────────────────────────

describe('updateNodeConfig', () => {
  it('merges config key into target node', () => {
    const wf = makeWorkflow();
    const updated = updateNodeConfig(wf, 'start', 'prompt', 'hello');
    expect((updated.nodes[0].config as Record<string, unknown>).prompt).toBe('hello');
  });

  it('does not affect other nodes', () => {
    const updated = updateNodeConfig(makeWorkflow(), 'start', 'x', 1);
    expect((updated.nodes[1].config as Record<string, unknown>).x).toBeUndefined();
  });
});
