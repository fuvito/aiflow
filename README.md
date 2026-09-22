# AiFlow — AI Workflow Designer

**GitHub:** https://github.com/fuvito/aiflow

A developer tool for visually designing, generating, and exporting AI/agentic workflows.

Describe a workflow in natural language → an LLM generates the structured graph → you edit, validate, simulate, and export it as JSON.

---

## What Is This?

AiFlow is a visual node-based editor for designing AI agent workflows. Developers can:

- **Describe** a workflow in plain English and generate it instantly with an LLM
- **Design** workflows visually — drag nodes onto a canvas and connect them
- **Configure** each node (LLM prompts, API endpoints, RAG settings, conditions, etc.)
- **Validate** the workflow for structural correctness
- **Simulate** — run a mock execution and inspect each step's input/output in a trace panel
- **Save/Export** as clean, versioned JSON — or **Import** previously saved workflows
- **Browse examples** — 10 categorised workflows across Easy / Medium / Complex difficulties

### Node Types

| Type | Purpose |
|------|---------|
| `START` | Entry point |
| `END` | Exit point |
| `LLM` | Language model call |
| `TOOL` | Tool / function call |
| `API` | External HTTP API |
| `DATABASE` | Database query |
| `RAG` | Retrieval-augmented generation |
| `CONDITION` | Conditional branching |
| `HITL` | Human-in-the-loop review |
| `TRANSFORM` | Data transformation |

---

## Architecture

The internal **Workflow Model** is the source of truth. React Flow is a rendering layer only.

```
Workflow Model (TypeScript + Pydantic)
      │
      ├── React Flow Adapter  →  Visual Canvas
      ├── JSON serializer     →  workflow.json
      ├── Simulator           →  BFS mock execution, HITL pause/resume, evaluation
      └── Future: LangGraph Adapter
```

```
frontend/     React + TypeScript + Vite + React Flow
backend/      Python + FastAPI + Pydantic + OpenAI SDK
examples/     Example workflow JSON files
docs/         Product spec
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| Python | 3.11+ |
| npm | 9+ |
| OpenAI API key | Required for Generate feature |

---

## Quick Start

### 1. Clone

```bash
git clone <repo-url>
cd aiflow
```

### 2. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` and set your API key:

```
LLM_API_KEY=sk-...
```

Start the backend:

```bash
# Windows — double-click run.bat, or:
.venv\Scripts\uvicorn app.main:app --reload

# macOS / Linux
uvicorn app.main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

---

## Running Tests

```bash
# Backend (76 tests)
cd backend
.venv/Scripts/pytest -v       # Windows
pytest -v                     # macOS / Linux

# Frontend unit tests (98 tests)
cd frontend
npm test

