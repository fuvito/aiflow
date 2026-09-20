import type { Workflow, WorkflowEdge } from '../../models/workflow';
import { getNodeDefinition } from './nodes/nodeDefinitions';
import type { ConfigField } from './nodes/nodeDefinitions';
import { HelpIcon } from '../../components/HelpIcon';

interface Props {
  workflow: Workflow;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onNameChange: (nodeId: string, name: string) => void;
  onConfigChange: (nodeId: string, key: string, value: unknown) => void;
  onEdgeChange: (source: string, target: string, updates: { condition?: string; notes?: string }) => void;
}

export function PropertiesPanel({ workflow, selectedNodeId, selectedEdgeId, onNameChange, onConfigChange, onEdgeChange }: Props) {
  const node = selectedNodeId ? workflow.nodes.find((n) => n.id === selectedNodeId) : null;

  // Resolve selected edge from domain model using the stable RF edge ID format
  const edge: WorkflowEdge | null = selectedEdgeId
    ? workflow.edges.find((e) => `${e.source}→${e.target}` === selectedEdgeId) ?? null
    : null;

  if (!node && edge) {
    const sourceNode = workflow.nodes.find((n) => n.id === edge.source);
    const targetNode = workflow.nodes.find((n) => n.id === edge.target);
    return (
      <aside className="properties-panel">
        <div className="properties-title">
          Edge
          <HelpIcon
            title="Edge Properties"
            body="Condition label: the routing key used by Condition nodes. The simulation engine matches this label against the CONDITION node's expression result to decide which branch to follow.\n\nNotes: a free-text annotation for documentation purposes — not used during simulation."
          />
        </div>
        <div className="prop-group">
          <label className="prop-label">From → To</label>
          <div className="prop-edge-route">
            {sourceNode?.name ?? edge.source} → {targetNode?.name ?? edge.target}
          </div>
        </div>
        <div className="prop-group">
          <label className="prop-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            Condition label
            <HelpIcon
              title="Condition Label"
              body={'Set this on edges that leave a Condition node. The simulator matches the node\'s expression result against these labels.\n\nCommon values: true / false, yes / no, complex / simple, approved / rejected.\n\nLeave blank on non-conditional edges.'}
            />
          </label>
          <input
            className="prop-input"
            value={edge.condition ?? ''}
            placeholder="e.g. true, complex, approved"
            onChange={(e) => onEdgeChange(edge.source, edge.target, { condition: e.target.value || undefined })}
          />
        </div>
        <div className="prop-group">
          <label className="prop-label">Notes</label>
          <textarea
            className="prop-input prop-textarea"
            value={edge.notes ?? ''}
            placeholder="Optional annotation…"
            onChange={(e) => onEdgeChange(edge.source, edge.target, { notes: e.target.value || undefined })}
          />
        </div>
      </aside>
    );
  }

  if (!node) {
    return (
      <aside className="properties-panel">
        <div className="properties-empty">Select a node or edge to edit its properties.</div>
      </aside>
    );
  }

  const def = getNodeDefinition(node.type);

  return (
    <aside className="properties-panel">
      <div className="properties-title">
        Properties
        <HelpIcon
          title="Properties Panel"
          body="Shows the configuration for the selected node. Click any node on the canvas to select it.\n\nChange the node's name and configure its behaviour. Each node type exposes different fields — for example, LLM nodes have a prompt and temperature, API nodes have a URL and method."
        />
      </div>

      <div className="prop-group">
        <label className="prop-label">Name</label>
        <input
          className="prop-input"
          value={node.name}
          onChange={(e) => onNameChange(node.id, e.target.value)}
        />
      </div>

      <div className="prop-group">
        <label className="prop-label">Type</label>
        <div className="prop-badge" style={{ background: def.color }}>
          {node.type}
        </div>
      </div>

      {def.configFields.length > 0 && (
        <>
          <div className="properties-section-title">Configuration</div>
          {def.configFields.map((field: ConfigField) => (
            <div key={field.key} className="prop-group">
              <label className="prop-label">{field.label}</label>
              <ConfigFieldInput
                field={field}
                value={(node.config as Record<string, unknown>)[field.key]}
                onChange={(val) => onConfigChange(node.id, field.key, val)}
              />
            </div>
          ))}
        </>
      )}
    </aside>
  );
}

function ConfigFieldInput({
  field,
  value,
  onChange,
}: {
  field: ConfigField;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  const strVal = value === undefined || value === null ? '' : String(value);

  if (field.type === 'textarea') {
    return (
      <textarea
        className="prop-input prop-textarea"
        value={strVal}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (field.type === 'select' && field.options) {
    return (
      <select
        className="prop-input prop-select"
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select...</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'number') {
    return (
      <input
        className="prop-input"
        type="number"
        value={strVal}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      />
    );
  }

  return (
    <input
      className="prop-input"
      type="text"
      value={strVal}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
