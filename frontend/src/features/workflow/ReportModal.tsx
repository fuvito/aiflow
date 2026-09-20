import { useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import type { Workflow } from '../../models/workflow';
import { serializeWorkflow } from '../../utils/workflowSerializer';

type Format = 'image' | 'image-json';

interface Props {
  workflow: Workflow;
  onClose: () => void;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function captureCanvas(): Promise<Blob> {
  const el = document.querySelector<HTMLElement>('.react-flow__viewport');
  const wrapper = document.querySelector<HTMLElement>('.react-flow');
  if (!wrapper || !el) throw new Error('Canvas not found');
  const dataUrl = await toPng(wrapper, {
    backgroundColor: getComputedStyle(document.documentElement)
      .getPropertyValue('--bg-deep').trim() || '#111113',
    pixelRatio: 2,
    filter: (node) => {
      // exclude controls and minimap from the snapshot
      if (node instanceof Element) {
        const cls = node.className;
        if (typeof cls === 'string' &&
          (cls.includes('react-flow__controls') || cls.includes('react-flow__minimap'))) {
          return false;
        }
      }
      return true;
    },
  });
  const res = await fetch(dataUrl);
  return res.blob();
}

export function ReportModal({ workflow, onClose }: Props) {
  const [format, setFormat] = useState<Format>('image');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const slug = workflow.name.replace(/\s+/g, '-').toLowerCase();

  const handleDownload = useCallback(async () => {
    setIsGenerating(true);
    setError('');
    try {
      const blob = await captureCanvas();
      downloadBlob(blob, `${slug}-workflow.png`);

      if (format === 'image-json') {
        const json = serializeWorkflow(workflow);
        const jsonBlob = new Blob([json], { type: 'application/json' });
        // slight delay so both save dialogs don't collide
        setTimeout(() => downloadBlob(jsonBlob, `${slug}-workflow.json`), 300);
      }

      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }, [format, workflow, slug, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Export Report</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ gap: '10px' }}>
          <p className="modal-label">Choose export format</p>

          <div className="report-format-options">
            <label className={`report-format-card${format === 'image' ? ' report-format-card--active' : ''}`}>
              <input
                type="radio"
                name="format"
                value="image"
                checked={format === 'image'}
                onChange={() => setFormat('image')}
              />
              <div className="report-format-icon">🖼</div>
              <div>
                <div className="report-format-title">Image only</div>
                <div className="report-format-desc">PNG snapshot of the canvas</div>
              </div>
            </label>

            <label className={`report-format-card${format === 'image-json' ? ' report-format-card--active' : ''}`}>
              <input
                type="radio"
                name="format"
                value="image-json"
                checked={format === 'image-json'}
                onChange={() => setFormat('image-json')}
              />
              <div className="report-format-icon">📋</div>
              <div>
                <div className="report-format-title">Image + JSON</div>
                <div className="report-format-desc">Canvas image and workflow JSON file</div>
              </div>
            </label>
          </div>

          {error && <div className="modal-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleDownload}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating…' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
