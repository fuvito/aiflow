import { NodeType } from '../../../models/workflow';
import type { NodeType as NodeTypeVal } from '../../../models/workflow';

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select';
  placeholder?: string;
  options?: string[];
}

export interface NodeDefinition {
  type: NodeTypeVal;
  label: string;
  color: string;
  textColor: string;
  configFields: ConfigField[];
}

export const NODE_DEFINITIONS: Record<NodeTypeVal, NodeDefinition> = {
  [NodeType.START]: {
    type: NodeType.START,
    label: 'Start',
    color: '#22c55e',
    textColor: '#fff',
    configFields: [],
  },
  [NodeType.END]: {
    type: NodeType.END,
    label: 'End',
    color: '#ef4444',
    textColor: '#fff',
    configFields: [],
  },
  [NodeType.LLM]: {
    type: NodeType.LLM,
    label: 'LLM',
    color: '#3b82f6',
    textColor: '#fff',
    configFields: [
      { key: 'model', label: 'Model', type: 'text', placeholder: 'gpt-4o-mini' },
      { key: 'prompt', label: 'Prompt', type: 'textarea', placeholder: 'Enter system prompt...' },
      { key: 'temperature', label: 'Temperature', type: 'number', placeholder: '0.7' },
    ],
  },
  [NodeType.TOOL]: {
    type: NodeType.TOOL,
    label: 'Tool',
    color: '#8b5cf6',
    textColor: '#fff',
    configFields: [
      { key: 'name', label: 'Tool Name', type: 'text', placeholder: 'my_tool' },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'What this tool does...' },
    ],
  },
  [NodeType.API]: {
    type: NodeType.API,
    label: 'API',
    color: '#f97316',
    textColor: '#fff',
    configFields: [
      { key: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
      { key: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com/endpoint' },
    ],
  },
  [NodeType.DATABASE]: {
    type: NodeType.DATABASE,
    label: 'Database',
    color: '#eab308',
    textColor: '#fff',
    configFields: [
      { key: 'type', label: 'DB Type', type: 'select', options: ['postgresql', 'mysql', 'sqlite', 'mongodb'] },
      { key: 'connection', label: 'Connection Ref', type: 'text', placeholder: 'env:DB_URL' },
      { key: 'query', label: 'Query', type: 'textarea', placeholder: 'SELECT ...' },
    ],
  },
  [NodeType.RAG]: {
    type: NodeType.RAG,
    label: 'RAG',
    color: '#14b8a6',
    textColor: '#fff',
    configFields: [
      { key: 'knowledgeBase', label: 'Knowledge Base', type: 'text', placeholder: 'my-docs' },
      { key: 'topK', label: 'Top K', type: 'number', placeholder: '5' },
      { key: 'similarityThreshold', label: 'Similarity Threshold', type: 'number', placeholder: '0.7' },
    ],
  },
  [NodeType.CONDITION]: {
    type: NodeType.CONDITION,
    label: 'Condition',
    color: '#f59e0b',
    textColor: '#fff',
    configFields: [
      { key: 'expression', label: 'Expression', type: 'textarea', placeholder: 'output.intent == "complex"' },
    ],
  },
  [NodeType.HITL]: {
    type: NodeType.HITL,
    label: 'Human Review',
    color: '#ec4899',
    textColor: '#fff',
    configFields: [
      { key: 'instructions', label: 'Instructions', type: 'textarea', placeholder: 'Review and approve...' },
    ],
  },
  [NodeType.TRANSFORM]: {
    type: NodeType.TRANSFORM,
    label: 'Transform',
    color: '#64748b',
    textColor: '#fff',
    configFields: [
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe the transformation...' },
    ],
  },
};

export function getNodeDefinition(type: NodeTypeVal): NodeDefinition {
  return NODE_DEFINITIONS[type];
}
