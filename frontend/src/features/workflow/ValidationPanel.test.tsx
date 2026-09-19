import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValidationPanel } from './ValidationPanel';

describe('ValidationPanel — valid workflow', () => {
  it('shows valid message', () => {
    render(
      <ValidationPanel
        result={{ valid: true, errors: [], warnings: [] }}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText(/workflow valid/i)).toBeInTheDocument();
  });

  it('shows warning count when warnings present', () => {
    render(
      <ValidationPanel
        result={{ valid: true, errors: [], warnings: ['Disconnected node'] }}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText(/1 warning/i)).toBeInTheDocument();
    expect(screen.getByText('Disconnected node')).toBeInTheDocument();
  });
});

describe('ValidationPanel — invalid workflow', () => {
  it('shows error count and messages', () => {
    render(
      <ValidationPanel
        result={{ valid: false, errors: ['Missing START', 'Missing END'], warnings: [] }}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText(/2 errors/i)).toBeInTheDocument();
    expect(screen.getByText('Missing START')).toBeInTheDocument();
    expect(screen.getByText('Missing END')).toBeInTheDocument();
  });

  it('shows both errors and warnings', () => {
    render(
      <ValidationPanel
        result={{ valid: false, errors: ['Missing START'], warnings: ['Orphan node'] }}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText('Missing START')).toBeInTheDocument();
    expect(screen.getByText('Orphan node')).toBeInTheDocument();
  });
});

describe('ValidationPanel — dismiss', () => {
  it('calls onDismiss when ✕ is clicked', () => {
    const onDismiss = vi.fn();
    render(
      <ValidationPanel
        result={{ valid: true, errors: [], warnings: [] }}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getByTitle('Dismiss'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
