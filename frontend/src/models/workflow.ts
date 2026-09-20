// Use const object + type union instead of enum (required by erasableSyntaxOnly)
export const NodeType = {
  START: 'START',
  END: 'END',
  LLM: 'LLM',
  TOOL: 'TOOL',
  API: 'API',
  DATABASE: 'DATABASE',
  RAG: 'RAG',
  CONDITION: 'CONDITION',
  HITL: 'HITL',
  TRANSFORM: 'TRANSFORM',
} as const;

export type NodeType = (typeof NodeType)[keyof typeof NodeType];

export interface Position {
  x: number;
  y: number;
}

export interface LLMConfig {
  model?: string;
  prompt?: string;
  temperature?: number;
}

export interface ToolConfig {
  name?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface APIConfig {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  requestSchema?: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
}

export interface DatabaseConfig {
  type?: string;
  connection?: string;
  query?: string;
}

export interface RAGConfig {
  knowledgeBase?: string;
  topK?: number;
  similarityThreshold?: number;
}

export interface ConditionConfig {
  expression?: string;
}

export interface HITLConfig {
  instructions?: string;
}

export interface TransformConfig {
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export type NodeConfig =
  | LLMConfig
  | ToolConfig
  | APIConfig
  | DatabaseConfig
  | RAGConfig
  | ConditionConfig
  | HITLConfig
  | TransformConfig
  | Record<string, unknown>;

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  position: Position;
  config: NodeConfig;
}

export interface WorkflowEdge {
  source: string;
  target: string;
  condition?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface Workflow {
  version: string;
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata?: Record<string, unknown>;
}
