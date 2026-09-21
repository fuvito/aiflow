import { useState, useEffect, useRef } from 'react';

interface Props {
  defaultName: string;
  onSave: (filename: string) => void;
  onClose: () => void;
}

function slugify(name: string): string {
  return name.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase() || 'workflow';
}

function dateTimeSuffix(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
}

export function SaveModal({ defaultName, onSave, onClose }: Props) {
  const [name, setName] = useState(() => slugify(defaultName));
  const [addDateTime, setAddDateTime] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const preview = `${name || 'workflow'}${addDateTime ? dateTimeSuffix() : ''}.json`;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(preview);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal save-modal">
        <div className="modal-header">
          <span className="modal-title">Save Workflow</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <label className="modal-label">File name</label>
          <input
            ref={inputRef}
            className="prop-input"
            value={name}
            onChange={(e) => setName(slugify(e.target.value) || e.target.value.replace(/\s+/g, '-').toLowerCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="workflow"
            spellCheck={false}
          />

          <label className="save-dt-row">
            <input
              type="checkbox"
              checked={addDateTime}
              onChange={(e) => setAddDateTime(e.target.checked)}
            />
            Append date and time
          </label>

          <div className="save-preview">
            <span className="save-preview-label">Will save as</span>
            <span className="save-preview-name">{preview}</span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!name.trim()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
