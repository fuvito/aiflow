import { useState, useEffect } from 'react';
import type { Workflow } from '../../models/workflow';
import type { ExecutionTrace, SimulationEvaluation, SimulationSettings } from '../../models/simulation';

interface Props {
  workflow: Workflow;
  onClose: () => void;
  onSimulated: (
    trace: ExecutionTrace,
    evaluation: SimulationEvaluation | null,
    settings: SimulationSettings,
  ) => void;
}

const DEFAULT_SETTINGS: SimulationSettings = {
  llm_mode: 'mock',
  hitl_mode: 'auto-approve',
  condition_mode: 'expression',
  display_mode: 'animated',
  animation_delay_ms: 600,
  evaluate: false,
};

export function SimulateModal({ workflow, onClose, onSimulated }: Props) {
  const [settings, setSettings] = useState<SimulationSettings>(DEFAULT_SETTINGS);
  const [inputJson, setInputJson] = useState('{}');
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
          <span className="modal-title">Simulate Workflow</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Sample input */}
          <label className="modal-label">Sample input (JSON object)</label>
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
              <label className="prop-label">HITL nodes</label>
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
              <label className="prop-label">CONDITION branching</label>
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
              <label className="prop-label">Execution display</label>
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
