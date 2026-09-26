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

### Task 6 — New Workflow `[x]`

- Toolbar "New" button clears canvas
- Default workflow: `START → END` nodes pre-placed

### Task 7 — Save / Export JSON `[x]`

- "Save" / "Export" downloads `workflow.json`
- Exported file is the domain model — not raw React Flow state
- File is human-readable and includes `version` field

### Task 8 — Import / Open JSON `[x]`

- "Open" reads a `.json` file
- Parse → validate schema → load into domain model → render on canvas
- Show clear error messages for invalid files

---

## Phase 5 — Validation

### Task 9 — Workflow Validator `[x]`

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

### Task 10 — LLM Provider `[x]`

- `LLMProvider` abstract interface in backend
- `OpenAIProvider` concrete implementation (or Gemini — pick one)
- Credentials from env vars only (`LLM_API_KEY`, `LLM_MODEL`)
- Structured output / JSON mode used for workflow generation

### Task 11 — Workflow Generation API `[x]`

- `POST /api/workflows/generate`
- Builds structured prompt from description
- Calls LLM provider
- Parses and validates result as Workflow model
- Returns workflow or meaningful error
- Backend unit tests (mock LLM call)

### Task 12 — Generate UI `[x]`

- "Generate" button in toolbar opens description input (textarea + submit)
- Calls `POST /api/workflows/generate`
- On success: loads workflow into canvas (fully editable)
- On error: shows clear error message
- Loading state during generation

---

## Phase 7 — Example Workflow

### Task 13 — Customer Support Example `[x]`

- `examples/customer-support.json` — the full support agent workflow
- "Load Example" option in toolbar
- Workflow: START → Classify → Knowledge Search → Customer API → Decision → (Simple: Response | Complex: Human Review → Response) → END

---

## Phase 8 — Future Architecture Stubs

### Task 14 — Future Service Interfaces `[x]`

- `WorkflowSimulator` interface (frontend + backend) — stub only
- `WorkflowEvaluator` interface — stub only
- `LangGraphExporter` interface — stub only
- Add JSDoc/docstring explaining each interface's future responsibility

---

## Phase 9 — Testing

### Task 15 — Backend Tests `[x]`

Pytest coverage for:
- Valid workflow passes validation
- Invalid workflow returns errors
- Missing START / END detection
- Duplicate node ID detection
- Invalid node type rejection
- Invalid edge references
- JSON round-trip serialization
- Missing required config detection

### Task 16 — Frontend Tests `[x]`

Vitest / React Testing Library coverage for:
- Canvas renders without crash
- Node added to canvas
- Node selected → properties panel shows correct fields
- Node config editable
- Nodes can be connected
- Workflow export produces valid JSON

---

## Phase 10 — Workflow Report

### Task 18 — Export Report `[x]`

Generate a human-readable report of the current workflow.

**Export formats (user selects at export time):**
- **Image only** — PNG/SVG snapshot of the canvas (node layout, edges, colors)
- **Image + JSON** — canvas image bundled with the raw `workflow.json`

**Future report enhancements (not in MVP1):**
- **Node & edge notes** — each node and each edge gets an optional `notes` field in the domain model; notes surface in the report as annotations
- **Report with notes** — third export option; renders the image alongside a structured table of node names, types, config, and notes; edges listed with condition and notes
- **PDF export** — wrap image + notes table into a single PDF

**Implementation notes:**
- Canvas snapshot: use `html-to-image` or React Flow's built-in `getViewport` + canvas draw
- Report modal: let user pick format before downloading
- `notes` field addition is a non-breaking model change (optional string, defaults to `""`)
- Properties panel should expose a "Notes" textarea for each node/edge once the field is added

---

## Phase 11 — Workflow History (Undo / Redo)

### Task 19 — In-Memory Undo/Redo `[x]`

Let users step backward and forward through workflow changes.

**Why it's low-effort here:** the domain model is already immutable — every `onWorkflowChange` produces a new `Workflow` object. An undo stack is just an array of past snapshots + a cursor index, all managed in `App.tsx`.

