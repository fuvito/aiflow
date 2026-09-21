import { useEffect, useRef } from 'react';
import { NodeType } from '../../models/workflow';
import { NODE_DEFINITIONS } from './nodes/nodeDefinitions';

export interface ContextMenuState {
  type: 'node' | 'pane';
  screenX: number;
  screenY: number;
  nodeId?: string;
  flowPosition?: { x: number; y: number };
}

interface Props {
  menu: ContextMenuState;
  onClose: () => void;
  onDuplicate: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onAddNode: (type: NodeType, position: { x: number; y: number }) => void;
}

export function CanvasContextMenu({ menu, onClose, onDuplicate, onDelete, onAddNode }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  // Keep menu inside viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    left: menu.screenX,
    top: menu.screenY,
    zIndex: 9999,
  };

  return (
    <div ref={ref} className="ctx-menu" style={style}>
      {menu.type === 'node' ? (
        <>
          <button className="ctx-menu-item" onClick={() => { onDuplicate(menu.nodeId!); onClose(); }}>
            Duplicate
          </button>
          <div className="ctx-menu-divider" />
          <button className="ctx-menu-item ctx-menu-item--danger" onClick={() => { onDelete(menu.nodeId!); onClose(); }}>
            Delete
          </button>
        </>
      ) : (
        <>
          <div className="ctx-menu-heading">Add node here</div>
          {Object.values(NodeType).map((type) => {
            const def = NODE_DEFINITIONS[type];
            return (
              <button
                key={type}
                className="ctx-menu-item ctx-menu-item--node"
                onClick={() => { onAddNode(type, menu.flowPosition!); onClose(); }}
              >
                <span className="ctx-menu-node-dot" style={{ background: def.color }} />
                {def.label}
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}
