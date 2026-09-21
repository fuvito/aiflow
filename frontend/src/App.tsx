import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import type { Workflow } from './models/workflow';
import type { ExecutionTrace, SimulationEvaluation, SimulationSettings } from './models/simulation';
import { useWorkflowHistory } from './hooks/useWorkflowHistory';
import { Toolbar } from './components/Toolbar';
import { ErrorToast } from './components/ErrorToast';
import { NodePalette } from './features/workflow/NodePalette';
import { WorkflowCanvas } from './features/workflow/WorkflowCanvas';
import { PropertiesPanel } from './features/workflow/PropertiesPanel';
import { ValidationPanel } from './features/workflow/ValidationPanel';
import type { ValidationResult } from './features/workflow/ValidationPanel';
import { GenerateModal } from './features/workflow/GenerateModal';
import { SimulateModal } from './features/workflow/SimulateModal';
import { TracePanel } from './features/workflow/TracePanel';
import { WorkflowJsonEditor } from './features/workflow/WorkflowJsonEditor';
import { ReportModal } from './features/workflow/ReportModal';
import { SaveModal } from './features/workflow/SaveModal';
import { ExamplePickerModal } from './features/workflow/ExamplePickerModal';
import {
  createDefaultWorkflow,
  serializeWorkflow,
  deserializeWorkflow,
} from './utils/workflowSerializer';
import {
  updateNodeName,
  updateNodeConfig,
  updateEdge,
} from './features/workflow/WorkflowAdapter';
import './index.css';

const WORKFLOW_STORAGE_KEY = 'aiflow:workflow';

function loadPersistedWorkflow(): Workflow {
  try {
    const raw = localStorage.getItem(WORKFLOW_STORAGE_KEY);
    if (raw) return deserializeWorkflow(raw);
  } catch {}
  return createDefaultWorkflow();
}

