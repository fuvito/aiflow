import { useCallback, useMemo, memo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
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
}

const Canvas = memo(function Canvas({ workflow, selectedNodeId, selectedEdgeId, onWorkflowChange, onSelectNode, onSelectEdge, nodeStatuses }: Props) {
  const { screenToFlowPosition, addNodes } = useReactFlow();

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
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} />
        <Controls />
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


