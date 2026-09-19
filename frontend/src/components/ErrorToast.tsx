interface Props {
  message: string;
  onDismiss: () => void;
}

export function ErrorToast({ message, onDismiss }: Props) {
  return (
    <div className="error-toast">
      <span>{message}</span>
      <button onClick={onDismiss} className="error-toast-close">✕</button>
    </div>
  );
}
