import { memo } from 'react';
import { NodeType } from '../../models/workflow';
import { NODE_DEFINITIONS } from './nodes/nodeDefinitions';
import { HelpIcon } from '../../components/HelpIcon';

const NODE_HELP: Record<NodeType, string> = {
  [NodeType.START]:     'The entry point of your workflow. Every workflow needs exactly one START node. Input data passed to the simulation enters here.',
  [NodeType.END]:       'The exit point. A workflow can have multiple END nodes for different outcome paths (e.g. success vs. rejection).',
  [NodeType.LLM]:       'Calls a language model. Configure the model name, system prompt, and temperature. In simulation, returns a deterministic mock response.',
  [NodeType.TOOL]:      'Executes an external tool or function. Configure the tool name and description. In simulation, returns mock output.',
  [NodeType.API]:       'Makes an HTTP request to an external endpoint. Configure the method (GET/POST/…) and URL. In simulation, returns a mock 200 response.',
  [NodeType.DATABASE]:  'Queries a database. Configure the DB type, connection reference, and SQL query. In simulation, returns mock rows.',
  [NodeType.RAG]:       'Retrieval-augmented generation — searches a knowledge base for relevant documents. Configure the knowledge base name and top-K results.',
  [NodeType.CONDITION]: 'A branching node. Evaluates an expression against the current data and routes execution along matching edges. Set the condition label on each outgoing edge.',
  [NodeType.HITL]:      'Human-in-the-loop. Pauses execution and waits for a human to approve or reject. In simulation, Auto-approve skips the pause; Pause mode shows Approve / Reject buttons in the trace panel.',
  [NodeType.TRANSFORM]: 'Reshapes or filters data as it flows through the workflow. Describe the transformation in the configuration.',
};

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
      <div className="palette-title">
        Nodes
        <HelpIcon
          title="Node Palette"
          body="Drag any node type onto the canvas to add it to your workflow. Connect nodes by dragging from the bottom handle of one node to the top handle of another. Click any node on the canvas to configure it in the Properties panel."
        />
      </div>
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
            <HelpIcon title={def.label} body={NODE_HELP[type]} />
          </div>
        );
      })}
    </aside>
  );
});
