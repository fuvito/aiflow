# AiFlow — Current Iteration

## Iteration 1 — Project Foundation + Domain Model — COMPLETE

Tasks 1 & 2. Frontend scaffold, backend scaffold, TypeScript + Pydantic workflow models, 24 tests green.

---

## Iteration 2 — Workflow Editor UI — COMPLETE

**Completed:** 2026-09-19

### Task 3 — Basic Canvas ✓
- [x] React Flow integrated with `ReactFlowProvider`
- [x] Background, Controls, MiniMap
- [x] Nodes moveable, edges connectable, node selection
- [x] Delete key removes selected node
- [x] `WorkflowAdapter.ts` — bidirectional domain model ↔ React Flow mapping

### Task 4 — Node Palette ✓
- [x] Left panel: all 10 node types listed with color dots
- [x] Drag from palette → drops node onto canvas at correct position
- [x] Data-driven via `nodeDefinitions.ts` (adding node type = 1 file change)

### Task 5 — Node Properties Panel ✓
- [x] Right panel shows selected node name, type badge, config fields
- [x] Name editable, updates domain model
- [x] Type-specific config fields: text, textarea, number, select
- [x] Empty state when nothing selected

### READMEs ✓
- [x] Root `README.md` — project intro, setup, run, env vars, JSON format, roadmap
- [x] `frontend/README.md` — frontend-specific setup and structure
- [x] `backend/README.md` — backend-specific setup, API reference, env vars

---

## Iteration 3 — Workflow Management + Validation UI

**Goal:** Full save/load/new cycle and visible validation results panel.

Status: `NOT STARTED`

### Task 6 — New Workflow
- [ ] "New" button resets canvas to default START → END
- [ ] Confirm dialog before discarding

### Task 7 — Save / Export JSON
- [ ] "Save" downloads `<workflow-name>.json`
- [ ] Exported file is domain model — not raw React Flow state
- [ ] Human-readable, versioned

### Task 8 — Import / Open JSON
- [ ] "Open" file picker for `.json` files
- [ ] Parse → validate schema → load into domain model → render canvas
- [ ] Clear error messages for invalid files

> Note: Tasks 6, 7, 8 are already wired in `App.tsx` from Iteration 2. Verify they work end-to-end and add edge-case handling.

### Task 9 — Validation UI
- [ ] "Validate" calls `POST /api/workflows/validate`
- [ ] Errors shown in a visible panel below the canvas (not just alert)
- [ ] Warnings shown separately
- [ ] Panel auto-clears when workflow changes
- [ ] Frontend-side validation runs first (optional: for offline use)

**Done when:** User can save a workflow, reopen it from file, validate and see errors listed in the UI.

---

## Upcoming Iterations

| Iteration | Tasks | Focus |
|-----------|-------|-------|
| 4 | 10, 11, 12 | AI Generation (LLM provider + endpoint + Generate UI) |
| 5 | 13 | Customer Support example workflow |
| 6 | 14 | Future interface stubs |
| 7 | 15, 16 | Tests (backend + frontend) |
| 8 | 17 | Final docs polish |
