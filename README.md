# AiFlow — AI Workflow Designer

A developer tool for visually designing, generating, and exporting AI/agentic workflows.

Describe a workflow in natural language → an LLM generates the structured graph → you edit, validate, and export it as JSON.

---

## What Is This?

AiFlow is a visual node-based editor for designing AI agent workflows. It lets developers:

- **Describe** a workflow in plain English and generate it with an LLM
- **Design** workflows visually by dragging nodes onto a canvas and connecting them
- **Configure** each node (LLM prompts, API endpoints, database queries, conditions, etc.)
- **Validate** the workflow for structural correctness
- **Export** the workflow as a clean, versioned JSON file
- **Import** previously saved workflows

### Supported Node Types

| Type | Purpose |
|------|---------|
| `START` | Entry point |
| `END` | Exit point |
| `LLM` | Language model call |
| `TOOL` | Tool/function call |
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
Workflow Model (TypeScript types / Pydantic schemas)
      │
      ├── React Flow Adapter → Visual Canvas
      ├── JSON serializer    → workflow.json
      └── Future: LangGraph Adapter, Simulator, Evaluator
```

```
frontend/          React + TypeScript + Vite + React Flow
backend/           Python + FastAPI + Pydantic
examples/          Example workflow JSON files
docs/              Product spec (AiFlow - MVP1.md)
```

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 18+ |
| Python | 3.11+ |
| npm | 9+ |
| An LLM API key | OpenAI / Gemini |

---

## Installation

### 1. Clone

```bash
git clone <repo-url>
cd aiflow
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

### 3. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env — set LLM_API_KEY
```

---

## Running Locally

Start **both** servers; the frontend calls the backend.

```bash
# Terminal 1 — backend (port 8000)
cd backend
.venv/Scripts/uvicorn app.main:app --reload   # Windows
# source .venv/bin/activate && uvicorn app.main:app --reload  # macOS/Linux

# Terminal 2 — frontend (port 5173)
cd frontend
npm run dev
```

Open `http://localhost:5173`.

---

## Running Tests

```bash
# Backend
cd backend
.venv/Scripts/pytest -v

# Frontend
cd frontend
npm test
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_PROVIDER` | Provider name (`openai`, `gemini`) | `openai` |
| `LLM_API_KEY` | API key — never commit this | _(required)_ |
| `LLM_MODEL` | Model identifier | `gpt-4o-mini` |
| `CORS_ORIGINS` | Allowed frontend origin | `http://localhost:5173` |

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
      "id": "start",
      "type": "START",
      "name": "Start",
      "position": { "x": 250, "y": 100 },
      "config": {}
    },
    {
      "id": "classifier",
      "type": "LLM",
      "name": "Classify Request",
      "position": { "x": 250, "y": 250 },
      "config": {
        "model": "gpt-4o-mini",
        "prompt": "Classify the customer request as simple or complex.",
        "temperature": 0
      }
    }
  ],
  "edges": [
    { "source": "start", "target": "classifier" }
  ],
  "metadata": {}
}
```

---

## MVP1 Limitations

- No real workflow execution (nodes are visual only)
- No real API/DB/RAG/HITL execution
- No authentication or multi-user support
- Single LLM provider (OpenAI initially)
- File-based persistence only (no database)

---

## Roadmap

| Milestone | Focus |
|-----------|-------|
| **MVP1** | Visual designer + AI generation _(current)_ |
| **MVP2** | Workflow simulator with mock execution |
| **MVP3** | Evaluator — test cases, LLM-as-judge, scoring |
| **MVP4** | Optimizer — cost, latency, token analysis |
| **Future** | LangGraph export, team collaboration, deployment |
