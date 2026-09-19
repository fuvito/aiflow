# AiFlow — AI Workflow Designer

A developer tool for visually designing, generating, and exporting AI/agentic workflows.

Describe a workflow in natural language → an LLM generates the structured graph → you edit, validate, and export it as JSON.

---

## What Is This?

AiFlow is a visual node-based editor for designing AI agent workflows. Developers can:

- **Describe** a workflow in plain English and generate it instantly with an LLM
- **Design** workflows visually — drag nodes onto a canvas and connect them
- **Configure** each node (LLM prompts, API endpoints, RAG settings, conditions, etc.)
- **Validate** the workflow for structural correctness
- **Save/Export** as clean, versioned JSON — or **Import** previously saved workflows
- **Load the example** customer support agent to explore a complete real-world workflow

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
      └── Future: LangGraph Adapter, Simulator, Evaluator
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
# Backend (27 tests)
cd backend
.venv/Scripts/pytest -v       # Windows
pytest -v                     # macOS / Linux

# Frontend (40 tests)
cd frontend
npm test
```

---

## Using the App

### New Workflow
Click **New** → canvas resets to `START → END`.

### Load Example
Click **Example** to load a fully configured customer support agent workflow — a great starting point.

### Add Nodes
Drag a node type from the left panel onto the canvas.

### Connect Nodes
Drag from the bottom handle of one node to the top handle of another.

### Configure Nodes
Click a node → edit its name and config in the right panel. Press **Delete** to remove a selected node.

### Validate
Click **Validate** → errors and warnings appear in a panel below the canvas. The button badge shows the count.

### Generate with AI
Click **Generate** → describe your workflow in natural language → click Generate (or Ctrl+Enter).

Requires `LLM_API_KEY` in `backend/.env`.

**Example prompt:**
> Create a customer support agent that classifies requests, searches the knowledge base, retrieves customer info, and routes complex cases to a human reviewer.

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

## MVP1 Limitations

- No real workflow execution (visual design only)
- No real API / DB / RAG / HITL calls
- File-based persistence only (no database)
- Single LLM provider (OpenAI)
- No authentication or multi-user support

---

## Roadmap

| Milestone | Focus |
|-----------|-------|
| **MVP1** | Visual designer + AI generation _(current)_ |
| **MVP2** | Workflow simulator with mock execution |
| **MVP3** | Evaluator — test cases, LLM-as-judge, scoring |
| **MVP4** | Optimizer — cost, latency, token analysis |
| **Future** | LangGraph export, team collaboration, cloud deployment |
