import type { ValidationResult } from '../features/workflow/ValidationPanel';

interface Props {
  workflowName: string;
  onNew: () => void;
  onSave: () => void;
  onOpen: () => void;
  onLoadExample: () => void;
  onValidate: () => void;
  onGenerate: () => void;
  onNameChange: (name: string) => void;
  isValidating?: boolean;
  validationResult?: ValidationResult | null;
}

export function Toolbar({
  workflowName,
  onNew,
  onSave,
  onOpen,
  onLoadExample,
  onValidate,
  onGenerate,
  onNameChange,
  isValidating,
  validationResult,
}: Props) {
  const hasErrors = validationResult && !validationResult.valid;
  const hasWarnings = validationResult?.warnings.length;

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
        <button className="btn btn-ghost" onClick={onLoadExample} title="Load customer support example">Example</button>
        <button className="btn btn-ghost" onClick={onSave}>Save</button>
        <button
          className={`btn btn-ghost validate-btn${hasErrors ? ' validate-btn--error' : hasWarnings ? ' validate-btn--warn' : ''}`}
          onClick={onValidate}
          disabled={isValidating}
        >
          {isValidating ? 'Validating…' : 'Validate'}
          {hasErrors && (
            <span className="validate-badge validate-badge--error">{validationResult.errors.length}</span>
          )}
          {!hasErrors && hasWarnings && (
            <span className="validate-badge validate-badge--warn">{validationResult!.warnings.length}</span>
          )}
        </button>
        <button className="btn btn-primary" onClick={onGenerate}>Generate</button>
      </div>
    </header>
  );
}
