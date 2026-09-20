import { memo } from 'react';
import { NodeType } from '../../models/workflow';
import { NODE_DEFINITIONS } from './nodes/nodeDefinitions';

const PALETTE_TYPES: NodeType[] = [
  NodeType.START,
  NodeType.END,
  NodeType.LLM,
  NodeType.TOOL,
  NodeType.API,
  NodeType.DATABASE,
  NodeType.RAG,
  NodeType.CONDITION,
  NodeType.HITL,
  NodeType.TRANSFORM,
];

export const NodePalette = memo(function NodePalette() {
  function onDragStart(e: React.DragEvent, type: NodeType) {
    e.dataTransfer.setData('application/aiflow-node-type', type);
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <aside className="palette">
      <div className="palette-title">Nodes</div>
      {PALETTE_TYPES.map((type) => {
        const def = NODE_DEFINITIONS[type];
        return (
          <div
            key={type}
            className="palette-item"
            draggable
            onDragStart={(e) => onDragStart(e, type)}
            title={`Drag to add ${def.label} node`}
          >
            <span
              className="palette-dot"
              style={{ background: def.color }}
            />
            <span>{def.label}</span>
          </div>
        );
      })}
    </aside>
  );
});
