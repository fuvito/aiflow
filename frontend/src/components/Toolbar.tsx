interface Props {
  workflowName: string;
  onNew: () => void;
  onSave: () => void;
  onOpen: () => void;
  onValidate: () => void;
  onGenerate: () => void;
  onNameChange: (name: string) => void;
}

export function Toolbar({
  workflowName,
  onNew,
  onSave,
  onOpen,
  onValidate,
  onGenerate,
  onNameChange,
}: Props) {
  return (
    <header className="toolbar">
      <div className="toolbar-brand">
        <span className="toolbar-logo">⬡</span>
        <span className="toolbar-name">AiFlow</span>
      </div>

      <input
        className="toolbar-workflow-name"
        value={workflowName}
        onChange={(e) => onNameChange(e.target.value)}
        title="Workflow name"
      />

      <div className="toolbar-actions">
        <button className="btn btn-ghost" onClick={onNew}>New</button>
        <button className="btn btn-ghost" onClick={onOpen}>Open</button>
        <button className="btn btn-ghost" onClick={onSave}>Save</button>
        <button className="btn btn-ghost" onClick={onValidate}>Validate</button>
        <button className="btn btn-primary" onClick={onGenerate}>Generate</button>
      </div>
    </header>
  );
}
