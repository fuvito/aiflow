import { useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useReactFlow } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

export function DeletableEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  label, selected, markerEnd, style,
}: EdgeProps) {
  const { deleteElements } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  });

  const showControls = isHovered || selected;

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {/* Wide transparent hit-area so hovering anywhere on the edge line triggers visibility */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {label && <span className="edge-condition-label">{label}</span>}
          <button
            className="edge-delete-btn"
            style={{ opacity: showControls ? 1 : 0, transition: 'opacity 0.15s' }}
            onClick={() => deleteElements({ edges: [{ id }] })}
            title="Delete edge"
          >
            ✕
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
