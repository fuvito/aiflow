import { useCallback, useEffect } from 'react';
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
  onWorkflowChange: (wf: Workflow) => void;
  onSelectNode: (nodeId: string | null) => void;
}

function Canvas({ workflow, selectedNodeId, onWorkflowChange, onSelectNode }: Props) {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const { nodes: rfNodes, edges: rfEdges } = workflowToReactFlow(workflow);

  // Re-fit the viewport whenever a new workflow is loaded (id changes)
  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 50);
    return () => clearTimeout(t);
  }, [workflow.id, fitView]);

  const rfNodesWithSelection = rfNodes.map((n) => ({
    ...n,
    selected: n.id === selectedNodeId,
  }));

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
      const updated = applyNodeChanges(changes, rfNodes) as WorkflowRFNode[];
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
      onWorkflowChange(addNode(workflow, type, position));
    },
    [workflow, screenToFlowPosition, onWorkflowChange],
  );

  return (
    <div className="canvas-wrapper">
      <ReactFlow
        nodes={rfNodesWithSelection}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        onPaneClick={() => onSelectNode(null)}
        deleteKeyCode="Delete"
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#2a2a2a" gap={20} />
        <Controls />
        <MiniMap
          style={{ background: '#1a1a1a', border: '1px solid #333' }}
        />
      </ReactFlow>
    </div>
  );
}

export function WorkflowCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
