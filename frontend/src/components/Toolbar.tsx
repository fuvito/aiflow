import type { ValidationResult } from '../features/workflow/ValidationPanel';

interface Props {
  workflowName: string;
  onNew: () => void;
  onSave: () => void;
  onOpen: () => void;
  onLoadExample: () => void;
  onValidate: () => void;
  onGenerate: () => void;
  onEditJson: () => void;
  onNameChange: (name: string) => void;
  isValidating?: boolean;
  validationResult?: ValidationResult | null;
  isDark?: boolean;
  onToggleTheme?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function Toolbar({
  workflowName,
  onNew,
  onSave,
  onOpen,
  onLoadExample,
  onValidate,
  onGenerate,
  onEditJson,
  onNameChange,
  isValidating,
  validationResult,
  isDark = true,
  onToggleTheme,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
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
        <button className="btn btn-ghost" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">↶</button>
        <button className="btn btn-ghost" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">↷</button>
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
        <button
          className="btn btn-theme"
          onClick={onToggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? '☀' : '☾'}
        </button>
        <button className="btn btn-ghost" onClick={onEditJson} title="Edit workflow JSON">JSON</button>
        <button className="btn btn-primary" onClick={onGenerate}>Generate</button>
      </div>
    </header>
  );
}
