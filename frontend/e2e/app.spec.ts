import { test, expect } from '@playwright/test';

test.describe('Toolbar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows brand and all action buttons', async ({ page }) => {
    await expect(page.getByText('AiFlow')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Validate' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'JSON' })).toBeVisible();
  });

  test('undo and redo buttons start disabled', async ({ page }) => {
    await expect(page.getByRole('button', { name: '↶' })).toBeDisabled();
    await expect(page.getByRole('button', { name: '↷' })).toBeDisabled();
  });

  test('workflow name is editable', async ({ page }) => {
    const input = page.locator('.toolbar-workflow-name');
    await input.fill('My Test Workflow');
    await expect(input).toHaveValue('My Test Workflow');
  });

  test('theme toggle switches between dark and light', async ({ page }) => {
    const html = page.locator('html');
    await expect(html).not.toHaveAttribute('data-theme', 'light');
    await page.getByTitle(/switch to light mode/i).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.getByTitle(/switch to dark mode/i).click();
    await expect(html).not.toHaveAttribute('data-theme', 'light');
  });
});

test.describe('Canvas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('canvas wrapper is visible', async ({ page }) => {
    await expect(page.locator('.canvas-wrapper')).toBeVisible();
  });

  test('shows default START and END nodes', async ({ page }) => {
    await expect(page.getByText('START')).toBeVisible();
    await expect(page.getByText('END')).toBeVisible();
  });
});

test.describe('Node palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('palette lists all node types', async ({ page }) => {
    const nodeTypes = ['Start', 'End', 'LLM', 'Tool', 'API', 'Database', 'RAG', 'Condition', 'HITL', 'Transform'];
    for (const label of nodeTypes) {
      await expect(page.locator('.palette-item', { hasText: label })).toBeVisible();
    }
  });
});

test.describe('Load example', () => {
  test('loads customer support example and shows multiple nodes', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Example' }).click();
    // Customer support example has more than 2 nodes
    const nodes = page.locator('.react-flow__node');
    await expect(nodes).toHaveCount(8);
  });
});

test.describe('Undo / Redo', () => {
  test('undo becomes enabled after workflow name change, redo after undo', async ({ page }) => {
    await page.goto('/');
    const undoBtn = page.getByRole('button', { name: '↶' });
    const redoBtn = page.getByRole('button', { name: '↷' });

    await expect(undoBtn).toBeDisabled();

    // Editing the name pushes a history entry
    const input = page.locator('.toolbar-workflow-name');
    await input.fill('Changed Name');

    await expect(undoBtn).toBeEnabled();
    await expect(redoBtn).toBeDisabled();

    await undoBtn.click();
    await expect(redoBtn).toBeEnabled();
  });

  test('Ctrl+Z and Ctrl+Y keyboard shortcuts work', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('.toolbar-workflow-name');
    await input.fill('Keyboard Test');

    await page.keyboard.press('Control+z');
    await expect(page.getByRole('button', { name: '↷' })).toBeEnabled();

    await page.keyboard.press('Control+y');
    await expect(page.locator('.toolbar-workflow-name')).toHaveValue('Keyboard Test');
  });
});

test.describe('New workflow', () => {
  test('creates a fresh workflow on confirm', async ({ page }) => {
    await page.goto('/');
    page.on('dialog', d => d.accept());
    await page.getByRole('button', { name: 'New' }).click();
    await expect(page.locator('.toolbar-workflow-name')).toHaveValue('New Workflow');
  });
});

test.describe('JSON editor', () => {
  test('opens and closes the JSON editor modal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'JSON' }).click();
    await expect(page.locator('.json-editor-textarea')).toBeVisible();
    await page.getByRole('button', { name: '✕' }).click();
    await expect(page.locator('.json-editor-textarea')).not.toBeVisible();
  });

  test('JSON editor contains valid workflow JSON', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'JSON' }).click();
    const text = await page.locator('.json-editor-textarea').inputValue();
    const parsed = JSON.parse(text);
    expect(parsed).toHaveProperty('nodes');
    expect(parsed).toHaveProperty('edges');
    expect(parsed).toHaveProperty('version');
  });
});
