import { useCallback, useMemo, memo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import type {
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  OnEdgeClick,
  Node as RFNode,
  Edge as RFEdge,
  Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { Workflow } from '../../models/workflow';
import { NodeType } from '../../models/workflow';
import {
  workflowToReactFlow,
  applyNodePositions,
  applyEdges,
  addNode,
  removeNode,
} from './WorkflowAdapter';
import type { WorkflowRFNode } from './WorkflowAdapter';
import { WorkflowNodeComponent } from './nodes/WorkflowNodeComponent';

// Cast needed: our data-typed component is assignable to RF's generic NodeProps
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes = { workflowNode: WorkflowNodeComponent as any };

interface Props {
  workflow: Workflow;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onWorkflowChange: (wf: Workflow) => void;
  onSelectNode: (nodeId: string | null) => void;
  onSelectEdge: (edgeId: string | null) => void;
  nodeStatuses?: Record<string, string>;
  autoLayoutRevision?: number;
  onAutoLayout?: () => void;
}

const Canvas = memo(function Canvas({ workflow, selectedNodeId, selectedEdgeId, onWorkflowChange, onSelectNode, onSelectEdge, nodeStatuses, autoLayoutRevision, onAutoLayout }: Props) {
  const { screenToFlowPosition, addNodes, setCenter, getZoom, getNode, fitView } = useReactFlow();
  const [isInteractive, setIsInteractive] = useState(true);

  const { nodes: rfNodes, edges: rfEdges } = useMemo(
    () => workflowToReactFlow(workflow),
    [workflow],
  );

  const rfNodesWithSelection = useMemo(
    () => rfNodes.map((n) => ({
      ...n,
      selected: n.id === selectedNodeId,
      data: { ...n.data, executionStatus: nodeStatuses?.[n.id] },
    })),
    [rfNodes, selectedNodeId, nodeStatuses],
  );

  const rfEdgesWithSelection = useMemo(
    () => rfEdges.map((e) => ({ ...e, selected: e.id === selectedEdgeId })),
    [rfEdges, selectedEdgeId],
  );

  useEffect(() => {
    if (!autoLayoutRevision) return;
    const id = requestAnimationFrame(() => fitView({ duration: 350 }));
    return () => cancelAnimationFrame(id);
  }, [autoLayoutRevision, fitView]);

  // Pan canvas to the currently-running node so it stays in view during simulation.
  useEffect(() => {
    if (!nodeStatuses) return;
    const runningId = Object.entries(nodeStatuses).find(([, s]) => s === 'running')?.[0];
    if (!runningId) return;
    const rfNode = getNode(runningId);
    if (!rfNode) return;
    const w = rfNode.measured?.width ?? rfNode.width ?? 160;
    const h = rfNode.measured?.height ?? rfNode.height ?? 60;
    setCenter(
      rfNode.position.x + (w as number) / 2,
      rfNode.position.y + (h as number) / 2,
      { duration: 400, zoom: getZoom() },
    );
  }, [nodeStatuses, getNode, setCenter, getZoom]);

  const onEdgeClick: OnEdgeClick = useCallback(
    (_, edge) => {
      onSelectNode(null);
      onSelectEdge(edge.id);
    },
    [onSelectNode, onSelectEdge],
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const removals = changes.filter((c) => c.type === 'remove');
      if (removals.length > 0) {
        let wf = workflow;
        for (const r of removals) {
          if ('id' in r) wf = removeNode(wf, r.id);
          if ('id' in r && r.id === selectedNodeId) onSelectNode(null);
        }
        onWorkflowChange(wf);
        return;
      }
      // Only sync final position (drag end) back to domain model.
      // Skipping mid-drag events (dragging: true) prevents ~60 state updates/sec
      // that cause full App re-renders while dragging.
      const positionChanges = changes.filter((c) => c.type === 'position' && !c.dragging);
      if (positionChanges.length === 0) return;
      const updated = applyNodeChanges(positionChanges, rfNodes) as WorkflowRFNode[];
      onWorkflowChange(applyNodePositions(workflow, updated as RFNode[]));
    },
    [workflow, rfNodes, selectedNodeId, onWorkflowChange, onSelectNode],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const updated = applyEdgeChanges(changes, rfEdges) as RFEdge[];
      onWorkflowChange(applyEdges(workflow, updated));
    },
    [workflow, rfEdges, onWorkflowChange],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const updated = addEdge({ ...connection, type: 'smoothstep' }, rfEdges) as RFEdge[];
      onWorkflowChange(applyEdges(workflow, updated));
    },
    [workflow, rfEdges, onWorkflowChange],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/aiflow-node-type') as NodeType;
      if (!type || !Object.values(NodeType).includes(type)) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const newWorkflow = addNode(workflow, type, position);
      const newNode = newWorkflow.nodes[newWorkflow.nodes.length - 1];
      const isCircle = type === NodeType.START || type === NodeType.END;
      addNodes([{
        id: newNode.id,
        type: 'workflowNode' as const,
        position,
        data: { nodeType: type, label: newNode.name },
        width: isCircle ? 64 : 160,
        ...(isCircle ? { height: 64 } : {}),
      }]);
      onWorkflowChange(newWorkflow);
    },
    [workflow, screenToFlowPosition, addNodes, onWorkflowChange],
  );

  return (
    <div className="canvas-wrapper">
      <ReactFlow
        nodes={rfNodesWithSelection}
        edges={rfEdgesWithSelection}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={(_, node) => { onSelectNode(node.id); onSelectEdge(null); }}
        onEdgeClick={onEdgeClick}
        onPaneClick={() => { onSelectNode(null); onSelectEdge(null); }}
        deleteKeyCode="Delete"
        snapToGrid
        snapGrid={[20, 20]}
        nodesDraggable={isInteractive}
        nodesConnectable={isInteractive}
        elementsSelectable={isInteractive}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} />
        <Controls showInteractive={false}>
          <ControlButton
            onClick={onAutoLayout}
            title="Auto-arrange nodes in a top-to-bottom layout"
            disabled={!isInteractive}
          >
            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
              <rect x="5" y="0" width="6" height="4" rx="1" />
              <rect x="0" y="12" width="6" height="4" rx="1" />
              <rect x="10" y="12" width="6" height="4" rx="1" />
              <line x1="8" y1="4" x2="3" y2="12" stroke="currentColor" strokeWidth="1.5" />
              <line x1="8" y1="4" x2="13" y2="12" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </ControlButton>
          <ControlButton
            onClick={() => setIsInteractive((v) => !v)}
            title={isInteractive ? 'Lock canvas (disable editing)' : 'Unlock canvas (enable editing)'}
            style={!isInteractive ? { background: 'var(--accent)', color: '#fff' } : undefined}
          >
            {isInteractive ? (
              <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor">
                <rect x="3" y="7" width="10" height="8" rx="1" />
                <path d="M5 7V5a3 3 0 0 1 6 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor">
                <rect x="3" y="7" width="10" height="8" rx="1" />
                <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </ControlButton>
        </Controls>
        <MiniMap />
      </ReactFlow>
    </div>
  );
});

export function WorkflowCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}



