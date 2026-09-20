import { test, expect } from '@playwright/test';
import type { ExecutionTrace } from '../src/models/simulation';

// ── Shared mock data ──────────────────────────────────────────────────

function makeTrace(overrides: Partial<ExecutionTrace> = {}): ExecutionTrace {
  return {
    trace_id: 'e2e-trace-1',
    workflow_id: 'wf-default',
    workflow_name: 'Untitled Workflow',
    started_at: '2024-01-01T00:00:00Z',
    completed_at: '2024-01-01T00:00:01Z',
    status: 'complete',
    steps: [
      {
        node_id: 'start', node_name: 'Start', node_type: 'START', status: 'success',
        started_at: '2024-01-01T00:00:00Z', completed_at: '2024-01-01T00:00:00.5Z',
        input: {}, output: { passed: true },
      },
      {
        node_id: 'end', node_name: 'End', node_type: 'END', status: 'success',
        started_at: '2024-01-01T00:00:00.5Z', completed_at: '2024-01-01T00:00:01Z',
        input: { passed: true }, output: { result: 'done' },
      },
    ],
    ...overrides,
  };
}

const HITL_TRACE = makeTrace({
  steps: [
    {
      node_id: 'start', node_name: 'Start', node_type: 'START', status: 'success',
      started_at: '2024-01-01T00:00:00Z', completed_at: '2024-01-01T00:00:00.3Z',
      input: {}, output: {},
    },
    {
      node_id: 'review', node_name: 'Human Review', node_type: 'HITL', status: 'success',
      started_at: '2024-01-01T00:00:00.3Z', completed_at: '2024-01-01T00:00:00.7Z',
      input: { data: 'review me' }, output: { approved: true, reviewer: 'auto' },
    },
    {
      node_id: 'end', node_name: 'End', node_type: 'END', status: 'success',
      started_at: '2024-01-01T00:00:00.7Z', completed_at: '2024-01-01T00:00:01Z',
      input: { approved: true }, output: { result: 'done' },
    },
  ],
});

// ── Helper to mock the simulate endpoint ─────────────────────────────
async function mockSimulate(
  page: import('@playwright/test').Page,
  trace: ExecutionTrace = makeTrace(),
  evaluation: object | null = null,
) {
  await page.route('**/api/workflows/simulate', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ trace, evaluation }),
    }),
  );
}

// ── Helper to select a display mode in the modal ─────────────────────
async function selectDisplayMode(
  page: import('@playwright/test').Page,
  value: 'animated' | 'instant' | 'manual',
) {
  const setting = page.locator('.sim-setting', { hasText: 'Execution display' });
  await setting.locator('select').selectOption(value);
}

// ── Modal open / close ────────────────────────────────────────────────
test.describe('Simulation — modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Simulate button opens the modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate' }).click();
    await expect(page.getByText('Simulate Workflow')).toBeVisible();
  });

  test('modal closes when Cancel is clicked', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Simulate Workflow')).not.toBeVisible();
  });

  test('modal closes when ✕ is clicked', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate' }).click();
    await page.locator('.modal-close').click();
    await expect(page.getByText('Simulate Workflow')).not.toBeVisible();
  });

  test('modal shows settings controls', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate' }).click();
    await expect(page.getByText('HITL nodes')).toBeVisible();
    await expect(page.getByText('CONDITION branching')).toBeVisible();
    await expect(page.getByText('Execution display')).toBeVisible();
  });
});

// ── Instant mode ──────────────────────────────────────────────────────
test.describe('Simulation — instant mode', () => {
  test.beforeEach(async ({ page }) => {
    await mockSimulate(page);
    await page.goto('/');
  });

  test('submitting shows the trace panel', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate' }).click();
    await selectDisplayMode(page, 'instant');
    await page.getByRole('button', { name: 'Run Simulation' }).click();
    await expect(page.locator('.trace-panel')).toBeVisible();
  });

  test('trace panel shows all step names', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate' }).click();
    await selectDisplayMode(page, 'instant');
    await page.getByRole('button', { name: 'Run Simulation' }).click();
    await expect(page.locator('.trace-step-name', { hasText: 'Start' })).toBeVisible();
    await expect(page.locator('.trace-step-name', { hasText: 'End' })).toBeVisible();
  });

  test('trace status shows complete', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate' }).click();
    await selectDisplayMode(page, 'instant');
    await page.getByRole('button', { name: 'Run Simulation' }).click();
    await expect(page.locator('.trace-status--complete')).toBeVisible();
  });

  test('step detail opens and shows input JSON on click', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate' }).click();
    await selectDisplayMode(page, 'instant');
    await page.getByRole('button', { name: 'Run Simulation' }).click();
    await page.locator('.trace-step-name', { hasText: 'Start' }).click();
    await expect(page.locator('.trace-step-detail')).toBeVisible();
    await expect(page.locator('.trace-step-json-label', { hasText: 'Input' })).toBeVisible();
  });

  test('Clear button removes the trace panel', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate' }).click();
    await selectDisplayMode(page, 'instant');
    await page.getByRole('button', { name: 'Run Simulation' }).click();
    await expect(page.locator('.trace-panel')).toBeVisible();
    await page.getByText('Clear').click();
    await expect(page.locator('.trace-panel')).not.toBeVisible();
  });
});

