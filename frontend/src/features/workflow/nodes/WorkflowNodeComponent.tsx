import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { WorkflowRFNode } from '../WorkflowAdapter';
import { getNodeDefinition } from './nodeDefinitions';
import { NodeType } from '../../../models/workflow';

export function WorkflowNodeComponent({ data, selected }: NodeProps<WorkflowRFNode>) {
  const def = getNodeDefinition(data.nodeType);
  const isStart = data.nodeType === NodeType.START;
  const isEnd = data.nodeType === NodeType.END;
  const isCircle = isStart || isEnd;

  return (
    <div
      style={{
        background: def.color,
        color: def.textColor,
        border: selected ? '2px solid #fff' : '2px solid transparent',
        borderRadius: isCircle ? '50%' : '8px',
        width: isCircle ? '64px' : undefined,
        height: isCircle ? '64px' : undefined,
        minWidth: isCircle ? undefined : '140px',
        padding: isCircle ? '0' : '8px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: selected ? `0 0 0 3px ${def.color}66` : '0 2px 6px rgba(0,0,0,0.4)',
        cursor: 'default',
        userSelect: 'none',
        fontFamily: 'monospace',
      }}
    >
      {!isStart && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ background: '#fff', border: `2px solid ${def.color}` }}
        />
      )}

      <span style={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.04em' }}>
        {data.nodeType}
      </span>
      {!isCircle && (
        <span style={{ opacity: 0.85, fontSize: '11px', marginTop: '2px' }}>{data.label}</span>
      )}

      {!isEnd && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ background: '#fff', border: `2px solid ${def.color}` }}
        />
      )}
    </div>
  );
}