# Frontend E2E tests (34 tests — requires dev server)
cd frontend
npx playwright test
```

---

## Using the App

### New Workflow
Click **New** → canvas resets to `START → END`.

### Browse Examples
Click **Examples** → an example picker opens with 10 pre-built, simulation-ready workflows:

| Difficulty | Nodes | Workflows |
|------------|-------|-----------|
| Easy | 2–5 | Email auto-reply, Sentiment classifier, Data enrichment |
| Medium | 6–10 | Customer support, Content moderation, Invoice processing, HR onboarding |
| Complex | 11+ | AI research agent, Supply chain monitor, Multi-tier customer journey |

Search by name, industry, or tag. Click any card to load the workflow onto the canvas. Every example ships with a pre-populated **sample input**, so you can click **Simulate → Run Simulation** immediately without typing anything.

### Add Nodes
Drag a node type from the left panel onto the canvas.

### Connect Nodes
Drag from the bottom handle of one node to the top handle of another.

### Configure Nodes
Click a node → edit its name and config in the right panel. Press **Delete** to remove a selected node.

### Validate
Click **Validate** → errors and warnings appear in a panel below the canvas. The button badge shows the count.

### Simulate

Click **Simulate** → configure settings → click **Run Simulation**. The backend executes a mock BFS traversal of your workflow graph from `START` to `END`. Results appear in the right sidebar panel (which replaces the Properties panel for the duration of the simulation), keeping the canvas fully visible.

#### Sample Input

The **Sample input** field accepts a JSON object that is passed to the `START` node as the initial data. It flows through the workflow and is transformed by each node.

- **Persists automatically** — the last-used input is saved as part of the workflow and restored every time you open the modal (survives page refresh via localStorage).
- **Suggest fields ✦** button — scans all node configs in the workflow (LLM prompt templates, condition expressions, API URL parameters, input schemas) and generates a JSON object with realistic placeholder values. Use this as a starting point rather than typing from scratch.

#### Simulation Settings

| Setting | Options | Default | Notes |
|---------|---------|---------|-------|
| HITL nodes | Auto-approve / Pause and wait | Auto-approve | Pause suspends execution; Approve or Reject to resume |
| CONDITION branching | Expression eval / Random / User picks | Expression eval | Expression tries to evaluate the node's expression string |
| Execution display | Animated / Instant / Manual | Animated | Manual adds a **Next Step** button to step through one node at a time |
| Step delay | 200–2000 ms | 600 ms | Visible in Animated mode only |
| Evaluate results | On / Off | Off | Calls LLM after a complete run to generate a quality report |

#### Mock Handlers

Every node type returns a deterministic mock output so you can explore workflows without real API keys:

| Node | Mock output |
|------|-------------|
| `START` | Passes input data through unchanged |
| `END` | Wraps preceding output as `{ result: ... }` |
| `LLM` | `{ response: "Mock LLM response for <node>", tokens_used: 42 }` |
| `TOOL` | `{ output: "Mock tool result for <node>", success: true }` |
| `API` | `{ status: 200, data: { message: "Mock API response" } }` |
| `DATABASE` | `{ rows: [{ id: 1, data: "Mock row" }], count: 1 }` |
| `RAG` | `{ documents: [{ content: "Mock document", score: 0.95 }] }` |
| `CONDITION` | Evaluates the node's `expression` field; falls back to passing all edges |
| `HITL` | `{ approved: true, reviewer: "auto" }` (auto-approve) or suspends (pause mode) |
| `TRANSFORM` | Returns input data unchanged |

#### Simulation Sidebar

The sidebar has two tabs:

- **Trace** — each execution step with status (●success / ●error / ●waiting), node type, name, and duration. Click any row to expand it and see the exact input and output JSON. In Manual mode a **Next Step** button advances the trace one node at a time.
- **Evaluation** — appears when **Evaluate results** is enabled (see below). Shows a quality score and report once the run completes. The sidebar switches to this tab automatically.

#### HITL Pause / Resume

When **HITL mode → Pause and wait** is selected, execution halts at the first HITL node. An amber banner appears at the top of the sidebar showing the node name and **Approve** / **Reject** buttons. Clicking either resumes the BFS from that point with the decision recorded in the node's output. If evaluation was requested, the Evaluation tab populates once the resumed trace completes.

#### LLM Evaluation

Enable **Evaluate results** before running. After simulation completes the **Evaluation** tab shows a quality score (1–10), a 2–3 sentence summary, and collapsible **Strengths / Issues / Recommendations** sections. The sidebar switches to this tab automatically.

In mock mode (the default) the evaluation is generated deterministically from the workflow's structure — no API key needed. In real mode it calls your configured LLM provider.

#### Future: Real LLM Execution

The simulation engine supports a `llm_mode: real` path (not yet exposed in the UI). Setting this will route LLM, API, RAG, and TOOL nodes through actual providers instead of mock handlers. Requires valid credentials in `backend/.env`.

### Generate with AI
Click **Generate** → a chat panel opens. Describe your workflow in plain English and send the message. The AI responds in one of two ways:

- **If the description is detailed enough**, it generates the workflow immediately and shows a **Load to Canvas** card.
- **If it needs clarification**, it asks one focused question. Answer it and the workflow is generated on the next turn (maximum 2 questions before it makes reasonable assumptions and generates anyway).

Once a **Load to Canvas** card appears, click it to load the result. You can keep chatting to regenerate with adjustments — each reply that produces a workflow replaces the previous card.

Requires `LLM_API_KEY` in `backend/.env`.

**Example opening message:**
> Create a customer support agent that classifies requests, searches the knowledge base, retrieves customer info, and routes complex cases to a human reviewer.

### Refine with AI
Click **Refine** (enabled once your canvas has more than two nodes) → the same chat panel opens, but with the current workflow already loaded as context. Describe the change you want:

> Add error handling — if the API call fails, route to a fallback LLM node that generates a response from cached data.

> Replace the single CONDITION node with two separate routing steps — first by tier, then by issue type.

The AI returns a complete updated workflow preserving all unchanged node IDs and positions. Click **Load to Canvas** to apply it. The previous state is on the undo stack (`Ctrl+Z`) if you want to revert.

### Save / Open
- **Save** downloads `<workflow-name>.json`
- **Open** loads a previously saved `.json` file

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_PROVIDER` | Provider (`openai`) | `openai` |
| `LLM_API_KEY` | API key — never commit | _(required for Generate)_ |
| `LLM_MODEL` | Model ID | `gpt-4o-mini` |
| `CORS_ORIGINS` | Frontend origin | `http://localhost:5173` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend URL | `http://localhost:8000` |

