# MVP2 — Workflow Simulator

## 1. Product Overview

### Goal

MVP2 adds **simulation** to the existing workflow designer. Users can run a workflow against sample input and step through each node's execution, watching the data flow across the canvas in real time.

MVP1 scope: **Describe → Generate → Design**
MVP2 scope: **Describe → Generate → Design → Simulate → Evaluate**

Node handlers use mock implementations during simulation; execution stays deterministic. One real LLM call is made when evaluation is enabled — the LLM reads the completed trace and returns a structured quality report.

---

### MVP2 User Flow

```text
User opens / generates a workflow
           ↓
User clicks "Simulate"
           ↓
Input modal: paste sample input + configure settings
  (toggle: Evaluate results with LLM)
           ↓
Simulation runs (backend graph traversal — all mock)
           ↓
Canvas highlights each node as it executes
           ↓
Trace panel shows inputs/outputs per node
           ↓
[if evaluate=true] LLM evaluates the trace
           ↓
Evaluation panel: score, strengths, issues, recommendations
           ↓
User can inspect, replay, or export trace + evaluation
```

---

## 2. Configurable Simulation Behaviors

All four behavior dimensions are user-configurable in the Simulation Settings panel before each run.

### 2.1 LLM Node Behavior

| Mode | Description |
|------|-------------|
| **Mock (default)** | Returns a canned JSON response based on the node's `prompt` template. The mock echoes back the input with a `_mock: true` flag. |
| **Real LLM** *(future)* | Calls the configured `LLM_API_KEY` / `LLM_MODEL` provider. Not in MVP2 — document the extension point clearly so it can be added without refactoring. |

**Mock response format:**
```json
{
  "result": "Mock LLM output for prompt: <first 80 chars of prompt>",
  "_mock": true,
  "node_id": "<node-id>",
  "node_name": "<node-name>"
}
```

### 2.2 HITL Node Behavior

| Mode | Description |
|------|-------------|
| **Auto-approve** | Simulation immediately continues with `{ approved: true, reviewer: "auto" }`. |
| **Pause and wait** | Simulation pauses, canvas shows HITL node as "waiting", user clicks Approve / Reject in the trace panel to resume. |

### 2.3 CONDITION Node Branching

| Mode | Description |
|------|-------------|
| **User picks** | Simulation pauses at CONDITION node, user selects which outgoing edge to follow. |
| **Expression eval** | Evaluates the edge `condition` string as a simple JS expression against the current data context. Edges with no condition or a truthy result are eligible; first match wins. |
| **Random** | Selects a random outgoing edge (useful for probabilistic exploration). |

### 2.4 Execution Display

| Mode | Description |
|------|-------------|
| **Animated** | Each node highlights sequentially with a 600ms delay between steps. Default. |
| **Instant** | All nodes execute without delay; canvas shows final state when done. |
| **Manual step-through** | Simulation pauses after each node; user presses "Next Step" to advance. |

### 2.5 LLM Evaluation (optional)

| Setting | Description |
|---------|-------------|
| `evaluate: false` (default) | No evaluation — trace only. |
| `evaluate: true` | After simulation completes, the backend calls the LLM with the trace and returns a `SimulationEvaluation`. |

This is the only setting that makes a real LLM call during simulation. The simulation itself stays deterministic (all mock handlers). Evaluation is skipped if the trace is paused or in error state.

**SimulationEvaluation fields:**

| Field | Type | Description |
|-------|------|-------------|
| `score` | `int` 1–10 | Overall workflow quality rating |
| `summary` | `str` | 2–3 sentence overall assessment |
| `strengths` | `list[str]` | What the workflow does well |
| `issues` | `list[str]` | Detected problems (missing error handling, bottlenecks, dead ends, etc.) |
| `recommendations` | `list[str]` | Concrete, actionable improvements |

**When `llm_mode=mock`:** the evaluator returns a canned mock evaluation (same structure, no API call). This keeps the simulation fully offline-capable when no API key is configured.

**LLM prompt design:**
- System: `"You are a workflow quality evaluator. Respond only with valid JSON matching the schema provided."`
- User context: workflow name, description, node list (id, type, name, config summary), full execution trace (each step: name, type, status, output summary)
- Schema injected into prompt as JSON Schema so the model knows the exact output shape

