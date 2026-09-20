import type { SimulationEvaluation } from '../../models/simulation';

interface Props {
  evaluation: SimulationEvaluation;
}

function scoreColor(score: number): string {
  if (score >= 7) return '#4ade80';
  if (score >= 4) return '#fbbf24';
  return '#f87171';
}

function Section({ title, items, icon }: { title: string; items: string[]; icon: string }) {
  if (items.length === 0) return null;
  return (
    <details className="eval-section" open>
      <summary className="eval-section-title">
        <span className="eval-section-icon">{icon}</span>{title}
        <span className="eval-section-count">{items.length}</span>
      </summary>
      <ul className="eval-list">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </details>
  );
}

export function EvaluationPanel({ evaluation }: Props) {
  const color = scoreColor(evaluation.score);

  return (
    <div className="eval-panel">
      <div className="eval-header">
        <span className="eval-title">LLM Evaluation</span>
        <span className="eval-score" style={{ background: color }}>
          {evaluation.score}/10
        </span>
      </div>

      <p className="eval-summary">{evaluation.summary}</p>

      <Section title="Strengths" items={evaluation.strengths} icon="✓ " />
      <Section title="Issues" items={evaluation.issues} icon="⚠ " />
      <Section title="Recommendations" items={evaluation.recommendations} icon="→ " />
    </div>
  );
}