export default function App() {
  const { workflow, setWorkflow, reset, undo, redo, canUndo, canRedo } = useWorkflowHistory(loadPersistedWorkflow);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  // Store validation alongside the node/edge counts it was run against so we
  // can derive staleness without a setState-in-effect.
  const [validationState, setValidationState] = useState<{
    result: ValidationResult;
    nodeCount: number;
    edgeCount: number;
  } | null>(null);
  const validationResult = validationState &&
    validationState.nodeCount === workflow.nodes.length &&
    validationState.edgeCount === workflow.edges.length
    ? validationState.result : null;
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showExamplePicker, setShowExamplePicker] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('aiflow-theme') !== 'light');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Stable ref so save/validate callbacks always see the latest workflow
  // without needing workflow in their dependency arrays
  const workflowRef = useRef(workflow);
  useLayoutEffect(() => { workflowRef.current = workflow; });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    try {
      localStorage.setItem(WORKFLOW_STORAGE_KEY, serializeWorkflow(workflow));
    } catch {}
  }, [workflow]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const toggleTheme = useCallback(() => setIsDark(d => {
    const next = !d;
    localStorage.setItem('aiflow-theme', next ? 'dark' : 'light');
    return next;
  }), []);

  const flash = useCallback((msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3000);
  }, []);

  const showError = useCallback((msg: string) => setErrorMessage(msg), []);

  // ── Simulation state (declared early so handlers below can reference setters) ──
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulationTrace, setSimulationTrace] = useState<ExecutionTrace | null>(null);
  const [simulationEvaluation, setSimulationEvaluation] = useState<SimulationEvaluation | null>(null);
  const [simulationSettings, setSimulationSettings] = useState<SimulationSettings | null>(null);
  const [currentSimStep, setCurrentSimStep] = useState(0);

  const handleNew = useCallback(() => {
    if (confirm('Discard current workflow and start a new one?')) {
      reset(createDefaultWorkflow());
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setValidationState(null);
      setSimulationTrace(null);
      setSimulationEvaluation(null);
      setSimulationSettings(null);
      setCurrentSimStep(0);
      flash('New workflow created.');
    }
  }, [flash, reset]);

  const handleSave = useCallback(() => setShowSaveModal(true), []);

  const handleSaveConfirm = useCallback((filename: string) => {
    const wf = workflowRef.current;
    const json = serializeWorkflow(wf);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    flash(`Saved as ${filename}`);
  }, [flash]);

  const handleOpen = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const loaded = deserializeWorkflow(evt.target?.result as string);
        reset(loaded);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setValidationState(null);
        setSimulationTrace(null);
        setSimulationEvaluation(null);
        setSimulationSettings(null);
        setCurrentSimStep(0);
        flash(`Loaded: ${loaded.name}`);
      } catch (err) {
        showError(`Failed to load file: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [flash, reset, showError]);

  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    try {
      const res = await fetch('http://localhost:8000/api/workflows/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow: workflowRef.current }),
      });
      const data = await res.json() as ValidationResult;
      setValidationState({ result: data, nodeCount: workflowRef.current.nodes.length, edgeCount: workflowRef.current.edges.length });
    } catch {
      showError('Could not reach backend. Is it running on port 8000?');
    } finally {
      setIsValidating(false);
    }
  }, [showError]);

  const handleOpenExamplePicker = useCallback(() => setShowExamplePicker(true), []);

  const handleExampleSelected = useCallback((loaded: Workflow) => {
    reset(loaded);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setValidationState(null);
    setSimulationTrace(null);
    setSimulationEvaluation(null);
    setSimulationSettings(null);
    setCurrentSimStep(0);
    flash(`Loaded: ${loaded.name}`);
  }, [flash, reset]);

  const handleGenerate = useCallback(() => setShowGenerateModal(true), []);
  const [showRefineModal, setShowRefineModal] = useState(false);
  const handleRefine = useCallback(() => setShowRefineModal(true), []);
  const canRefine = workflow.nodes.length > 2;
  const handleEditJson = useCallback(() => setShowJsonEditor(true), []);
  const handleReport = useCallback(() => setShowReportModal(true), []);

  const handleJsonApply = useCallback((updated: Workflow) => {
    setWorkflow(updated);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setValidationState(null);
    flash(`Applied JSON: ${updated.name}`);
  }, [flash, setWorkflow]);

  const handleGenerated = useCallback((generated: Workflow) => {
    setWorkflow(generated);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setValidationState(null);
    flash(`Generated: ${generated.name}`);
  }, [flash, setWorkflow]);

  const handleNameChange = useCallback((name: string) => setWorkflow((wf) => ({ ...wf, name })), [setWorkflow]);

  const handleNodeNameChange = useCallback((nodeId: string, name: string) => {
    setWorkflow((wf) => updateNodeName(wf, nodeId, name));
  }, [setWorkflow]);

  const handleConfigChange = useCallback((nodeId: string, key: string, value: unknown) => {
    setWorkflow((wf) => updateNodeConfig(wf, nodeId, key, value));
  }, [setWorkflow]);

  const handleEdgeChange = useCallback((
    source: string,
    target: string,
    updates: { condition?: string; notes?: string },
  ) => {
    setWorkflow((wf) => updateEdge(wf, source, target, updates));
  }, [setWorkflow]);

  // ── Simulation handlers ──────────────────────────────────────────────
  const handleSimulate = useCallback(() => setShowSimulateModal(true), []);

  const handleSampleInputSave = useCallback((input: Record<string, unknown>) => {
    setWorkflow((wf) => ({ ...wf, metadata: { ...(wf.metadata ?? {}), sample_input: input } }));
  }, [setWorkflow]);

  const handleSimulated = useCallback((
    trace: ExecutionTrace,
    evaluation: SimulationEvaluation | null,
    settings: SimulationSettings,
  ) => {
    setSimulationTrace(trace);
    setSimulationEvaluation(evaluation);
    setSimulationSettings(settings);
    setCurrentSimStep(settings.display_mode === 'instant' ? trace.steps.length : 0);
  }, []);

  const handleResume = useCallback(async (nodeId: string, decision: 'approve' | 'reject') => {
    if (!simulationTrace) return;
    try {
      const res = await fetch('http://localhost:8000/api/workflows/simulate/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trace_id: simulationTrace.trace_id, node_id: nodeId, decision }),
      });
      const data = await res.json() as { trace?: ExecutionTrace; evaluation?: SimulationEvaluation; detail?: string };
      if (!res.ok) {
        showError(data.detail ?? `Resume failed (${res.status})`);
        return;
      }
      const newTrace = data.trace;
      if (!newTrace) {
        showError('Resume returned an unexpected response.');
        return;
      }
      setSimulationTrace(newTrace);
      if (data.evaluation) setSimulationEvaluation(data.evaluation);
      setCurrentSimStep(simulationSettings?.display_mode === 'instant' ? newTrace.steps.length : currentSimStep);
    } catch {
      showError('Could not reach backend. Is it running on port 8000?');
    }
  }, [simulationTrace, simulationSettings, currentSimStep, showError]);

  const handleClearTrace = useCallback(() => {
    setSimulationTrace(null);
    setSimulationEvaluation(null);
    setSimulationSettings(null);
    setCurrentSimStep(0);
  }, []);

  // Animated playback: advance one step at a time
  useEffect(() => {
    if (!simulationTrace || !simulationSettings) return;
    if (simulationSettings.display_mode !== 'animated') return;
    if (currentSimStep >= simulationTrace.steps.length) return;
    const timer = setTimeout(
      () => setCurrentSimStep((s) => s + 1),
      simulationSettings.animation_delay_ms,
    );
    return () => clearTimeout(timer);
  }, [simulationTrace, simulationSettings, currentSimStep]);

  // Node statuses for canvas highlighting
  const nodeStatuses = useMemo<Record<string, string>>(() => {
    if (!simulationTrace || !simulationSettings) return {};
    const visibleSteps = simulationTrace.steps.slice(0, currentSimStep);
    const result: Record<string, string> = {};
    // Mark all nodes as pending when trace is active
    for (const node of workflow.nodes) {
      result[node.id] = 'pending';
    }
    for (const step of visibleSteps) {
      result[step.node_id] = step.status;
    }
    return result;
  }, [simulationTrace, simulationSettings, currentSimStep, workflow.nodes]);

  const visibleSimStep = simulationSettings?.display_mode === 'instant'
    ? (simulationTrace?.steps.length ?? 0)
    : currentSimStep;

  return (
    <div className="app">
      <Toolbar
        workflowName={workflow.name}
        onNew={handleNew}
        onSave={handleSave}
        onOpen={handleOpen}
        onOpenExamplePicker={handleOpenExamplePicker}
        onValidate={handleValidate}
        onGenerate={handleGenerate}
        onRefine={handleRefine}
        canRefine={canRefine}
        onSimulate={handleSimulate}
        onEditJson={handleEditJson}
        onNameChange={handleNameChange}
        isValidating={isValidating}
        validationResult={validationResult}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onReport={handleReport}
      />

      <div className="workspace">
        <NodePalette />

        <div className="canvas-column">
          <WorkflowCanvas
            key={workflow.id}
            workflow={workflow}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            onWorkflowChange={setWorkflow}
            onSelectNode={setSelectedNodeId}
            onSelectEdge={setSelectedEdgeId}
            nodeStatuses={simulationTrace ? nodeStatuses : undefined}
          />
          {validationResult && (
            <ValidationPanel
              result={validationResult}
              onDismiss={() => setValidationState(null)}
            />
          )}
        </div>

        {simulationTrace && simulationSettings ? (
          <TracePanel
            trace={simulationTrace}
            evaluation={simulationEvaluation}
            settings={simulationSettings}
            visibleStepCount={visibleSimStep}
            onAdvanceStep={() => setCurrentSimStep((s) => Math.min(s + 1, simulationTrace.steps.length))}
            onResume={handleResume}
            onClear={handleClearTrace}
          />
        ) : (
          <PropertiesPanel
            workflow={workflow}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            onNameChange={handleNodeNameChange}
            onConfigChange={handleConfigChange}
            onEdgeChange={handleEdgeChange}
          />
        )}
      </div>

      {statusMessage && <div className="status-bar">{statusMessage}</div>}

      {errorMessage && (
        <ErrorToast message={errorMessage} onDismiss={() => setErrorMessage('')} />
      )}

      {showExamplePicker && (
        <ExamplePickerModal
          onClose={() => setShowExamplePicker(false)}
          onSelect={handleExampleSelected}
        />
      )}

      {showGenerateModal && (
        <GenerateModal
          onClose={() => setShowGenerateModal(false)}
          onGenerated={handleGenerated}
        />
      )}

      {showRefineModal && (
        <GenerateModal
          currentWorkflow={workflow}
          onClose={() => setShowRefineModal(false)}
          onGenerated={handleGenerated}
        />
      )}

      {showJsonEditor && (
        <WorkflowJsonEditor
          workflow={workflow}
          onApply={handleJsonApply}
          onClose={() => setShowJsonEditor(false)}
        />
      )}

      {showReportModal && (
        <ReportModal
          workflow={workflow}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {showSaveModal && (
        <SaveModal
          defaultName={workflow.name}
          onSave={handleSaveConfirm}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      {showSimulateModal && (
        <SimulateModal
          workflow={workflow}
          onClose={() => setShowSimulateModal(false)}
          onSimulated={handleSimulated}
          onSampleInputSave={handleSampleInputSave}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileLoad}
      />
    </div>
  );
}