---

## 3. Domain Model Extensions

### 3.1 ExecutionTrace (new)

```typescript
interface NodeExecution {
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;
  status: 'pending' | 'running' | 'success' | 'error' | 'waiting';
  startedAt: string;     // ISO timestamp
  completedAt?: string;
  input: unknown;
  output?: unknown;
  error?: string;
}

interface ExecutionTrace {
  traceId: string;
  workflowId: string;
  workflowName: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'paused' | 'complete' | 'error';
  steps: NodeExecution[];
}
```

### 3.2 SimulationEvaluation (new)

```typescript
interface SimulationEvaluation {
  score: number;              // 1–10
  summary: string;
  strengths: string[];
  issues: string[];
  recommendations: string[];
}
```

### 3.3 SimulationSettings (new)

```typescript
interface SimulationSettings {
  llmMode: 'mock';                            // 'real' reserved for future
  hitlMode: 'auto-approve' | 'pause';
  conditionMode: 'user-pick' | 'expression' | 'random';
  displayMode: 'animated' | 'instant' | 'manual';
  animationDelayMs: number;                   // default 600
  evaluate: boolean;                          // default false
}
```

### 3.3 WorkflowNode — no changes required

The existing `config` fields per node type supply all needed metadata to the simulator.

---

## 4. Backend API

### 4.1 New Endpoint

```
POST /api/workflows/simulate
```

**Request:**
```json
{
  "workflow": { ... },
  "input": { "text": "...", "...": "..." },
  "settings": {
    "llm_mode": "mock",
    "hitl_mode": "auto-approve",
    "condition_mode": "expression",
    "display_mode": "animated",
    "animation_delay_ms": 600
  }
}
```

**Response:**
```json
{
  "trace_id": "uuid",
  "workflow_id": "uuid",
  "workflow_name": "...",
  "started_at": "ISO",
  "completed_at": "ISO",
  "status": "complete",
  "steps": [
    {
      "node_id": "...",
      "node_name": "...",
      "node_type": "START",
      "status": "success",
      "started_at": "ISO",
      "completed_at": "ISO",
      "input": {},
      "output": {}
    }
  ]
}
```

**Error response (invalid workflow, cycle detected, etc.):**
```json
{
  "detail": "Simulation error: <message>"
}
```

### 4.2 Existing Endpoints — unchanged

```
GET  /api/health
POST /api/workflows/generate
POST /api/workflows/validate
```

---

## 5. Backend Architecture

### 5.1 Graph Traversal Engine

`backend/app/services/simulator.py`

- Topological sort of nodes (raise error on cycle)
- Walk sorted order, invoke handler per NodeType
- HITL pause: not needed for `auto-approve`; pause/resume via WebSocket in future (MVP2 uses auto-approve only for the non-interactive path; interactive HITL is a post-MVP2 enhancement — see §8)
- CONDITION branching: evaluate per `conditionMode`
- Build `ExecutionTrace` as traversal proceeds

### 5.2 Mock Node Handlers

`backend/app/services/node_handlers.py`

One handler function per `NodeType`. Each receives `(node: WorkflowNode, input: dict, settings: SimulationSettings) -> dict`.

| NodeType | Mock handler output |
|----------|-------------------|
| `START` | Passes input through unchanged |
| `END` | Wraps input as `{ "result": input }` |
| `LLM` | Returns mock LLM response (§2.1) |
| `TOOL` | Returns `{ "tool": node.name, "result": "mock tool output", "_mock": true }` |
| `API` | Returns `{ "status": 200, "body": { "mock": true }, "_mock": true }` |
| `DATABASE` | Returns `{ "rows": [], "_mock": true }` |
| `RAG` | Returns `{ "documents": [], "answer": "Mock RAG answer", "_mock": true }` |
| `CONDITION` | Returns chosen branch edge ID |
| `HITL` | Returns `{ "approved": true, "reviewer": "auto" }` (auto-approve) |
| `TRANSFORM` | Returns input unchanged with `{ "_transformed": true }` |

### 5.3 Future: Real LLM Extension Point

`node_handlers.py` accepts `settings.llm_mode`. When `llm_mode == 'mock'` the mock handler runs. The `elif llm_mode == 'real':` branch is stubbed with a `NotImplementedError` and a docstring describing how to wire in the existing `LLMProvider`. This makes the real-LLM path a single-file change when the time comes.

