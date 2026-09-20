import { useState, useMemo } from 'react';
import type { Workflow } from '../../models/workflow';
import { deserializeWorkflow } from '../../utils/workflowSerializer';

// ── Static example catalog ───────────────────────────────────────────
import emailAutoReply        from '../../../../examples/easy/email-auto-reply.json';
import sentimentClassifier   from '../../../../examples/easy/sentiment-classifier.json';
import dataEnrichment        from '../../../../examples/easy/data-enrichment.json';
import customerSupport       from '../../../../examples/medium/customer-support.json';
import contentModeration     from '../../../../examples/medium/content-moderation.json';
import invoiceProcessing     from '../../../../examples/medium/invoice-processing.json';
import hrOnboarding          from '../../../../examples/medium/hr-onboarding.json';
import aiResearchAgent       from '../../../../examples/complex/ai-research-agent.json';
import supplyChainMonitor    from '../../../../examples/complex/supply-chain-monitor.json';
import multiAgentJourney     from '../../../../examples/complex/multi-agent-customer-journey.json';

interface ExampleEntry {
  json: object;
  difficulty: 'easy' | 'medium' | 'complex';
  industry: string;
  nodeCount: number;
  tags: string[];
}

const CATALOG: ExampleEntry[] = [
  { json: emailAutoReply,      difficulty: 'easy',    industry: 'Customer Service',       nodeCount: 3,  tags: ['email', 'llm', 'auto-reply'] },
  { json: sentimentClassifier, difficulty: 'easy',    industry: 'Marketing',              nodeCount: 5,  tags: ['sentiment', 'classification', 'routing'] },
  { json: dataEnrichment,      difficulty: 'easy',    industry: 'Sales / CRM',            nodeCount: 4,  tags: ['api', 'transform', 'enrichment'] },
  { json: customerSupport,     difficulty: 'medium',  industry: 'Customer Service',       nodeCount: 8,  tags: ['rag', 'hitl', 'routing'] },
  { json: contentModeration,   difficulty: 'medium',  industry: 'Social Media / Platform',nodeCount: 7,  tags: ['content-moderation', 'rag', 'hitl'] },
  { json: invoiceProcessing,   difficulty: 'medium',  industry: 'Finance / Operations',   nodeCount: 7,  tags: ['invoice', 'approval', 'database', 'hitl'] },
  { json: hrOnboarding,        difficulty: 'medium',  industry: 'Human Resources',        nodeCount: 7,  tags: ['hr', 'onboarding', 'hitl', 'database'] },
  { json: aiResearchAgent,     difficulty: 'complex', industry: 'Research & Analytics',   nodeCount: 12, tags: ['research', 'rag', 'tool', 'hitl'] },
  { json: supplyChainMonitor,  difficulty: 'complex', industry: 'Supply Chain / Logistics',nodeCount: 11, tags: ['supply-chain', 'api', 'hitl', 'database'] },
  { json: multiAgentJourney,   difficulty: 'complex', industry: 'E-commerce / CRM',       nodeCount: 12, tags: ['personalisation', 'rag', 'hitl', 'multi-branch'] },
];

const SECTIONS: { key: 'easy' | 'medium' | 'complex'; label: string; subtitle: string }[] = [
  { key: 'easy',    label: 'Easy',    subtitle: '2–5 nodes · linear flow' },
  { key: 'medium',  label: 'Medium',  subtitle: '6–10 nodes · branching + HITL' },
  { key: 'complex', label: 'Complex', subtitle: '11+ nodes · multi-branch' },
];

const DIFFICULTY_COLOR: Record<string, string> = {
  easy:    '#4ade80',
  medium:  '#fbbf24',
  complex: '#f87171',
};

interface Props {
  onClose: () => void;
  onSelect: (workflow: Workflow) => void;
}

function entryName(entry: ExampleEntry): string {
  return (entry.json as { name: string }).name;
}

function entryDescription(entry: ExampleEntry): string {
  return (entry.json as { description: string }).description;
}

export function ExamplePickerModal({ onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return CATALOG;
    return CATALOG.filter((e) =>
      entryName(e).toLowerCase().includes(q) ||
      e.industry.toLowerCase().includes(q) ||
      entryDescription(e).toLowerCase().includes(q) ||
      e.tags.some((t) => t.includes(q)),
    );
  }, [query]);

  const handleSelect = (entry: ExampleEntry) => {
    const workflow = deserializeWorkflow(JSON.stringify(entry.json));
    onSelect(workflow);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal example-picker-modal">
        <div className="modal-header">
          <span className="modal-title">Example Workflows</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="example-picker-search-row">
          <input
            className="example-picker-search"
            placeholder="Search by name, industry, or tag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="example-picker-body">
          {SECTIONS.map((section) => {
            const entries = filtered.filter((e) => e.difficulty === section.key);
            if (entries.length === 0) return null;
            return (
              <div key={section.key} className="example-section">
                <div className="example-section-header">
                  <span
                    className="example-difficulty-badge"
                    style={{ background: DIFFICULTY_COLOR[section.key] }}
                  >
                    {section.label}
                  </span>
                  <span className="example-section-subtitle">{section.subtitle}</span>
                </div>
                <div className="example-cards">
                  {entries.map((entry) => (
                    <button
                      key={(entry.json as { id: string }).id}
                      className="example-card"
                      onClick={() => handleSelect(entry)}
                    >
                      <div className="example-card-top">
                        <span className="example-card-name">{entryName(entry)}</span>
                        <span className="example-card-nodes">{entry.nodeCount} nodes</span>
                      </div>
                      <div className="example-card-industry">{entry.industry}</div>
                      <div className="example-card-desc">{entryDescription(entry)}</div>
                      <div className="example-card-tags">
                        {entry.tags.map((t) => (
                          <span key={t} className="example-tag">{t}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="example-picker-empty">No examples match "{query}"</div>
          )}
        </div>
      </div>
    </div>
  );
}
