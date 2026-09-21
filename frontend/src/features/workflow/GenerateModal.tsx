import { useState, useEffect, useRef } from 'react';
import type { Workflow } from '../../models/workflow';

interface Props {
  currentWorkflow?: Workflow;
  onClose: () => void;
  onGenerated: (workflow: Workflow) => void;
}

type Message = {
  role: 'user' | 'assistant';
  content: string;
  readyWorkflow?: Workflow;
};

export function GenerateModal({ currentWorkflow, onClose, onGenerated }: Props) {
  const isRefinement = !!currentWorkflow;

  const [messages, setMessages] = useState<Message[]>(() =>
    isRefinement
      ? [{ role: 'assistant', content: `Your workflow "${currentWorkflow!.name}" is loaded. What changes would you like to make?` }]
      : [],
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:8000/api/workflows/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          current_workflow: currentWorkflow ?? null,
        }),
      });

      const data = await res.json() as {
        status?: string;
        reply?: string;
        workflow?: Workflow;
        detail?: string;
      };

      if (!res.ok) {
        setError(data.detail ?? `Server error (${res.status})`);
        return;
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.reply ?? '',
        readyWorkflow: data.status === 'ready' && data.workflow ? data.workflow : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setError('Could not reach backend. Is it running on port 8000?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal chat-modal">
        <div className="modal-header">
          <span className="modal-title">
            {isRefinement ? 'Refine Workflow' : 'Generate Workflow'}
          </span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              Describe your workflow and I'll help you build it.
              <span className="chat-empty-hint">Press Enter to send · Shift+Enter for new line</span>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`chat-msg chat-msg--${msg.role}`}>
              <div className="chat-bubble">{msg.content}</div>
              {msg.readyWorkflow && (
                <div className="chat-ready-card">
                  <div className="chat-ready-meta">
                    <span className="chat-ready-name">{msg.readyWorkflow.name}</span>
                    <span className="chat-ready-count">{msg.readyWorkflow.nodes.length} nodes</span>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => { onGenerated(msg.readyWorkflow!); onClose(); }}
                  >
                    Load to Canvas
                  </button>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="chat-msg chat-msg--assistant">
              <div className="chat-bubble chat-bubble--typing">
                <span className="chat-dot" />
                <span className="chat-dot" />
                <span className="chat-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error && <div className="modal-error chat-error">{error}</div>}

        <div className="chat-input-row">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={
              isLoading
                ? 'Waiting for response…'
                : isRefinement
                ? 'What changes would you like?'
                : 'Describe your workflow…'
            }
            rows={2}
            disabled={isLoading}
          />
          <button
            className="btn btn-primary chat-send-btn"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? <><span className="spinner" /> Thinking…</> : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