```python
async def handle_llm(node: WorkflowNode, input: dict, settings: SimulationSettings) -> dict:
    if settings.llm_mode == "mock":
        return _mock_llm_response(node, input)
    elif settings.llm_mode == "real":
        # Future: call LLMProvider.generate(prompt, structured_output_schema)
        # Provider is already implemented in providers/openai_provider.py
        raise NotImplementedError("Real LLM simulation not yet enabled")
```

---

## 6. Frontend Architecture

### 6.1 New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `SimulateModal` | `features/workflow/SimulateModal.tsx` | Settings + input entry; launches simulation |
| `TracePanel` | `features/workflow/TracePanel.tsx` | Shows live execution steps beside canvas |
| `EvaluationPanel` | `features/workflow/EvaluationPanel.tsx` | Score badge, summary, strengths/issues/recommendations |
| `NodeExecutionBadge` | `features/workflow/nodes/NodeExecutionBadge.tsx` | Status ring overlaid on canvas node |

### 6.2 Toolbar Change

Add "Simulate" button between "Validate" and "JSON".

### 6.3 Canvas Highlighting

`WorkflowCanvas` receives an optional `executionTrace: ExecutionTrace | null` prop. When set, node style is augmented based on `NodeExecution.status`:

| Status | Visual |
|--------|--------|
| `pending` | Dimmed (opacity 0.4) |
| `running` | Pulsing blue ring |
| `success` | Green ring |
| `error` | Red ring |
| `waiting` | Yellow ring (HITL pause) |

Status rings are CSS classes added to the node wrapper — no React Flow internal APIs needed.

### 6.4 Simulation State in App

```typescript
const [simulationTrace, setSimulationTrace] = useState<ExecutionTrace | null>(null);
const [simulationEvaluation, setSimulationEvaluation] = useState<SimulationEvaluation | null>(null);
const [showSimulateModal, setShowSimulateModal] = useState(false);
```

`SimulateModal` calls `POST /api/workflows/simulate`, receives the full trace (and optional evaluation) on completion, and calls `onSimulated(trace, evaluation)`. For the animated display mode, the frontend steps through `trace.steps` with `setTimeout` to drive the visual progression — the backend always returns the full trace synchronously; animation is purely a frontend concern.

### 6.5 EvaluationPanel

Shown below TracePanel when `simulationEvaluation` is non-null.

- **Score badge**: coloured circle (≥7 green, 4–6 amber, ≤3 red) with the numeric score
- **Summary**: plain text paragraph
- **Strengths / Issues / Recommendations**: three collapsible `<details>` sections, each rendered as a bulleted list
- **Empty state** (evaluate=false): subtle message "Enable evaluation in simulation settings to get LLM feedback"

---

## 7. Task Breakdown

### Phase 1 — Backend Simulator

#### Task 21 — Simulation Engine `[ ]`

- Pydantic models: `NodeExecution`, `ExecutionTrace`, `SimulationSettings`, `SimulateRequest`
- `simulator.py`: topological sort, handler dispatch, trace builder
- `node_handlers.py`: mock handler per NodeType
- `POST /api/workflows/simulate` endpoint
- pytest coverage:
  - Valid workflow produces complete trace
  - START → END minimal workflow
  - LLM mock handler returns expected shape
  - CONDITION branching (expression mode)
  - Cycle detection raises error
  - Disconnected node raises error

#### Task 22 — HITL Simulation `[ ]`

- Auto-approve mode: HITL handler immediately returns `approved: true`
- Pause mode: not full WebSocket in MVP2; instead return `status: "paused"` with paused node ID, frontend presents Approve / Reject buttons, frontend calls `POST /api/workflows/simulate/resume` with `{ trace_id, node_id, decision }`
- pytest: auto-approve produces unbroken trace; pause returns paused status

---

### Phase 2 — Frontend Simulator UI

#### Task 23 — SimulateModal `[ ]`

- Settings form: LLM mode (locked to mock), HITL mode, CONDITION mode, display mode, animation delay slider
- Input textarea: raw JSON for workflow input (validated client-side)
- Submit → calls API → passes trace to App
- Loading state during simulation call