> **Deploying beyond localhost?** The backend's CORS config uses `allow_credentials=True` with
> wildcard methods and headers. This is fine for local development but should be tightened before
> exposing the backend on a public URL: set `CORS_ORIGINS` to your exact frontend origin and
> restrict `allow_methods` / `allow_headers` to only what the frontend actually sends.

---

## Workflow JSON Format

```json
{
  "version": "1.0",
  "id": "uuid",
  "name": "Customer Support Agent",
  "description": "Handles support requests",
  "nodes": [
    {
      "id": "classify-request",
      "type": "LLM",
      "name": "Classify Request",
      "position": { "x": 350, "y": 240 },
      "config": {
        "model": "gpt-4o-mini",
        "prompt": "Classify the request...",
        "temperature": 0
      }
    }
  ],
  "edges": [
    { "source": "start", "target": "classify-request" },
    { "source": "decision", "target": "human-review", "condition": "complex" }
  ],
  "metadata": {}
}
```

---

## Troubleshooting

**Backend won't start — `ModuleNotFoundError: No module named 'pydantic_settings'`**
→ You're running the system Python's uvicorn instead of the venv's. Use `run.bat` (Windows) or activate the venv first.

**Port 8000 already in use**
→ `run.bat` automatically frees port 8000 before starting. Or kill manually:
```powershell
# Windows PowerShell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess -Force
```

**Generate returns 503**
→ `LLM_API_KEY` is missing or empty in `backend/.env`.

**Workflow loads but nodes aren't visible**
→ Click **Validate** or zoom out — nodes may be off-screen. The canvas auto-fits when a workflow is opened.

**`LF will be replaced by CRLF` git warnings**
→ Cosmetic git line-ending warning on Windows — safe to ignore.

---

## Current Limitations

- **Simulator uses mock handlers only** — no real LLM, API, DB, or RAG calls during simulation
- **HITL resume is in-memory** — a server restart clears any paused simulations
- **Workflow persists in this browser only** — localStorage keeps your work across refreshes, but it is tied to the current browser/device; multi-device or team access requires the cloud features listed in the roadmap
- Single LLM provider (OpenAI / LangChain wrapper)
- No authentication or multi-user support

---

## Roadmap

| Milestone | Focus | Status |
|-----------|-------|--------|
| **MVP1** | Visual designer + AI generation | ✓ Done |
| **MVP2** | Workflow simulator — mock BFS, HITL pause/resume, LLM evaluation | ✓ Done |
| **MVP3** | Real execution — live LLM, API, RAG, and HITL calls | Planned |
| **MVP4** | Optimizer — cost, latency, token analysis | Planned |
| **Future** | LangGraph export, team collaboration, cloud deployment, versioning | Backlog |
