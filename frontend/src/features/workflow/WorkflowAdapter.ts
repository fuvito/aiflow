import type { Node as RFNode, Edge as RFEdge } from '@xyflow/react';
import { NodeType, type Workflow, type WorkflowNode, type WorkflowEdge } from '../../models/workflow';

export interface RFNodeData extends Record<string, unknown> {
  nodeType: NodeType;
  label: string;
  executionStatus?: string;
}

export type WorkflowRFNode = RFNode<RFNodeData, 'workflowNode'>;

export function workflowToReactFlow(workflow: Workflow): {
  nodes: WorkflowRFNode[];
  edges: RFEdge[];
} {
  const nodes: WorkflowRFNode[] = workflow.nodes.map((n) => {
    const isCircle = n.type === NodeType.START || n.type === NodeType.END;
    return {
      id: n.id,
      type: 'workflowNode' as const,
      position: { x: n.position.x, y: n.position.y },
      data: { nodeType: n.type, label: n.name },
      // explicit width prevents React Flow starting at 0; height measured from DOM for rect nodes
      width: isCircle ? 64 : 160,
      ...(isCircle ? { height: 64 } : {}),
    };
  });

  const edges: RFEdge[] = workflow.edges.map((e) => ({
    id: `${e.source}→${e.target}`,
    source: e.source,
    target: e.target,
    label: e.condition ?? undefined,
    type: 'smoothstep',
    data: { notes: e.notes ?? '' },
  }));

  return { nodes, edges };
}

export function applyNodePositions(workflow: Workflow, rfNodes: RFNode[]): Workflow {
  const posMap = new Map(rfNodes.map((n) => [n.id, n.position]));
  return {
    ...workflow,
    nodes: workflow.nodes.map((n) => ({
      ...n,
      position: posMap.get(n.id) ?? n.position,
    })),
  };
}

export function applyEdges(workflow: Workflow, rfEdges: RFEdge[]): Workflow {
  const existing = new Map(workflow.edges.map((e) => [`${e.source}→${e.target}`, e]));
  const edges: WorkflowEdge[] = rfEdges.map((e) => {
    const prev = existing.get(`${e.source}→${e.target}`);
    return {
      source: e.source,
      target: e.target,
      condition: typeof e.label === 'string' ? e.label : undefined,
      notes: (e.data as { notes?: string } | undefined)?.notes || prev?.notes,
      metadata: {},
    };
  });
  return { ...workflow, edges };
}

export function updateEdge(
  workflow: Workflow,
  source: string,
  target: string,
  updates: { condition?: string; notes?: string },
): Workflow {
  return {
    ...workflow,
    edges: workflow.edges.map((e) =>
      e.source === source && e.target === target ? { ...e, ...updates } : e,
    ),
  };
}

export function addNode(
  workflow: Workflow,
  type: NodeType,
  position: { x: number; y: number },
): Workflow {
  const id = `${type.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`;
  const newNode: WorkflowNode = {
    id,
    type,
    name: type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' '),
    position,
    config: {},
  };
  return { ...workflow, nodes: [...workflow.nodes, newNode] };
}

export function removeNode(workflow: Workflow, nodeId: string): Workflow {
  return {
    ...workflow,
    nodes: workflow.nodes.filter((n) => n.id !== nodeId),
    edges: workflow.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
  };
}

export function updateNodeName(workflow: Workflow, nodeId: string, name: string): Workflow {
  return {
    ...workflow,
    nodes: workflow.nodes.map((n) => (n.id === nodeId ? { ...n, name } : n)),
  };
}

export function updateNodeConfig(
  workflow: Workflow,
  nodeId: string,
  key: string,
  value: unknown,
): Workflow {
  return {
    ...workflow,
    nodes: workflow.nodes.map((n) =>
      n.id === nodeId ? { ...n, config: { ...n.config, [key]: value } } : n,
    ),
  };
}
