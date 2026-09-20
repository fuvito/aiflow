import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkflowHistory } from './useWorkflowHistory';
import { createDefaultWorkflow } from '../utils/workflowSerializer';

describe('useWorkflowHistory', () => {
  it('initialises with the given workflow value', () => {
    const initial = createDefaultWorkflow();
    const { result } = renderHook(() => useWorkflowHistory(initial));
    expect(result.current.workflow).toBe(initial);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('initialises with a factory function (lazy init)', () => {
    const { result } = renderHook(() => useWorkflowHistory(createDefaultWorkflow));
    expect(result.current.workflow.nodes).toHaveLength(2); // START + END
  });

  it('setWorkflow pushes onto the stack and enables undo', () => {
    const initial = createDefaultWorkflow();
    const { result } = renderHook(() => useWorkflowHistory(initial));

    act(() => result.current.setWorkflow({ ...initial, name: 'Step 2' }));

    expect(result.current.workflow.name).toBe('Step 2');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('setWorkflow accepts a functional updater', () => {
    const initial = createDefaultWorkflow();
    const { result } = renderHook(() => useWorkflowHistory(initial));

    act(() => result.current.setWorkflow(wf => ({ ...wf, name: 'Functional' })));

    expect(result.current.workflow.name).toBe('Functional');
  });

  it('undo steps back to the previous state', () => {
    const initial = createDefaultWorkflow();
    const { result } = renderHook(() => useWorkflowHistory(initial));

    act(() => result.current.setWorkflow({ ...initial, name: 'Step 2' }));
    act(() => result.current.undo());

    expect(result.current.workflow.name).toBe(initial.name);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('redo re-applies the undone state', () => {
    const initial = createDefaultWorkflow();
    const { result } = renderHook(() => useWorkflowHistory(initial));

    act(() => result.current.setWorkflow({ ...initial, name: 'Step 2' }));
    act(() => result.current.undo());
    act(() => result.current.redo());

    expect(result.current.workflow.name).toBe('Step 2');
    expect(result.current.canRedo).toBe(false);
  });

  it('setWorkflow after undo clears the redo branch', () => {
    const initial = createDefaultWorkflow();
    const { result } = renderHook(() => useWorkflowHistory(initial));

    act(() => result.current.setWorkflow({ ...initial, name: 'Branch A' }));
    act(() => result.current.undo());
    act(() => result.current.setWorkflow({ ...initial, name: 'Branch B' }));

    expect(result.current.workflow.name).toBe('Branch B');
    expect(result.current.canRedo).toBe(false);
    expect(result.current.canUndo).toBe(true);
  });

  it('reset clears history to a single entry', () => {
    const initial = createDefaultWorkflow();
    const { result } = renderHook(() => useWorkflowHistory(initial));

    act(() => result.current.setWorkflow({ ...initial, name: 'Changed' }));
    expect(result.current.canUndo).toBe(true);

    const fresh = createDefaultWorkflow();
    act(() => result.current.reset(fresh));

    expect(result.current.workflow).toBe(fresh);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('undo is a no-op at the beginning of history', () => {
    const initial = createDefaultWorkflow();
    const { result } = renderHook(() => useWorkflowHistory(initial));

    act(() => result.current.undo());

    expect(result.current.workflow).toBe(initial);
  });

  it('redo is a no-op when nothing has been undone', () => {
    const initial = createDefaultWorkflow();
    const { result } = renderHook(() => useWorkflowHistory(initial));

    act(() => result.current.redo());

    expect(result.current.workflow).toBe(initial);
  });

  it('multiple undos traverse the full stack', () => {
    const initial = createDefaultWorkflow();
    const { result } = renderHook(() => useWorkflowHistory(initial));

    act(() => result.current.setWorkflow({ ...initial, name: 'A' }));
    act(() => result.current.setWorkflow({ ...initial, name: 'B' }));
    act(() => result.current.setWorkflow({ ...initial, name: 'C' }));
    act(() => result.current.undo());
    act(() => result.current.undo());

    expect(result.current.workflow.name).toBe('A');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);
  });
});
