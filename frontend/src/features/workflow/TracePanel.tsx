import { useState } from 'react';
import type { ExecutionTrace, NodeExecution, SimulationEvaluation, SimulationSettings } from '../../models/simulation';
import { EvaluationPanel } from './EvaluationPanel';

interface Props {
  trace: ExecutionTrace;
  evaluation: SimulationEvaluation | null;
  settings: SimulationSettings;
  visibleStepCount: number;
  onAdvanceStep: () => void;
  onResume: (nodeId: string, decision: 'approve' | 'reject') => void;
  onClear: () => void;
}

const STATUS_ICON: Record<string, string> = {
  success: '●',
  error:   '●',
  waiting: '●',
  running: '●',
  pending: '○',
};

const STATUS_COLOR: Record<string, string> = {
  success: '#4ade80',
  error:   '#f87171',
  waiting: '#fbbf24',
  running: '#60a5fa',
  pending: '#52525b',
};

function StepRow({ step }: { step: NodeExecution }) {
  const [open, setOpen] = useState(false);
  const color = STATUS_COLOR[step.status] ?? '#a0a0a0';
  const duration =
    step.started_at && step.completed_at
      ? `${Math.round((new Date(step.completed_at).getTime() - new Date(step.started_at).getTime()))}ms`
      : step.status === 'waiting' ? 'waiting…' : '';

  return (
    <div className="trace-step">
      <button className="trace-step-row" onClick={() => setOpen((o) => !o)}>
        <span className="trace-step-status" style={{ color }}>{STATUS_ICON[step.status] ?? '●'}</span>
        <span className="trace-step-type">{step.node_type}</span>
        <span className="trace-step-name">{step.node_name}</span>
        {duration && <span className="trace-step-duration">{duration}</span>}
        <span className="trace-step-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="trace-step-detail">
          {step.error && <div className="trace-step-error">Error: {step.error}</div>}
          <div className="trace-step-json-label">Input</div>
          <pre className="trace-step-json">{JSON.stringify(step.input, null, 2)}</pre>
          {step.output !== undefined && step.output !== null && (
            <>
              <div className="trace-step-json-label">Output</div>
              <pre className="trace-step-json">{JSON.stringify(step.output, null, 2)}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function TracePanel({ trace, evaluation, settings, visibleStepCount, onAdvanceStep, onResume, onClear }: Props) {
  const visibleSteps = trace.steps.slice(0, visibleStepCount);
  const pausedStep = trace.status === 'paused'
    ? trace.steps.find((s) => s.status === 'waiting')
    : null;
  const isManual = settings.display_mode === 'manual';
  const canAdvance = isManual && visibleStepCount < trace.steps.length;

  return (
    <div className="sim-panel">
      {/* Trace column */}
      <div className="trace-panel">
        <div className="trace-header">
          <span className="trace-title">
            Simulation
            {' '}
            <span className={`trace-status trace-status--${trace.status}`}>{trace.status}</span>
          </span>
          <div className="trace-controls">
            {isManual && canAdvance && (
              <button className="btn btn-ghost" onClick={onAdvanceStep} style={{ fontSize: '11px', padding: '3px 8px' }}>
                Next Step ▶
              </button>
            )}
            <button className="btn btn-ghost" onClick={onClear} style={{ fontSize: '11px', padding: '3px 8px' }}>
              Clear
            </button>
          </div>
        </div>

        <div className="trace-steps">
          {visibleSteps.map((step) => (
            <StepRow key={step.node_id} step={step} />
          ))}
          {trace.steps.length === 0 && (
            <div className="trace-empty">No steps yet.</div>
          )}
        </div>

        {/* HITL pause controls */}
        {pausedStep && (
          <div className="trace-hitl-bar">
            <span className="trace-hitl-label">
              ⏸ Waiting for review: <strong>{pausedStep.node_name}</strong>
            </span>
            <div className="trace-hitl-actions">
              <button className="btn btn-ghost" style={{ color: '#f87171', borderColor: '#7f1d1d' }}
                onClick={() => onResume(pausedStep.node_id, 'reject')}>
                Reject
              </button>
              <button className="btn btn-primary"
                onClick={() => onResume(pausedStep.node_id, 'approve')}>
                Approve
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Evaluation column */}
      {evaluation && <EvaluationPanel evaluation={evaluation} />}
    </div>
  );
}