// ── Animated mode ─────────────────────────────────────────────────────
test.describe('Simulation — animated mode', () => {
  test.beforeEach(async ({ page }) => {
    await mockSimulate(page);
    await page.goto('/');
  });

  test('trace panel appears and all steps become visible after animation', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate' }).click();
    // Set delay to minimum (200ms) so the test is fast
    await page.locator('.sim-range').evaluate((el) => {
      (el as HTMLInputElement).value = '200';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.getByRole('button', { name: 'Run Simulation' }).click();

    // Trace panel should appear immediately
    await expect(page.locator('.trace-panel')).toBeVisible();

    // After the animation completes both steps should be visible
    await expect(page.locator('.trace-step-name', { hasText: 'Start' })).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.trace-step-name', { hasText: 'End' })).toBeVisible({ timeout: 3000 });
  });

  test('trace reaches complete status after all steps animate', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate' }).click();
    await page.locator('.sim-range').evaluate((el) => {
      (el as HTMLInputElement).value = '200';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.getByRole('button', { name: 'Run Simulation' }).click();
    await expect(page.locator('.trace-status--complete')).toBeVisible({ timeout: 3000 });
  });
});

// ── Manual step-through mode ──────────────────────────────────────────
test.describe('Simulation — manual step-through', () => {
  test.beforeEach(async ({ page }) => {
    await mockSimulate(page);
    await page.goto('/');
  });

  test('Next Step button is visible after submitting in manual mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate' }).click();
    await selectDisplayMode(page, 'manual');
    await page.getByRole('button', { name: 'Run Simulation' }).click();
    await expect(page.locator('.trace-panel')).toBeVisible();
    await expect(page.getByText(/Next Step/)).toBeVisible();
  });

  test('clicking Next Step reveals the first step', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate' }).click();
    await selectDisplayMode(page, 'manual');
    await page.getByRole('button', { name: 'Run Simulation' }).click();

    // No step names visible yet (cursor starts at 0)
    await expect(page.locator('.trace-step-name', { hasText: 'Start' })).not.toBeVisible();

    await page.getByText(/Next Step/).click();
    await expect(page.locator('.trace-step-name', { hasText: 'Start' })).toBeVisible();
  });

  test('Next Step button disappears after all steps are revealed', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate' }).click();
    await selectDisplayMode(page, 'manual');
    await page.getByRole('button', { name: 'Run Simulation' }).click();

    // Advance through all steps (2 steps)
    await page.getByText(/Next Step/).click();
    await page.getByText(/Next Step/).click();

    await expect(page.getByText(/Next Step/)).not.toBeVisible();
  });
});

// ── HITL auto-approve ─────────────────────────────────────────────────
test.describe('Simulation — HITL auto-approve', () => {
  test.beforeEach(async ({ page }) => {
    await mockSimulate(page, HITL_TRACE);
    await page.goto('/');
  });

  test('trace completes without showing the pause bar', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate' }).click();
    // HITL mode is auto-approve by default
    await selectDisplayMode(page, 'instant');
    await page.getByRole('button', { name: 'Run Simulation' }).click();

    await expect(page.locator('.trace-status--complete')).toBeVisible();
    await expect(page.locator('.trace-hitl-bar')).not.toBeVisible();
  });

  test('HITL step appears in trace with success status indicator', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate' }).click();
    await selectDisplayMode(page, 'instant');
    await page.getByRole('button', { name: 'Run Simulation' }).click();

    await expect(page.locator('.trace-step-name', { hasText: 'Human Review' })).toBeVisible();
    // No pause controls shown — the trace is complete
    await expect(page.getByText('Approve')).not.toBeVisible();
    await expect(page.getByText('Reject')).not.toBeVisible();
  });

  test('all three steps visible after auto-approved HITL run', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate' }).click();
    await selectDisplayMode(page, 'instant');
    await page.getByRole('button', { name: 'Run Simulation' }).click();

    await expect(page.locator('.trace-step')).toHaveCount(3);
  });
});

// ── New workflow clears trace ─────────────────────────────────────────
test.describe('Simulation — state reset', () => {
  test('creating a new workflow clears the trace panel', async ({ page }) => {
    await mockSimulate(page);
    await page.goto('/');

    // Run a simulation
    await page.getByRole('button', { name: 'Simulate' }).click();
    await selectDisplayMode(page, 'instant');
    await page.getByRole('button', { name: 'Run Simulation' }).click();
    await expect(page.locator('.trace-panel')).toBeVisible();

    // Create new workflow — accept the confirmation dialog
    page.on('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'New' }).click();
    await expect(page.locator('.trace-panel')).not.toBeVisible();
  });
});
