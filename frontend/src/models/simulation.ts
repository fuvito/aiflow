export type NodeExecutionStatus = 'pending' | 'running' | 'success' | 'error' | 'waiting';

export interface NodeExecution {
  node_id: string;
  node_name: string;
  node_type: string;
  status: NodeExecutionStatus;
  started_at: string;
  completed_at?: string;
  input?: unknown;
  output?: unknown;
  error?: string;
}

export interface ExecutionTrace {
  trace_id: string;
  workflow_id: string;
  workflow_name: string;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'paused' | 'complete' | 'error';
  steps: NodeExecution[];
}

export interface SimulationEvaluation {
  score: number;
  summary: string;
  strengths: string[];
  issues: string[];
  recommendations: string[];
}

export interface SimulationSettings {
  llm_mode: 'mock';
  hitl_mode: 'auto-approve' | 'pause';
  condition_mode: 'user-pick' | 'expression' | 'random';
  display_mode: 'animated' | 'instant' | 'manual';
  animation_delay_ms: number;
  evaluate: boolean;
}
