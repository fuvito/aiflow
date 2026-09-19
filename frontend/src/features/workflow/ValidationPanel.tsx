interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface Props {
  result: ValidationResult;
  onDismiss: () => void;
}

export function ValidationPanel({ result, onDismiss }: Props) {
  const { valid, errors, warnings } = result;

  return (
    <div className={`validation-panel ${valid ? 'validation-panel--valid' : 'validation-panel--invalid'}`}>
      <div className="validation-panel-header">
        <span className="validation-panel-title">
          {valid ? '✓ Workflow valid' : `✗ ${errors.length} error${errors.length !== 1 ? 's' : ''}`}
          {warnings.length > 0 && (
            <span className="validation-warning-count">
              {' '}· {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
            </span>
          )}
        </span>
        <button className="validation-dismiss" onClick={onDismiss} title="Dismiss">✕</button>
      </div>

      {errors.length > 0 && (
        <ul className="validation-list validation-list--errors">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      {warnings.length > 0 && (
        <ul className="validation-list validation-list--warnings">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type { ValidationResult };
