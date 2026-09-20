import { useState, useEffect } from 'react';
import type { Workflow } from '../../models/workflow';
import type { ExecutionTrace, SimulationEvaluation, SimulationSettings } from '../../models/simulation';
import { HelpIcon } from '../../components/HelpIcon';
import { scaffoldSampleInput } from '../../utils/scaffoldInput';

interface Props {
  workflow: Workflow;
  onClose: () => void;
  onSimulated: (
    trace: ExecutionTrace,
    evaluation: SimulationEvaluation | null,
    settings: SimulationSettings,
  ) => void;
  onSampleInputSave?: (input: Record<string, unknown>) => void;
}

const DEFAULT_SETTINGS: SimulationSettings = {
  llm_mode: 'mock',
  hitl_mode: 'auto-approve',
  condition_mode: 'expression',
  display_mode: 'animated',
  animation_delay_ms: 600,
  evaluate: false,
};

export function SimulateModal({ workflow, onClose, onSimulated, onSampleInputSave }: Props) {
  const [settings, setSettings] = useState<SimulationSettings>(DEFAULT_SETTINGS);
  const [inputJson, setInputJson] = useState(() => {
    const saved = workflow.metadata?.sample_input;
    if (saved && typeof saved === 'object' && Object.keys(saved).length > 0) {
      return JSON.stringify(saved, null, 2);
    }
    return '{}';
  });
  const [inputError, setInputError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = <K extends keyof SimulationSettings>(key: K, value: SimulationSettings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const handleScaffold = () => {
    const scaffolded = scaffoldSampleInput(workflow);
    setInputJson(scaffolded);
    setInputError('');
  };

  const validateInput = (raw: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setInputError('Input must be a JSON object { }');
        return null;
      }
      setInputError('');
      return parsed as Record<string, unknown>;
    } catch {
      setInputError('Invalid JSON');
      return null;
    }
  };

  const handleSubmit = async () => {
    const parsed = validateInput(inputJson);
    if (!parsed) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:8000/api/workflows/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow, input: parsed, settings }),
      });

      const data = await res.json() as { trace?: ExecutionTrace; evaluation?: SimulationEvaluation; detail?: string };

      if (!res.ok) {
        setError(data.detail ?? `Server error (${res.status})`);
        return;
      }

      if (!data.trace) {
        setError('Server returned an unexpected response.');
        return;
      }

      onSampleInputSave?.(parsed);
      onSimulated(data.trace, data.evaluation ?? null, settings);
      onClose();
    } catch {
      setError('Could not reach backend. Is it running on port 8000?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal sim-modal">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="modal-title">Simulate Workflow</span>
            <HelpIcon
              title="Simulate Workflow"
              body="Runs a mock execution of your workflow. The backend traverses the graph from START to END, calling each node's handler in order.\n\nThe execution trace appears in the panel at the bottom of the screen. Expand any step to inspect its exact input and output JSON."
            />
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Sample input */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <label className="modal-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', margin: 0 }}>
              Sample input (JSON object)
              <HelpIcon
                title="Sample Input"
                body={"A JSON object passed to the START node as the initial data. It flows through the workflow and is transformed by each node.\n\nUse it to test how your workflow handles different scenarios. Example: { userId: '123', message: 'help with billing' }"}
              />
            </label>
            <button
              type="button"
              className="sim-scaffold-btn"
              onClick={handleScaffold}
              disabled={isLoading}
              title="Auto-detect input fields from node configs"
            >
              Suggest fields ✦
            </button>
          </div>
          <textarea
            className="modal-textarea"
            value={inputJson}
            onChange={(e) => { setInputJson(e.target.value); validateInput(e.target.value); }}
            rows={3}
            disabled={isLoading}
            spellCheck={false}
          />
          {inputError && <div className="sim-field-error">{inputError}</div>}

          {/* Settings grid */}
          <div className="sim-settings-grid">
            <div className="sim-setting">
              <label className="prop-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                HITL nodes
                <HelpIcon
                  title="HITL Mode"
                  body="Controls how Human Review nodes behave during simulation.\n\nAuto-approve: execution continues immediately — the node outputs { approved: true }.\n\nPause and wait: execution halts at the HITL node and shows Approve / Reject buttons in the trace panel. Click one to resume."
                />
              </label>
              <select
                className="prop-input prop-select"
                value={settings.hitl_mode}
                onChange={(e) => set('hitl_mode', e.target.value as SimulationSettings['hitl_mode'])}
                disabled={isLoading}
              >
                <option value="auto-approve">Auto-approve</option>
                <option value="pause">Pause and wait</option>
              </select>
            </div>

            <div className="sim-setting">
              <label className="prop-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                CONDITION branching
                <HelpIcon
                  title="Condition Branching"
                  body="Controls how branching is decided at Condition nodes.\n\nExpression eval: evaluates the node's expression field against the current data. Falls back to all edges if the expression fails.\n\nRandom: picks one outgoing edge at random on each run.\n\nUser picks: always follows the first outgoing edge."
                />
              </label>
              <select
                className="prop-input prop-select"
                value={settings.condition_mode}
                onChange={(e) => set('condition_mode', e.target.value as SimulationSettings['condition_mode'])}
                disabled={isLoading}
              >
                <option value="expression">Expression eval</option>
                <option value="random">Random</option>
                <option value="user-pick">User picks (first)</option>
              </select>
            </div>

            <div className="sim-setting">
              <label className="prop-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                Execution display
                <HelpIcon
                  title="Execution Display"
                  body="Controls how the trace is revealed after simulation.\n\nAnimated: nodes on the canvas highlight one by one as execution progresses, at the configured step delay.\n\nInstant: all results appear simultaneously once the run completes.\n\nManual: a Next Step button advances the trace one step at a time."
                />
              </label>
              <select
                className="prop-input prop-select"
                value={settings.display_mode}
                onChange={(e) => set('display_mode', e.target.value as SimulationSettings['display_mode'])}
                disabled={isLoading}
              >
                <option value="animated">Animated</option>
                <option value="instant">Instant</option>
                <option value="manual">Manual step-through</option>
              </select>
            </div>

            {settings.display_mode === 'animated' && (
              <div className="sim-setting">
                <label className="prop-label">Step delay — {settings.animation_delay_ms}ms</label>
                <input
                  type="range"
                  min={200}
                  max={2000}
                  step={100}
                  value={settings.animation_delay_ms}
                  onChange={(e) => set('animation_delay_ms', Number(e.target.value))}
                  disabled={isLoading}
                  className="sim-range"
                />
              </div>
            )}
          </div>

          {/* Evaluate toggle */}
          <label className="sim-evaluate-toggle">
            <input
              type="checkbox"
              checked={settings.evaluate}
              onChange={(e) => set('evaluate', e.target.checked)}
              disabled={isLoading}
            />
            <span className="sim-evaluate-label">
              Evaluate results with LLM
              <span className="sim-evaluate-hint"> — generates a quality report after simulation</span>
            </span>
            <HelpIcon
              title="LLM Evaluation"
              body="After simulation completes, sends the execution trace to an LLM which scores your workflow design (1–10) and returns strengths, issues, and improvement recommendations.\n\nRequires a valid LLM_API_KEY in the backend. Adds a few seconds to the total simulation time."
            />
          </label>

          {error && <div className="modal-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={isLoading}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isLoading || !!inputError}
          >
            {isLoading ? <><span className="spinner" />Simulating…</> : 'Run Simulation'}
          </button>
        </div>
      </div>
    </div>
  );
}
