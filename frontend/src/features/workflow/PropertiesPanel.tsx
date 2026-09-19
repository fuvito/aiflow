import type { Workflow } from '../../models/workflow';
import { getNodeDefinition } from './nodes/nodeDefinitions';
import type { ConfigField } from './nodes/nodeDefinitions';

interface Props {
  workflow: Workflow;
  selectedNodeId: string | null;
  onNameChange: (nodeId: string, name: string) => void;
  onConfigChange: (nodeId: string, key: string, value: unknown) => void;
}

export function PropertiesPanel({ workflow, selectedNodeId, onNameChange, onConfigChange }: Props) {
  const node = selectedNodeId ? workflow.nodes.find((n) => n.id === selectedNodeId) : null;

  if (!node) {
    return (
      <aside className="properties-panel">
        <div className="properties-empty">Select a node to edit its properties.</div>
      </aside>
    );
  }

  const def = getNodeDefinition(node.type);

  return (
    <aside className="properties-panel">
      <div className="properties-title">Properties</div>

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