**Scope for MVP1:**
- In-memory only (lost on page refresh — acceptable for now)
- Keyboard shortcuts: `Ctrl+Z` undo, `Ctrl+Shift+Z` / `Ctrl+Y` redo
- Toolbar undo/redo buttons (disabled when at stack boundaries)
- Stack capped at ~50 entries to bound memory use
- Any `onWorkflowChange` call pushes to the stack and truncates the redo branch

**Out of scope (future):**
- **Persistent history** — save stack to localStorage or backend so it survives a page refresh; adds serialization complexity and storage strategy decisions, better suited to MVP2
- **Named snapshots / branching history** — "save checkpoint" with a label; foundation for a visual timeline feature

**Implementation sketch:**
```
useWorkflowHistory(initial: Workflow) → { workflow, canUndo, canRedo, push, undo, redo }
```
A single custom hook in `hooks/useWorkflowHistory.ts` replaces the plain `useState` for workflow in `App.tsx`; everything else stays the same.

---

## Phase 12 — Documentation

### Task 20 — README `[x]`

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

---

# MVP2 — Workflow Simulator

Full spec: `docs/AiFlow - MVP2.md`

---

## Phase 13 — Backend Simulator

### Task 21 — Simulation Engine `[ ]`

- Pydantic models: `NodeExecution`, `ExecutionTrace`, `SimulationSettings`, `SimulateRequest`
- `simulator.py`: topological sort + handler dispatch + trace builder
- `node_handlers.py`: mock handler per NodeType (START, END, LLM, TOOL, API, DATABASE, RAG, CONDITION, HITL, TRANSFORM)
- `POST /api/workflows/simulate` endpoint
- Extension point stubbed for future real-LLM calls
- pytest: valid trace, minimal START→END, LLM mock shape, CONDITION expression, cycle detection, disconnected node

### Task 22 — HITL Simulation `[ ]`

- Auto-approve mode: returns `{ approved: true, reviewer: "auto" }` immediately
- Pause mode: returns `status: paused` with paused node ID; frontend resumes via `POST /api/workflows/simulate/resume`
- pytest: auto-approve produces unbroken trace; pause returns paused status

---

## Phase 14 — Frontend Simulator UI

### Task 23 — SimulateModal `[ ]`

- Settings form: HITL mode, CONDITION mode, display mode, animation delay slider (LLM locked to mock)
- Input textarea for sample workflow input JSON (client-side validated)
- Submit → calls API → passes trace to App
- Loading state during call

### Task 24 — TracePanel `[ ]`

- List of execution steps: node name, type icon, status badge, duration
- Click step → expand to show input/output JSON
- "Clear trace" button
- "Next Step" button for manual step-through mode

### Task 25 — Canvas Node Highlighting `[ ]`

- `WorkflowNodeComponent` accepts optional `executionStatus` prop
- CSS status rings: pending (dim) / running (pulse blue) / success (green) / error (red) / waiting (yellow)
- Animated mode: App drives `currentStep` index with setTimeout chain
- Instant mode: all statuses set at once on trace load

### Task 26 — Toolbar + App Wiring `[ ]`

- "Simulate" button in toolbar (between Validate and JSON)
- `showSimulateModal` + `simulationTrace` state in App
- Animated playback logic in App
- Clear trace on New / Open / Load Example

---

## Phase 15 — Simulation Evaluation

### Task 30 — Simulation Evaluator Backend `[ ]`

After a simulation run completes, optionally call an LLM to evaluate the execution trace and return a structured report.

**Why it belongs in MVP2:** The trace produced by the mock simulation is real structured data (node types, inputs, outputs, statuses). An LLM can meaningfully assess workflow design quality from it even though individual handlers were mocked. This is the first real LLM call inside simulation.

