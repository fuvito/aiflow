import { useState, useEffect, useRef } from 'react';
import type { Workflow } from '../../models/workflow';
import { deserializeWorkflow } from '../../utils/workflowSerializer';
import { HelpIcon } from '../../components/HelpIcon';

interface Props {
  workflow: Workflow;
  onApply: (workflow: Workflow) => void;
  onClose: () => void;
}

export function WorkflowJsonEditor({ workflow, onApply, onClose }: Props) {
  const [text, setText] = useState(() => JSON.stringify(workflow, null, 2));
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleApply = () => {
    try {
      const parsed = deserializeWorkflow(text);
      onApply(parsed);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleFormat = () => {
    try {
      setText(JSON.stringify(JSON.parse(text), null, 2));
      setError('');
    } catch {
      setError('Invalid JSON — cannot format.');
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal json-editor-modal">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="modal-title">Edit Workflow JSON</span>
            <HelpIcon
              title="Workflow JSON Editor"
              body="Directly view and edit the raw JSON that represents your workflow. Changes take effect when you click Apply. Use Format to auto-indent.\n\nUseful for fine-grained edits, pasting a workflow from another source, or debugging the internal structure.\n\nWarning: invalid JSON or an unrecognised schema will be rejected with an error."
            />
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ padding: 0 }}>
          <textarea
            ref={textareaRef}
            className="json-editor-textarea"
            value={text}
            onChange={(e) => { setText(e.target.value); setError(''); }}
            spellCheck={false}
          />
          {error && <div className="modal-error" style={{ margin: '8px 18px 0' }}>{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={handleFormat}>Format</button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApply}>Apply</button>
        </div>
      </div>
    </div>
  );
}
