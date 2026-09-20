import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import type { Workflow } from './models/workflow';
import { useWorkflowHistory } from './hooks/useWorkflowHistory';
import { Toolbar } from './components/Toolbar';
import { ErrorToast } from './components/ErrorToast';
import { NodePalette } from './features/workflow/NodePalette';
import { WorkflowCanvas } from './features/workflow/WorkflowCanvas';
import { PropertiesPanel } from './features/workflow/PropertiesPanel';
import { ValidationPanel } from './features/workflow/ValidationPanel';
import type { ValidationResult } from './features/workflow/ValidationPanel';
import { GenerateModal } from './features/workflow/GenerateModal';
import { WorkflowJsonEditor } from './features/workflow/WorkflowJsonEditor';
import {
  createDefaultWorkflow,
  serializeWorkflow,
  deserializeWorkflow,
} from './utils/workflowSerializer';
import customerSupportExample from '../../examples/customer-support.json';
import {
  updateNodeName,
  updateNodeConfig,
} from './features/workflow/WorkflowAdapter';
import './index.css';

export default function App() {
  const { workflow, setWorkflow, reset, undo, redo, canUndo, canRedo } = useWorkflowHistory(createDefaultWorkflow);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
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

  const handleNew = useCallback(() => {
    if (confirm('Discard current workflow and start a new one?')) {
      reset(createDefaultWorkflow());
      setSelectedNodeId(null);
      setValidationState(null);
      flash('New workflow created.');
    }
  }, [flash, reset]);

  const handleSave = useCallback(() => {
    const wf = workflowRef.current;
    const json = serializeWorkflow(wf);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${wf.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('Workflow saved.');
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
        setValidationState(null);
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

  const handleLoadExample = useCallback(() => {
    try {
      const loaded = deserializeWorkflow(JSON.stringify(customerSupportExample));
      reset(loaded);
      setSelectedNodeId(null);
      setValidationState(null);
      flash(`Loaded: ${loaded.name}`);
    } catch (err) {
      showError(`Failed to load example: ${(err as Error).message}`);
    }
  }, [flash, reset, showError]);

  const handleGenerate = useCallback(() => setShowGenerateModal(true), []);
  const handleEditJson = useCallback(() => setShowJsonEditor(true), []);

  const handleJsonApply = useCallback((updated: Workflow) => {
    setWorkflow(updated);
    setSelectedNodeId(null);
    setValidationState(null);
    flash(`Applied JSON: ${updated.name}`);
  }, [flash, setWorkflow]);

  const handleGenerated = useCallback((generated: Workflow) => {
    setWorkflow(generated);
    setSelectedNodeId(null);
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

  return (
    <div className="app">
      <Toolbar
        workflowName={workflow.name}
        onNew={handleNew}
        onSave={handleSave}
        onOpen={handleOpen}
        onLoadExample={handleLoadExample}
        onValidate={handleValidate}
        onGenerate={handleGenerate}
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
      />

      <div className="workspace">
        <NodePalette />

        <div className="canvas-column">
          <WorkflowCanvas
            key={workflow.id}
            workflow={workflow}
            selectedNodeId={selectedNodeId}
            onWorkflowChange={setWorkflow}
            onSelectNode={setSelectedNodeId}
          />
          {validationResult && (
            <ValidationPanel
              result={validationResult}
              onDismiss={() => setValidationState(null)}
            />
          )}
        </div>

        <PropertiesPanel
          workflow={workflow}
          selectedNodeId={selectedNodeId}
          onNameChange={handleNodeNameChange}
          onConfigChange={handleConfigChange}
        />
      </div>

      {statusMessage && <div className="status-bar">{statusMessage}</div>}

      {errorMessage && (
        <ErrorToast message={errorMessage} onDismiss={() => setErrorMessage('')} />
      )}

      {showGenerateModal && (
        <GenerateModal
          onClose={() => setShowGenerateModal(false)}
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