**SimulationEvaluation model:**
```
score: int          # 1–10 overall quality rating
summary: str        # 2–3 sentence overall assessment
strengths: [str]    # what the workflow does well
issues: [str]       # detected problems (missing error handling, bottlenecks, etc.)
recommendations: [str]  # concrete suggestions for improvement
```

**Settings extension:**
- `evaluate: bool = False` added to `SimulationSettings`
- `evaluation: SimulationEvaluation | None` added to `SimulateWorkflowResponse`

**Evaluator service (`backend/app/services/evaluator.py`):**
- `mock_evaluate(workflow, trace) -> SimulationEvaluation` — deterministic canned result; used when `llm_mode=mock`
- `llm_evaluate(workflow, trace, provider) -> SimulationEvaluation` — builds a structured prompt from the workflow + trace, calls `LLMProvider` in JSON mode, parses result
- Route handler: if `settings.evaluate` is True, call evaluator after trace is complete; skip if trace status is `error` or `paused`

**Prompt design for LLM path:**
- System: "You are a workflow quality evaluator. Respond only with valid JSON."
- User: workflow name, description, node list, full execution trace (each step: node name, type, status, output summary)
- Schema: `SimulationEvaluation` fields

**pytest coverage:**
- Mock evaluator returns correct model shape
- LLM evaluator builds prompt and calls provider (mock provider)
- `evaluate=True` → response includes evaluation
- `evaluate=False` → response evaluation is null
- Paused/errored trace skips evaluation

### Task 31 — Evaluation UI `[ ]`

- "Evaluate results" toggle in SimulateModal (default off)
- `EvaluationPanel` component: score badge (colour-coded: ≥7 green, 4–6 amber, ≤3 red), summary paragraph, collapsible strengths / issues / recommendations lists
- Panel shown below TracePanel when `trace.evaluation` is present
- Loading state: spinner replaces evaluation panel while waiting
- Empty state: "Enable evaluation in simulation settings to get LLM feedback."

---

## Phase 16 — Simulation Testing

### Task 27 — Simulation Unit Tests `[ ]`

Vitest coverage:
- `SimulateModal` renders with correct default settings
- Submitting valid input calls API
- `TracePanel` renders steps list and expand/collapse
- Node status badges render correct CSS classes
- Manual step-through "Next Step" advances cursor

### Task 28 — Simulation E2E Tests `[ ]`

Playwright coverage:
- Click Simulate → modal opens
- Submit → trace panel appears with steps
- Animated mode: nodes highlight sequentially
- Instant mode: all nodes show success immediately
- HITL auto-approve: no pause

---

## Phase 16 — Documentation Update

### Task 29 — README Update `[ ]`

- Add Simulator section to README
- Document simulation settings and mock handler behavior
- Note future real-LLM path

---

## Phase 17 — Example Library

**Goal:** replace the single customer-support example with a categorised library of workflows users can load and immediately simulate, covering a range of industries and complexity levels.

### Task 32 — Categorised Example Workflows `[ ]`

Create workflow JSON files in `examples/` organised by industry and complexity. Each example must be simulation-ready (valid START/END, sensible node connections).

**Easy (2–5 nodes, linear flow)**
- `examples/easy/email-auto-reply.json` — LLM drafts an email reply from a support ticket
- `examples/easy/sentiment-classifier.json` — LLM classifies sentiment, routes to positive/negative END
- `examples/easy/data-enrichment.json` — API lookup → TRANSFORM → END

**Medium (6–10 nodes, branching + HITL)**
- `examples/medium/customer-support.json` — move existing example here; add HITL review before resolution
- `examples/medium/content-moderation.json` — RAG policy lookup → LLM judge → CONDITION (safe/flag) → HITL if flagged → END
- `examples/medium/invoice-processing.json` — API extract → TRANSFORM → CONDITION (needs approval?) → HITL → DATABASE write → END
- `examples/medium/hr-onboarding.json` — multiple API calls, HITL manager sign-off, DATABASE record