#### Task 24 — TracePanel `[ ]`

- Collapsible right-panel section (below PropertiesPanel or full-width bottom)
- List of steps: node name, type icon, status badge, duration
- Click step → expand to show input/output JSON
- "Clear trace" button
- For manual step-through mode: "Next Step" button to advance animation cursor

#### Task 25 — Canvas Node Highlighting `[ ]`

- `WorkflowNodeComponent` accepts optional `executionStatus` prop
- CSS status rings: pending / running / success / error / waiting
- For animated mode: App drives a `currentStep` index with `setInterval`; passes status per node derived from trace up to that index

#### Task 26 — Toolbar + App Wiring `[ ]`

- "Simulate" button in toolbar
- `showSimulateModal` state
- `simulationTrace` state passed to canvas + trace panel
- Animated playback logic in App (setTimeout chain)
- Clear trace on New / Open / Load Example

---

### Phase 2b — Simulation Evaluation

#### Task 30 — Simulation Evaluator Backend `[ ]`

- `SimulationEvaluation` Pydantic model: `score`, `summary`, `strengths`, `issues`, `recommendations`
- `evaluate: bool = False` in `SimulationSettings`
- `evaluation: SimulationEvaluation | None` in `SimulateWorkflowResponse`
- `backend/app/services/evaluator.py`:
  - `mock_evaluate(workflow, trace) -> SimulationEvaluation`
  - `llm_evaluate(workflow, trace, provider) -> SimulationEvaluation` — builds prompt, calls LLM in JSON mode
- Route: call evaluator after complete trace when `settings.evaluate=True`; skip when paused or errored
- pytest: mock shape, LLM path calls provider (mock provider), evaluate=True includes result, evaluate=False null, paused/error skips

#### Task 31 — Evaluation UI `[ ]`

- "Evaluate results" toggle in `SimulateModal` (default off)
- `EvaluationPanel` component: score badge (colour-coded), summary, collapsible strengths/issues/recommendations
- Panel shown below `TracePanel` when `trace.evaluation` is present
- Loading state while evaluating; empty state when disabled

---

### Phase 3 — Testing

#### Task 27 — Simulation Unit Tests `[ ]`

Vitest coverage:
- `SimulateModal` renders with correct default settings
- Submitting valid input calls API
- `TracePanel` renders steps list
- Step expand/collapse shows JSON
- Node status badges render correct CSS classes
- Manual step-through "Next Step" advances cursor

#### Task 28 — Simulation E2E Tests `[ ]`

Playwright coverage:
- Click Simulate → modal opens
- Submit → trace panel appears with steps
- Animated mode: nodes highlight sequentially
- Instant mode: all nodes show success on load
- HITL auto-approve: no pause
- Export trace as JSON

---

### Phase 4 — Documentation Update

#### Task 29 — README Update `[ ]`

- Add Simulator section to README
- Document simulation settings
- Document mock handler behavior
- Note future real-LLM path

---

## 8. Out of Scope (Future)

These are explicitly documented here so they can be planned without re-doing MVP2 architecture:

| Feature | Why deferred |
|---------|-------------|
| **Real LLM calls in simulation** | Requires cost management, rate limiting, and error UX that deserve their own planning cycle. Extension point is stubbed (§5.3). |
| **HITL WebSocket pause** | Real-time bidirectional pause/resume via WebSocket adds infrastructure complexity. MVP2 uses the request/response resume endpoint instead. |
| **Parallel node execution** | Some workflows branch in parallel. MVP2 linearizes — if a CONDITION node has two outgoing edges both followed, they execute sequentially. Real parallelism is MVP3+. |
| **Persistent trace storage** | Traces live in frontend state only (lost on refresh). Saving traces to backend DB is a separate feature. |
| **Trace diff / comparison** | Running two simulations and comparing traces — useful for evaluating prompt changes. Planned for MVP3 (Evaluator phase). |
| **LangGraph export** | Convert simulated trace to a LangGraph runnable. Interface is already stubbed from MVP1 Task 14. |

---

## 9. Non-Goals

- No real execution against live external APIs, databases, or services.
- No authentication or multi-user simulation.
- No streaming (SSE / WebSocket) in the initial release.
- No simulation of workflows with cycles (loops) — raise a clear error.
