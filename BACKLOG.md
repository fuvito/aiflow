# AiFlow MVP1 — Product Backlog

Full spec: `docs/AiFlow - MVP1.md`

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` skipped

---

## Phase 1 — Project Foundation

### Task 1 — Repository Setup `[x]`

- Set up `frontend/` with React + TypeScript + Vite + React Flow
- Set up `backend/` with FastAPI + Pydantic + pytest
- Add `.env.example` files for both
- Verify both start successfully (health check returns 200)
- Wire up CORS so frontend can call backend

---

## Phase 2 — Domain Model

### Task 2 — Workflow Schema `[x]`

**Frontend (TypeScript)**
- `WorkflowNode`, `WorkflowEdge`, `Workflow` types
- `NodeType` enum with all 10 node types
- Per-node config interfaces (LLMConfig, APIConfig, etc.)
- JSON serialization/deserialization helpers
- Unit tests

**Backend (Python)**
- Mirror Pydantic models: `WorkflowNode`, `WorkflowEdge`, `Workflow`
- `NodeType` enum
- JSON serialization round-trip test

---

## Phase 3 — Workflow Editor

### Task 3 — Basic Canvas `[x]`

- Integrate React Flow
- Canvas renders with zoom + pan
- Nodes can be moved (drag)
- Nodes can be connected (draw edges)
- Node can be selected
- Keep React Flow state isolated — use adapter to sync with domain model

### Task 4 — Node Palette `[x]`

- Left-panel node palette listing all 10 node types
- Drag node from palette onto canvas → creates domain model node + renders it
- Each node type has distinct visual style (color / icon)

### Task 5 — Node Properties Panel `[x]`

- Right panel shows selected node properties
- Editable: name, type label (read-only), config fields per node type
- Changes persist to domain model (not just React Flow state)
- Empty state when nothing selected

---

## Phase 4 — Workflow Management

### Task 6 — New Workflow `[ ]`

- Toolbar "New" button clears canvas
- Default workflow: `START → END` nodes pre-placed

### Task 7 — Save / Export JSON `[ ]`

- "Save" / "Export" downloads `workflow.json`
- Exported file is the domain model — not raw React Flow state
- File is human-readable and includes `version` field

### Task 8 — Import / Open JSON `[ ]`

- "Open" reads a `.json` file
- Parse → validate schema → load into domain model → render on canvas
- Show clear error messages for invalid files

---

## Phase 5 — Validation

### Task 9 — Workflow Validator `[ ]`

**Rules:**
- Exactly one `START` node
- At least one `END` node
- All node IDs unique
- All node types valid
- All edge source/target IDs exist
- Required config fields present per node type
- Warn on disconnected nodes

- Trigger via "Validate" button in toolbar
- Display errors and warnings in a visible UI panel

---

## Phase 6 — AI Generation

### Task 10 — LLM Provider `[ ]`

- `LLMProvider` abstract interface in backend
- `OpenAIProvider` concrete implementation (or Gemini — pick one)
- Credentials from env vars only (`LLM_API_KEY`, `LLM_MODEL`)
- Structured output / JSON mode used for workflow generation

### Task 11 — Workflow Generation API `[ ]`

- `POST /api/workflows/generate`
- Builds structured prompt from description
- Calls LLM provider
- Parses and validates result as Workflow model
- Returns workflow or meaningful error
- Backend unit tests (mock LLM call)

### Task 12 — Generate UI `[ ]`

- "Generate" button in toolbar opens description input (textarea + submit)
- Calls `POST /api/workflows/generate`
- On success: loads workflow into canvas (fully editable)
- On error: shows clear error message
- Loading state during generation

---

## Phase 7 — Example Workflow

### Task 13 — Customer Support Example `[ ]`

- `examples/customer-support.json` — the full support agent workflow
- "Load Example" option in toolbar
- Workflow: START → Classify → Knowledge Search → Customer API → Decision → (Simple: Response | Complex: Human Review → Response) → END

---

## Phase 8 — Future Architecture Stubs

### Task 14 — Future Service Interfaces `[ ]`

- `WorkflowSimulator` interface (frontend + backend) — stub only
- `WorkflowEvaluator` interface — stub only
- `LangGraphExporter` interface — stub only
- Add JSDoc/docstring explaining each interface's future responsibility

---

## Phase 9 — Testing

### Task 15 — Backend Tests `[ ]`

Pytest coverage for:
- Valid workflow passes validation
- Invalid workflow returns errors
- Missing START / END detection
- Duplicate node ID detection
- Invalid node type rejection
- Invalid edge references
- JSON round-trip serialization
- Missing required config detection

### Task 16 — Frontend Tests `[ ]`

Vitest / React Testing Library coverage for:
- Canvas renders without crash
- Node added to canvas
- Node selected → properties panel shows correct fields
- Node config editable
- Nodes can be connected
- Workflow export produces valid JSON

---

## Phase 10 — Documentation

### Task 17 — README `[ ]`

Cover:
- Product purpose
- Architecture overview
- Project structure
- Prerequisites (Node, Python, API key)
- Installation steps
- Environment variables
- Running frontend / backend
- Running tests
- Workflow JSON format
- Node types reference
- MVP1 limitations
- Future roadmap (MVP2–4)
