import { useState, useRef, useCallback } from 'react';
import type { Workflow } from './models/workflow';
import { Toolbar } from './components/Toolbar';
import { NodePalette } from './features/workflow/NodePalette';
import { WorkflowCanvas } from './features/workflow/WorkflowCanvas';
import { PropertiesPanel } from './features/workflow/PropertiesPanel';
import {
  createDefaultWorkflow,
  serializeWorkflow,
  deserializeWorkflow,
} from './utils/workflowSerializer';
import {
  updateNodeName,
  updateNodeConfig,
} from './features/workflow/WorkflowAdapter';
import './index.css';

export default function App() {
  const [workflow, setWorkflow] = useState<Workflow>(() => createDefaultWorkflow());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const flash = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleNew = () => {
    if (confirm('Discard current workflow and start a new one?')) {
      setWorkflow(createDefaultWorkflow());
      setSelectedNodeId(null);
      flash('New workflow created.');
    }
  };

  const handleSave = () => {
    const json = serializeWorkflow(workflow);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('Workflow saved.');
  };

  const handleOpen = () => fileInputRef.current?.click();

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const loaded = deserializeWorkflow(evt.target?.result as string);
        setWorkflow(loaded);
        setSelectedNodeId(null);
        flash(`Loaded: ${loaded.name}`);
      } catch (err) {
        alert(`Failed to load workflow: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleValidate = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/workflows/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow }),
      });
      const data = await res.json() as { valid: boolean; errors: string[]; warnings: string[] };
      if (data.valid) {
        flash(`Workflow is valid${data.warnings.length ? ` (${data.warnings.length} warning(s) — see console)` : ''}`);
        if (data.warnings.length) console.warn('Warnings:', data.warnings);
      } else {
        alert(`Validation failed:\n\n${data.errors.join('\n')}`);
      }
    } catch {
      alert('Could not reach backend. Is it running on port 8000?');
    }
  };

  const handleGenerate = () => {
    alert('AI generation coming in Iteration 5.');
  };

  const handleNameChange = (name: string) => setWorkflow((wf) => ({ ...wf, name }));

  const handleNodeNameChange = useCallback((nodeId: string, name: string) => {
    setWorkflow((wf) => updateNodeName(wf, nodeId, name));
  }, []);

  const handleConfigChange = useCallback((nodeId: string, key: string, value: unknown) => {
    setWorkflow((wf) => updateNodeConfig(wf, nodeId, key, value));
  }, []);

  return (
    <div className="app">
      <Toolbar
        workflowName={workflow.name}
        onNew={handleNew}
        onSave={handleSave}
        onOpen={handleOpen}
        onValidate={handleValidate}
        onGenerate={handleGenerate}
        onNameChange={handleNameChange}
      />

      <div className="workspace">
        <NodePalette />
        <WorkflowCanvas
          workflow={workflow}
          selectedNodeId={selectedNodeId}
          onWorkflowChange={setWorkflow}
          onSelectNode={setSelectedNodeId}
        />
        <PropertiesPanel
          workflow={workflow}
          selectedNodeId={selectedNodeId}
          onNameChange={handleNodeNameChange}
          onConfigChange={handleConfigChange}
        />
      </div>

      {statusMessage && <div className="status-bar">{statusMessage}</div>}

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
