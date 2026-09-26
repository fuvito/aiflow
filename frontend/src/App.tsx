import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import type { Workflow, WorkflowNode } from './models/workflow';
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
  autoLayoutWorkflow,
} from './features/workflow/WorkflowAdapter';
import { API_BASE } from './config';
import './index.css';

const WORKFLOW_STORAGE_KEY = 'aiflow:workflow';

function loadPersistedWorkflow(): Workflow {
  try {
    const raw = localStorage.getItem(WORKFLOW_STORAGE_KEY);
    if (raw) return deserializeWorkflow(raw);
  } catch {}
  return createDefaultWorkflow();
}

export default function WorkflowApp() {
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

  const [isDirty, setIsDirty] = useState(false);
  const isFirstWorkflowRender = useRef(true);
  const cleanLoadRef = useRef(false);
  const clipboardRef = useRef<WorkflowNode | null>(null);

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

  useEffect(() => {
    if (isFirstWorkflowRender.current) { isFirstWorkflowRender.current = false; return; }
    if (cleanLoadRef.current) { cleanLoadRef.current = false; setIsDirty(false); return; }
    setIsDirty(true);
  }, [workflow]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const confirmDiscard = useCallback(() => {
    if (!isDirty) return true;
    return confirm('You have unsaved changes. Discard and continue?');
  }, [isDirty]);

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      const inText = document.activeElement instanceof HTMLInputElement ||
                     document.activeElement instanceof HTMLTextAreaElement;
      if (e.key === 'c' && !inText) {
        const node = workflowRef.current.nodes.find((n) => n.id === selectedNodeId);
        if (node) { clipboardRef.current = node; flash('Node copied'); }
      }
      if (e.key === 'v' && !inText && clipboardRef.current) {
        e.preventDefault();
        const src = clipboardRef.current;
        const newId = `${src.type.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`;
        const newNode: WorkflowNode = { ...src, id: newId, position: { x: src.position.x + 40, y: src.position.y + 40 } };
        setWorkflow((wf) => ({ ...wf, nodes: [...wf.nodes, newNode] }));
        setSelectedNodeId(newId);
        flash('Node pasted');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodeId, flash, setWorkflow]);

  // ── Simulation state (declared early so handlers below can reference setters) ──
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulationTrace, setSimulationTrace] = useState<ExecutionTrace | null>(null);
  const [simulationEvaluation, setSimulationEvaluation] = useState<SimulationEvaluation | null>(null);
  const [simulationSettings, setSimulationSettings] = useState<SimulationSettings | null>(null);
  const [currentSimStep, setCurrentSimStep] = useState(0);

  // ── Right panel state ────────────────────────────────────────────────
  const [rightPanelWidth, setRightPanelWidth] = useState(264);
  const [rightPanelView, setRightPanelView] = useState<'properties' | 'simulation'>('properties');
  const panelDragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!panelDragRef.current) return;
      const delta = panelDragRef.current.startX - e.clientX;
      setRightPanelWidth(Math.max(200, Math.min(560, panelDragRef.current.startWidth + delta)));
    };
    const onUp = () => {
      if (panelDragRef.current) {
        panelDragRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handlePanelResizeStart = useCallback((e: React.MouseEvent) => {
    panelDragRef.current = { startX: e.clientX, startWidth: rightPanelWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }, [rightPanelWidth]);

  const handleNew = useCallback(() => {
    if (!confirmDiscard()) return;
    cleanLoadRef.current = true;
    reset(createDefaultWorkflow());
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setValidationState(null);
    setSimulationTrace(null);
    setSimulationEvaluation(null);
    setSimulationSettings(null);
    setCurrentSimStep(0);
    setRightPanelView('properties');
    flash('New workflow created.');
  }, [flash, reset, confirmDiscard]);

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
    setIsDirty(false);
    flash(`Saved as ${filename}`);
  }, [flash]);

  const handleOpen = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirmDiscard()) { e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const loaded = deserializeWorkflow(evt.target?.result as string);
        cleanLoadRef.current = true;
        reset(loaded);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setValidationState(null);
        setSimulationTrace(null);
        setSimulationEvaluation(null);
        setSimulationSettings(null);
        setCurrentSimStep(0);
        setRightPanelView('properties');
        flash(`Loaded: ${loaded.name}`);
      } catch (err) {
        showError(`Failed to load file: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [flash, reset, showError, confirmDiscard]);

  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    try {
      const res = await fetch(`${API_BASE}/api/workflows/validate`, {
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
    if (!confirmDiscard()) return;
    cleanLoadRef.current = true;
    reset(loaded);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setValidationState(null);
    setSimulationTrace(null);
    setSimulationEvaluation(null);
    setSimulationSettings(null);
    setCurrentSimStep(0);
    setRightPanelView('properties');
    flash(`Loaded: ${loaded.name}`);
  }, [flash, reset, confirmDiscard]);

  const [autoLayoutRevision, setAutoLayoutRevision] = useState(0);

  const handleAutoLayout = useCallback(() => {
    setWorkflow((wf) => autoLayoutWorkflow(wf));
    setAutoLayoutRevision((r) => r + 1);
  }, [setWorkflow]);

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
    cleanLoadRef.current = true;
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
    setRightPanelView('simulation');
  }, []);

  const handleRerun = useCallback(async () => {
    if (!simulationSettings) return;
    const input = (workflowRef.current.metadata?.sample_input ?? {}) as Record<string, unknown>;
    try {
      const res = await fetch(`${API_BASE}/api/workflows/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow: workflowRef.current, input, settings: simulationSettings }),
      });
      const data = await res.json() as { trace?: ExecutionTrace; evaluation?: SimulationEvaluation; detail?: string };
      if (!res.ok || !data.trace) { showError(data.detail ?? `Re-run failed (${res.status})`); return; }
      handleSimulated(data.trace, data.evaluation ?? null, simulationSettings);
    } catch {
      showError('Could not reach backend. Is it running on port 8000?');
    }
  }, [simulationSettings, showError, handleSimulated]);

  const handleResume = useCallback(async (nodeId: string, decision: 'approve' | 'reject') => {
    if (!simulationTrace) return;
    try {
      const res = await fetch(`${API_BASE}/api/workflows/simulate/resume`, {
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
    setRightPanelView('properties');
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
    // During animated playback, mark the most-recently-revealed step as 'running'
    // so the canvas auto-scroll (which watches for 'running') stays in sync.
    const isAnimating = simulationSettings.display_mode === 'animated'
      && currentSimStep > 0
      && currentSimStep < simulationTrace.steps.length;
    if (isAnimating) {
      const latest = simulationTrace.steps[currentSimStep - 1];
      if (latest) result[latest.node_id] = 'running';
    }
    return result;
  }, [simulationTrace, simulationSettings, currentSimStep, workflow.nodes]);

  const visibleSimStep = simulationSettings?.display_mode === 'instant'
    ? (simulationTrace?.steps.length ?? 0)
    : currentSimStep;

  const traversedEdgeIds = useMemo(() => {
    if (!simulationTrace) return null;
    const steps = simulationTrace.steps.slice(0, visibleSimStep);
    const ids = new Set<string>();
    for (let i = 1; i < steps.length; i++) {
      ids.add(`${steps[i - 1].node_id}→${steps[i].node_id}`);
    }
    return ids;
  }, [simulationTrace, visibleSimStep]);

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
            traversedEdgeIds={simulationTrace ? traversedEdgeIds : null}
            autoLayoutRevision={autoLayoutRevision}
            onAutoLayout={handleAutoLayout}
          />
          {validationResult && (
            <ValidationPanel
              result={validationResult}
              onDismiss={() => setValidationState(null)}
            />
          )}
        </div>

        <div className="right-panel-container" style={{ width: rightPanelWidth }}>
          <div className="right-panel-handle" onMouseDown={handlePanelResizeStart} />
          <div className="right-panel-inner">
            {simulationTrace && simulationSettings && (
              <div className="right-panel-tabs">
                <button
                  className={`right-panel-tab${rightPanelView === 'properties' ? ' right-panel-tab--active' : ''}`}
                  onClick={() => setRightPanelView('properties')}
                >
                  Properties
                </button>
                <button
                  className={`right-panel-tab${rightPanelView === 'simulation' ? ' right-panel-tab--active' : ''}`}
                  onClick={() => setRightPanelView('simulation')}
                >
                  Simulation
                </button>
              </div>
            )}
            {(rightPanelView === 'properties' || !simulationTrace) && (
              <PropertiesPanel
                workflow={workflow}
                selectedNodeId={selectedNodeId}
                selectedEdgeId={selectedEdgeId}
                onNameChange={handleNodeNameChange}
                onConfigChange={handleConfigChange}
                onEdgeChange={handleEdgeChange}
              />
            )}
            {simulationTrace && simulationSettings && rightPanelView === 'simulation' && (
              <TracePanel
                trace={simulationTrace}
                evaluation={simulationEvaluation}
                settings={simulationSettings}
                visibleStepCount={visibleSimStep}
                onAdvanceStep={() => setCurrentSimStep((s) => Math.min(s + 1, simulationTrace.steps.length))}
                onResume={handleResume}
                onRerun={handleRerun}
                onClear={handleClearTrace}
              />
            )}
          </div>
        </div>
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
