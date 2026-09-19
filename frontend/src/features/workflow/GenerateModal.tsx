import { useState, useEffect, useRef } from 'react';
import type { Workflow } from '../../models/workflow';

interface Props {
  onClose: () => void;
  onGenerated: (workflow: Workflow) => void;
}

export function GenerateModal({ onClose, onGenerated }: Props) {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async () => {
    const trimmed = description.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:8000/api/workflows/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: trimmed }),
      });

      const data = await res.json() as { workflow?: Workflow; detail?: string };

      if (!res.ok) {
        setError(data.detail ?? `Server error (${res.status})`);
        return;
      }

      if (!data.workflow) {
        setError('Server returned an unexpected response.');
        return;
      }

      onGenerated(data.workflow);
      onClose();
    } catch {
      setError('Could not reach backend. Is it running on port 8000?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Generate Workflow</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <label className="modal-label">
            Describe your workflow
          </label>
          <textarea
            ref={textareaRef}
            className="modal-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKey}
            placeholder="e.g. Create a customer support agent that classifies requests, searches the knowledge base, and routes complex cases to a human reviewer."
            rows={5}
            disabled={isLoading}
          />
          <div className="modal-hint">Ctrl+Enter to generate</div>

          {error && <div className="modal-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isLoading || !description.trim()}
          >
            {isLoading ? (
              <><span className="spinner" /> Generating…</>
            ) : (
              'Generate'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
