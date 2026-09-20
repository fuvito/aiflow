import { useState, useEffect } from 'react';
import type { ExecutionTrace, NodeExecution, SimulationEvaluation, SimulationSettings } from '../../models/simulation';
import { EvaluationPanel } from './EvaluationPanel';
import { HelpIcon } from '../../components/HelpIcon';

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
  const [activeTab, setActiveTab] = useState<'trace' | 'evaluation'>('trace');

  const visibleSteps = trace.steps.slice(0, visibleStepCount);
  const pausedStep = trace.status === 'paused'
    ? trace.steps.find((s) => s.status === 'waiting')
    : null;
  const isManual = settings.display_mode === 'manual';
  const canAdvance = isManual && visibleStepCount < trace.steps.length;

  // Switch to evaluation tab once all steps are visible and evaluation has arrived
  useEffect(() => {
    if (evaluation && visibleStepCount >= trace.steps.length) {
      setActiveTab('evaluation');
    }
  }, [evaluation, visibleStepCount, trace.steps.length]);

  return (
    <div className="sim-side-panel">
      <div className="sim-side-header">
        <span className="sim-side-title">
          Simulation
          {' '}
          <span className={`trace-status trace-status--${trace.status}`}>{trace.status}</span>
          <HelpIcon
            title="Simulation Trace"
            body="Shows each step of the simulation in execution order. Each row shows the node's status (● success / ● error / ● waiting), type, name, and duration.\n\nClick any row to expand it and inspect the exact input and output JSON for that node."
          />
        </span>
        <button className="btn btn-ghost sim-side-clear" onClick={onClear}>Clear</button>
      </div>

      {pausedStep && (
        <div className="sim-hitl-banner">
          <span className="sim-hitl-label">
            ⏸ Waiting: <strong>{pausedStep.node_name}</strong>
          </span>
          <div className="sim-hitl-actions">
            <button
              className="btn btn-ghost"
              style={{ color: '#f87171', borderColor: '#7f1d1d' }}
              onClick={() => onResume(pausedStep.node_id, 'reject')}
            >
              Reject
            </button>
            <button className="btn btn-primary" onClick={() => onResume(pausedStep.node_id, 'approve')}>
              Approve
            </button>
          </div>
        </div>
      )}

      <div className="sim-tabs">
        <button
          className={`sim-tab${activeTab === 'trace' ? ' sim-tab--active' : ''}`}
          onClick={() => setActiveTab('trace')}
        >
          Trace
        </button>
        {settings.evaluate && (
          <button
            className={`sim-tab${activeTab === 'evaluation' ? ' sim-tab--active' : ''}`}
            onClick={() => setActiveTab('evaluation')}
          >
            {evaluation ? 'Evaluation ✓' : 'Evaluation …'}
          </button>
        )}
      </div>

      {activeTab === 'trace' && (
        <div className="sim-tab-content">
          <div className="trace-steps">
            {visibleSteps.map((step) => (
              <StepRow key={step.node_id} step={step} />
            ))}
            {trace.steps.length === 0 && (
              <div className="trace-empty">No steps yet.</div>
            )}
          </div>
          {canAdvance && (
            <div className="sim-manual-footer">
              <button className="btn btn-ghost sim-next-btn" onClick={onAdvanceStep}>
                Next Step ▶
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'evaluation' && (
        <div className="sim-tab-content">
          {evaluation ? (
            <EvaluationPanel evaluation={evaluation} />
          ) : (
            <div className="sim-eval-pending">
              {trace.status === 'complete'
                ? 'Evaluation did not return results. Check backend logs.'
                : 'Evaluation will appear here once simulation completes.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
