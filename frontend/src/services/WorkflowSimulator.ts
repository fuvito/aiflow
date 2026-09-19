import type { Workflow } from '../models/workflow';

/**
 * WorkflowSimulator — MVP2
 *
 * Executes a workflow against mock implementations of every node type,
 * producing a step-by-step execution trace without calling real external services.
 *
 * Responsibilities:
 *   - Walk the workflow graph from START to END, following edge conditions
 *   - Call mock handlers per node type (mock LLM, mock API, mock DB, mock RAG)
 *   - Capture inputs and outputs at each node
 *   - Support error simulation and retry simulation
 *   - Return a full ExecutionTrace for display in the UI
 *
 * Future usage:
 *   const simulator = new WorkflowSimulator(mockHandlers);
 *   const trace = await simulator.run(workflow, initialInput);
 *   // trace.steps — array of { nodeId, input, output, duration, status }
 */
export interface NodeExecutionStep {
  nodeId: string;
  nodeName: string;
  input: unknown;
  output: unknown;
  durationMs: number;
  status: 'success' | 'error' | 'skipped';
  error?: string;
}

export interface ExecutionTrace {
  workflowId: string;
  startedAt: string;
  completedAt: string;
  steps: NodeExecutionStep[];
  finalOutput: unknown;
  status: 'success' | 'error';
}

export interface WorkflowSimulator {
  run(workflow: Workflow, input: unknown): Promise<ExecutionTrace>;
}

// Not yet implemented — placeholder to establish the interface for MVP2.
