import type { Workflow } from '../models/workflow';
import { NodeType } from '../models/workflow';

const CURRENT_VERSION = '1.0';

export function serializeWorkflow(workflow: Workflow): string {
  return JSON.stringify(workflow, null, 2);
}

export function deserializeWorkflow(json: string): Workflow {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON: could not parse workflow file.');
  }
  assertWorkflow(data);
  return data;
}

function assertWorkflow(data: unknown): asserts data is Workflow {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid workflow: root must be an object.');
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== 'string') {
    throw new Error('Invalid workflow: missing "version" field.');
  }
  if (typeof obj.id !== 'string') {
    throw new Error('Invalid workflow: missing "id" field.');
  }
  if (typeof obj.name !== 'string') {
    throw new Error('Invalid workflow: missing "name" field.');
  }
  if (!Array.isArray(obj.nodes)) {
    throw new Error('Invalid workflow: "nodes" must be an array.');
  }
  if (!Array.isArray(obj.edges)) {
    throw new Error('Invalid workflow: "edges" must be an array.');
  }

  const validTypes = new Set<string>(Object.values(NodeType));
  for (const node of obj.nodes as Record<string, unknown>[]) {
    if (typeof node.id !== 'string') {
      throw new Error('Invalid workflow: node is missing "id".');
    }
    if (!validTypes.has(node.type as string)) {
      throw new Error(`Invalid workflow: unknown node type "${node.type as string}".`);
    }
    if (typeof node.name !== 'string') {
      throw new Error(`Invalid workflow: node "${node.id as string}" is missing "name".`);
    }
  }

  for (const edge of obj.edges as Record<string, unknown>[]) {
    if (typeof edge.source !== 'string' || typeof edge.target !== 'string') {
      throw new Error('Invalid workflow: each edge must have "source" and "target".');
    }
  }
}

export function createDefaultWorkflow(overrides?: Partial<Workflow>): Workflow {
  const id = crypto.randomUUID();
  return {
    version: CURRENT_VERSION,
    id,
    name: 'Untitled Workflow',
    description: '',
    nodes: [
      {
        id: 'start',
        type: NodeType.START,
        name: 'Start',
        position: { x: 250, y: 100 },
        config: {},
      },
      {
        id: 'end',
        type: NodeType.END,
        name: 'End',
        position: { x: 250, y: 300 },
        config: {},
      },
    ],
    edges: [{ source: 'start', target: 'end' }],
    metadata: {},
    ...overrides,
  };
}