**Complex (11+ nodes, multi-branch, loops implied via separate paths, evaluation-worthy)**
- `examples/complex/ai-research-agent.json` — RAG retrieval → LLM chain → TOOL (web search) → LLM synthesise → CONDITION (enough info?) → HITL → report END
- `examples/complex/supply-chain-monitor.json` — DATABASE poll → multiple CONDITIONs → TOOL (alert) → LLM recommendation → HITL → DATABASE update
- `examples/complex/multi-agent-customer-journey.json` — intake LLM → CONDITION (tier) → three parallel paths (basic/premium/enterprise) each with HITL and RAG, merging at a final TRANSFORM → END

### Task 33 — Example Picker UI `[ ]`

Replace the single "Example" toolbar button with a modal that shows examples grouped by category and difficulty.

- `ExamplePickerModal` component
- Group by industry label and difficulty badge (Easy / Medium / Complex)
- Each card shows: name, description, node count, key node types used
- On select: load the workflow (same as current handleLoadExample)
- Filter/search by name or industry
- Toolbar button opens picker instead of loading directly

---

---

# MVP2.5 — Private Public Deployment

Full spec: `docs/AiFlow - MVP2.5.md`

---

## Auth & Onboarding Polish

### Task 34 — Supabase Email Templates `[-]`

Skipped for MVP2.5 — Supabase requires custom SMTP to be configured before email templates can be edited. Templates are ready and saved at `docs/email-templates.md`. Apply when custom SMTP is set up (see Future Enhancements below).

---

### Task 35 — Supabase Auth Rate Limits `[ ]`

Tighten Supabase's built-in rate limits for auth endpoints. Login and forgot-password bypass the FastAPI backend entirely (direct Supabase JS client calls), so slowapi does not protect them — Supabase's own limits are the only server-side enforcement.

**Where to update:** Supabase Dashboard → Project → Authentication → Rate Limits

**Recommended settings:**

| Endpoint | Default | Recommended |
|---|---|---|
| Sign-in attempts | high | 10 / hour per IP |
| Password reset emails | high | 3 / hour per IP |
| OTP / magic link emails | high | 5 / hour per IP |
| Signups | high | 5 / hour per IP |

**Why:** Without tightening these, an attacker can hammer the login endpoint or flood a target's inbox with reset emails. The Supabase defaults are intentionally permissive; tightening is a one-click dashboard change per limit.

**Note:** These are Supabase-side controls only — no code changes required.


---

## Future Enhancements — Polish & Operations

### Custom SMTP + Branded Email Templates

Supabase requires custom SMTP before email templates can be customised. Once set up:

- Configure SMTP in Supabase Dashboard → Project Settings → Auth → SMTP Settings
- Apply the 5 branded templates saved in `docs/email-templates.md` (reset password, magic link, confirm signup, change email, invite user)

---

## Future Enhancements — Cloud & Multi-user

Not scoped for any current MVP. Would transform AiFlow from a local-first tool into a proper SaaS platform.

### Cloud Workflow Storage

- User accounts: email/password + OAuth (Google / GitHub)
- Server-side workflow persistence (PostgreSQL or equivalent)
- Replace "Save → download JSON / Open → upload JSON" with auto-save to user account
- Workflows accessible from any browser or device
- The existing localStorage layer (added pre-MVP3) becomes a write-through cache that syncs to the server when online

### Workflow Versioning

- Named snapshots ("v2 — added RAG node")
- Diff view between versions: added/removed nodes and edges highlighted on canvas
- Restore to any previous version
- Fork a workflow to experiment without modifying the original

### Collaboration

- Share a workflow by link (view-only or editable)
- Multi-user real-time editing (operational transforms or CRDTs)
- Comments on nodes and edges
- Team workspaces with role-based access (owner / editor / viewer)

### Architecture notes

When this is tackled the backend will need:
- Auth middleware (JWT or session-based)
- New models: `User`, `WorkflowRecord`, `WorkflowVersion`
- A repository layer replacing the current JSON-file storage
- Frontend auth context, protected routes, and a sync service that merges local and remote state
