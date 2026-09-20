import type { Workflow } from '../models/workflow';
import { NodeType } from '../models/workflow';

function extractTemplateVars(text: string): string[] {
  const matches = text.match(/\{\{?(\w+)\}?\}/g) ?? [];
  return [...new Set(matches.map((m) => m.replace(/[{}]/g, '')))].filter(Boolean);
}

function extractDataRefs(expr: string): string[] {
  const matches = expr.match(/(?:data|input|context|payload)\.(\w+)/g) ?? [];
  return [...new Set(matches.map((r) => r.split('.')[1]))];
}

function placeholder(key: string): unknown {
  const k = key.toLowerCase().replace(/[-_]/g, '');
  if (/^(id|userid|employeeid|customerid|orderid|recordid)$/.test(k)) return 'usr_123';
  if (/^(message|query|question|prompt|text|request|input|ask|search)$/.test(k)) return 'How do I reset my password?';
  if (/^(name|username|firstname|lastname|fullname)$/.test(k)) return 'Alice';
  if (/^(email)$/.test(k)) return 'alice@example.com';
  if (/^(amount|price|total|cost|budget)$/.test(k)) return 99.99;
  if (/^(count|limit|page|offset|topk)$/.test(k)) return 10;
  if (/^(status|state|type|category|tier|level|role)$/.test(k)) return 'standard';
  if (/^(content|body|description|summary|details)$/.test(k)) return '<content>';
  if (/^(date|datetime|timestamp|createdat|updatedat)$/.test(k)) return new Date().toISOString().slice(0, 10);
  if (/^(flag|enabled|active|approved|verified)$/.test(k)) return true;
  return `<${key}>`;
}

export function scaffoldSampleInput(workflow: Workflow): string {
  const fields: Record<string, unknown> = {};

  for (const node of workflow.nodes) {
    const cfg = node.config as Record<string, unknown>;

    if (node.type === NodeType.LLM) {
      for (const v of extractTemplateVars((cfg.prompt as string) ?? '')) {
        if (!(v in fields)) fields[v] = placeholder(v);
      }
    }

    if (node.type === NodeType.CONDITION) {
      for (const v of extractDataRefs((cfg.expression as string) ?? '')) {
        if (!(v in fields)) fields[v] = placeholder(v);
      }
    }

    if (node.type === NodeType.API) {
      for (const v of extractTemplateVars((cfg.url as string) ?? '')) {
        if (!(v in fields)) fields[v] = placeholder(v);
      }
      const req = cfg.requestSchema as Record<string, unknown> | undefined;
      if (req) {
        for (const k of Object.keys(req)) {
          if (!(k in fields)) fields[k] = placeholder(k);
        }
      }
    }

    if (node.type === NodeType.DATABASE) {
      const query = (cfg.query as string) ?? '';
      const params = [
        ...[...query.matchAll(/:(\w+)/g)].map((m) => m[1]),
        ...extractTemplateVars(query),
      ];
      for (const v of [...new Set(params)]) {
        if (!(v in fields)) fields[v] = placeholder(v);
      }
    }

    if (node.type === NodeType.TOOL || node.type === NodeType.TRANSFORM) {
      const schema = cfg.inputSchema as Record<string, unknown> | undefined;
      if (schema) {
        for (const k of Object.keys(schema)) {
          if (!(k in fields)) fields[k] = placeholder(k);
        }
      }
    }
  }

  // Fallback: minimal scaffold from node types present
  if (Object.keys(fields).length === 0) {
    const types = new Set(workflow.nodes.map((n) => n.type));
    if (types.has(NodeType.LLM))      fields.query    = 'How do I reset my password?';
    if (types.has(NodeType.RAG))       fields.question = 'What is the refund policy?';
    if (types.has(NodeType.API) ||
        types.has(NodeType.DATABASE))  fields.user_id  = 'usr_123';
    if (types.has(NodeType.HITL))      fields.content  = '<content to review>';
    if (Object.keys(fields).length === 0) fields.input = '<workflow input>';
  }

  return JSON.stringify(fields, null, 2);
}
