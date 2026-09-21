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

export function autoLayoutWorkflow(workflow: Workflow): Workflow {
  const { nodes, edges } = workflow;
  if (nodes.length === 0) return workflow;

  const NODE_W = 160, NODE_H = 60, CIRCLE = 64;
  const COL_GAP = 80, ROW_GAP = 100;

  const outEdges = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  const inCount = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (const e of edges) {
    outEdges.get(e.source)?.push(e.target);
    inCount.set(e.target, (inCount.get(e.target) ?? 0) + 1);
  }

  // Kahn's BFS with longest-path layer assignment
  const layer = new Map<string, number>();
  const tempIn = new Map(inCount);
  const queue: string[] = [];
  for (const [id, cnt] of tempIn) {
    if (cnt === 0) { queue.push(id); layer.set(id, 0); }
  }
  let i = 0;
  while (i < queue.length) {
    const id = queue[i++];
    const l = layer.get(id) ?? 0;
    for (const next of (outEdges.get(id) ?? [])) {
      if (!layer.has(next) || layer.get(next)! < l + 1) layer.set(next, l + 1);
      const rem = (tempIn.get(next) ?? 1) - 1;
      tempIn.set(next, rem);
      if (rem === 0) queue.push(next);
    }
  }
  // Nodes in cycles get a layer after the rest
  const maxLayer = layer.size > 0 ? Math.max(...layer.values()) : 0;
  for (const n of nodes) if (!layer.has(n.id)) layer.set(n.id, maxLayer + 1);

  // Group nodes by layer, preserving relative horizontal order
  const byLayer = new Map<number, string[]>();
  for (const [id, l] of layer) {
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(id);
  }
  for (const [l, ids] of byLayer) {
    ids.sort((a, b) => {
      const xa = nodes.find((n) => n.id === a)?.position.x ?? 0;
      const xb = nodes.find((n) => n.id === b)?.position.x ?? 0;
      return xa - xb;
    });
    byLayer.set(l, ids);
  }

  // Compute centered positions per layer
  const positions = new Map<string, { x: number; y: number }>();
  const totalLayers = Math.max(...layer.values()) + 1;
  for (let l = 0; l < totalLayers; l++) {
    const ids = byLayer.get(l) ?? [];
    const widths = ids.map((id) => {
      const n = nodes.find((nd) => nd.id === id);
      return n?.type === NodeType.START || n?.type === NodeType.END ? CIRCLE : NODE_W;
    });
    const totalW = widths.reduce((s, w) => s + w, 0) + COL_GAP * (ids.length - 1);
    let x = -totalW / 2;
    for (let j = 0; j < ids.length; j++) {
      positions.set(ids[j], { x, y: l * (NODE_H + ROW_GAP) });
      x += widths[j] + COL_GAP;
    }
  }

  return {
    ...workflow,
    nodes: nodes.map((n) => ({ ...n, position: positions.get(n.id) ?? n.position })),
  };
}

export type AlignmentType = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom';

export function alignNodes(
  workflow: Workflow,
  nodeIds: string[],
  alignment: AlignmentType,
  dimensions: Map<string, { width: number; height: number }>,
): Workflow {
  const selected = workflow.nodes.filter((n) => nodeIds.includes(n.id));
  if (selected.length < 2) return workflow;

  const w = (id: string) => dimensions.get(id)?.width ?? 160;
  const h = (id: string) => dimensions.get(id)?.height ?? 60;

  const updates = new Map<string, { x: number; y: number }>();

  if (alignment === 'left') {
    const minX = Math.min(...selected.map((n) => n.position.x));
    selected.forEach((n) => updates.set(n.id, { ...n.position, x: minX }));
  } else if (alignment === 'right') {
    const maxX = Math.max(...selected.map((n) => n.position.x + w(n.id)));
    selected.forEach((n) => updates.set(n.id, { ...n.position, x: maxX - w(n.id) }));
  } else if (alignment === 'center-h') {
    const avg = selected.reduce((s, n) => s + n.position.x + w(n.id) / 2, 0) / selected.length;
    selected.forEach((n) => updates.set(n.id, { ...n.position, x: avg - w(n.id) / 2 }));
  } else if (alignment === 'top') {
    const minY = Math.min(...selected.map((n) => n.position.y));
    selected.forEach((n) => updates.set(n.id, { ...n.position, y: minY }));
  } else if (alignment === 'bottom') {
    const maxY = Math.max(...selected.map((n) => n.position.y + h(n.id)));
    selected.forEach((n) => updates.set(n.id, { ...n.position, y: maxY - h(n.id) }));
  } else if (alignment === 'center-v') {
    const avg = selected.reduce((s, n) => s + n.position.y + h(n.id) / 2, 0) / selected.length;
    selected.forEach((n) => updates.set(n.id, { ...n.position, y: avg - h(n.id) / 2 }));
  }

  return {
    ...workflow,
    nodes: workflow.nodes.map((n) => (updates.has(n.id) ? { ...n, position: updates.get(n.id)! } : n)),
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
