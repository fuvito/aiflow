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
  alignNodes,
} from './WorkflowAdapter';
import type { AlignmentType, RFNodeData, WorkflowRFNode } from './WorkflowAdapter';
import { WorkflowNodeComponent } from './nodes/WorkflowNodeComponent';
import { getNodeDefinition } from './nodes/nodeDefinitions';
import { DeletableEdge } from './edges/DeletableEdge';
import { CanvasContextMenu } from './CanvasContextMenu';
import type { ContextMenuState } from './CanvasContextMenu';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes = { workflowNode: WorkflowNodeComponent as any };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const edgeTypes = { deletable: DeletableEdge as any };
const DEFAULT_EDGE_OPTIONS = { type: 'deletable' as const };
const LARGE_GRAPH_THRESHOLD = 40;

interface Props {
  workflow: Workflow;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onWorkflowChange: (wf: Workflow) => void;
  onSelectNode: (nodeId: string | null) => void;
  onSelectEdge: (edgeId: string | null) => void;
  nodeStatuses?: Record<string, string>;
  traversedEdgeIds?: Set<string> | null;
  autoLayoutRevision?: number;
  onAutoLayout?: () => void;
}

const Canvas = memo(function Canvas({ workflow, selectedNodeId, selectedEdgeId, onWorkflowChange, onSelectNode, onSelectEdge, nodeStatuses, traversedEdgeIds, autoLayoutRevision, onAutoLayout }: Props) {
  const { screenToFlowPosition, addNodes, setCenter, getZoom, getNode, fitView } = useReactFlow();
  const [isInteractive, setIsInteractive] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [hiddenNodeIds, setHiddenNodeIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(selectedNodeId ? [selectedNodeId] : []),
  );

  // Sync single-select from parent (e.g. after undo/new) into local set
  useEffect(() => {
    setSelectedIds(new Set(selectedNodeId ? [selectedNodeId] : []));
  }, [selectedNodeId]);

  const { nodes: rfNodes, edges: rfEdges } = useMemo(
    () => workflowToReactFlow(workflow),
    [workflow],
  );

  const rfNodesWithSelection = useMemo(
    () => rfNodes.map((n) => ({
      ...n,
      selected: selectedIds.has(n.id),
      hidden: hiddenNodeIds.has(n.id),
      data: { ...n.data, executionStatus: nodeStatuses?.[n.id] },
    })),
    [rfNodes, selectedIds, nodeStatuses, hiddenNodeIds],
  );

  const rfEdgesWithSelection = useMemo(
    () => rfEdges.map((e) => {
      const traversed = traversedEdgeIds ? traversedEdgeIds.has(e.id) : null;
      return {
        ...e,
        selected: e.id === selectedEdgeId,
        style: traversed === null ? undefined
          : traversed
          ? { stroke: '#60a5fa', strokeWidth: 2.5 }
          : { stroke: 'var(--border)', opacity: 0.3 },
      };
    }),
    [rfEdges, selectedEdgeId, traversedEdgeIds],
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

  const onMoveEnd = useCallback(
    (_: MouseEvent | TouchEvent | null, { x, y, zoom }: { x: number; y: number; zoom: number }) => {
      if (rfNodes.length < LARGE_GRAPH_THRESHOLD) {
        setHiddenNodeIds((prev) => prev.size > 0 ? new Set() : prev);
        return;
      }
      const vpW = window.innerWidth;
      const vpH = window.innerHeight;
      const PAD = 1500;
      const left = -x / zoom - PAD;
      const top = -y / zoom - PAD;
      const right = (-x + vpW) / zoom + PAD;
      const bottom = (-y + vpH) / zoom + PAD;
      const next = new Set<string>();
      for (const node of rfNodes) {
        const nw = (node.measured?.width ?? node.width ?? 160) as number;
        const nh = (node.measured?.height ?? node.height ?? 60) as number;
        if (node.position.x + nw < left || node.position.x > right
         || node.position.y + nh < top || node.position.y > bottom) {
          next.add(node.id);
        }
      }
      setHiddenNodeIds(next);
    },
    [rfNodes],
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
      // Removals
      const removals = changes.filter((c) => c.type === 'remove');
      if (removals.length > 0) {
        let wf = workflow;
        for (const r of removals) {
          if ('id' in r) {
            wf = removeNode(wf, r.id);
            if (r.id === selectedNodeId) onSelectNode(null);
            setSelectedIds((prev) => { const s = new Set(prev); s.delete(r.id); return s; });
          }
        }
        onWorkflowChange(wf);
        return;
      }
      // Position (drag end only)
      const positionChanges = changes.filter((c) => c.type === 'position' && !c.dragging);
      if (positionChanges.length > 0) {
        const updated = applyNodeChanges(positionChanges, rfNodes) as WorkflowRFNode[];
        onWorkflowChange(applyNodePositions(workflow, updated as RFNode[]));
      }
      // Selection changes from lasso / shift-click
      const selectChanges = changes.filter((c) => c.type === 'select');
      if (selectChanges.length > 0) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (const c of selectChanges) {
            const sc = c as { type: 'select'; id: string; selected: boolean };
            if (sc.selected) next.add(sc.id);
            else next.delete(sc.id);
          }
          if (next.size === 1) onSelectNode([...next][0]);
          else if (next.size === 0) onSelectNode(null);
          return next;
        });
      }
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
      const updated = addEdge({ ...connection, type: 'deletable' }, rfEdges) as RFEdge[];
      onWorkflowChange(applyEdges(workflow, updated));
    },
    [workflow, rfEdges, onWorkflowChange],
  );

  const handleContextMenuDuplicate = useCallback((nodeId: string) => {
    const src = workflow.nodes.find((n) => n.id === nodeId);
    if (!src) return;
    const newId = `${src.type.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`;
    onWorkflowChange({
      ...workflow,
      nodes: [...workflow.nodes, { ...src, id: newId, position: { x: src.position.x + 40, y: src.position.y + 40 } }],
    });
  }, [workflow, onWorkflowChange]);

  const handleContextMenuDelete = useCallback((nodeId: string) => {
    onWorkflowChange({
      ...workflow,
      nodes: workflow.nodes.filter((n) => n.id !== nodeId),
      edges: workflow.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    });
    if (nodeId === selectedNodeId) onSelectNode(null);
  }, [workflow, onWorkflowChange, selectedNodeId, onSelectNode]);

  const handleContextMenuAddNode = useCallback((type: NodeType, position: { x: number; y: number }) => {
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
  }, [workflow, addNodes, onWorkflowChange]);

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
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={(_, node) => { setSelectedIds(new Set([node.id])); onSelectNode(node.id); onSelectEdge(null); setContextMenu(null); }}
        onEdgeClick={onEdgeClick}
        onPaneClick={() => { setSelectedIds(new Set()); onSelectNode(null); onSelectEdge(null); setContextMenu(null); }}
        onNodeContextMenu={(e, node) => {
          e.preventDefault();
          setContextMenu({ type: 'node', screenX: e.clientX, screenY: e.clientY, nodeId: node.id });
        }}
        onPaneContextMenu={(e) => {
          e.preventDefault();
          const pos = screenToFlowPosition({ x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY });
          setContextMenu({ type: 'pane', screenX: (e as React.MouseEvent).clientX, screenY: (e as React.MouseEvent).clientY, flowPosition: pos });
        }}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        onMoveEnd={onMoveEnd}
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
        <MiniMap
          nodeColor={(node) => getNodeDefinition((node.data as RFNodeData).nodeType)?.color ?? '#888'}
          nodeStrokeWidth={3}
        />
      </ReactFlow>
      {selectedIds.size >= 2 && (
        <div className="alignment-toolbar">
          {([
            ['left',     '⬑', 'Align left'],
            ['center-h', '⬔', 'Align center (horizontal)'],
            ['right',    '⬒', 'Align right'],
            ['top',      '⬘', 'Align top'],
            ['center-v', '⬕', 'Align middle (vertical)'],
            ['bottom',   '⬙', 'Align bottom'],
          ] as [AlignmentType, string, string][]).map(([type, icon, title]) => (
            <button
              key={type}
              className="alignment-btn"
              title={title}
              onClick={() => {
                const dims = new Map(
                  [...selectedIds].map((id) => {
                    const n = getNode(id);
                    return [id, { width: n?.measured?.width ?? n?.width ?? 160, height: n?.measured?.height ?? n?.height ?? 60 }];
                  }),
                );
                onWorkflowChange(alignNodes(workflow, [...selectedIds], type, dims));
              }}
            >
              {icon}
            </button>
          ))}
          <span className="alignment-count">{selectedIds.size} selected</span>
        </div>
      )}

      {contextMenu && (
        <CanvasContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onDuplicate={handleContextMenuDuplicate}
          onDelete={handleContextMenuDelete}
          onAddNode={handleContextMenuAddNode}
        />
      )}
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



