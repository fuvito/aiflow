# AiFlow Backend

FastAPI + Pydantic backend — workflow validation and AI generation API.

---

## Prerequisites

- Python 3.11+
- An LLM API key (OpenAI by default)

---

## Setup

```bash
# Create virtual environment
python -m venv .venv

# Activate
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set LLM_API_KEY
```

---

## Running

```bash
uvicorn app.main:app --reload
```

API is available at `http://localhost:8000`.

Interactive docs: `http://localhost:8000/docs`

---

## Running Tests

```bash
pytest -v
```

---

## API Endpoints

### `GET /api/health`

Returns `{"status": "ok"}`. Use to confirm the server is running.

---

### `POST /api/workflows/validate`

Validates a workflow for structural correctness.

**Request:**
```json
{
  "workflow": { ... }
}
```

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": ["Node 'llm-1' is missing recommended config field: 'prompt'"]
}
```

**Validation rules:**
- Exactly one `START` node
- At least one `END` node
- All node IDs unique
- All node types valid
- All edge source/target IDs must exist
- Required config fields present (warnings only)
- Disconnected non-terminal nodes (warnings only)

---

### `POST /api/workflows/generate` _(coming in Iteration 5)_

Generates a workflow from a natural-language description.

**Request:**
```json
{
  "description": "Create a customer support workflow that classifies requests..."
}
```

**Response:**
```json
{
  "workflow": { ... }
}
```

---

## Project Structure

```
app/
├── main.py              # FastAPI app, CORS setup
├── api/
│   └── routes.py        # Route handlers
├── models/
│   └── workflow.py      # Pydantic domain models (Workflow, WorkflowNode, etc.)
├── schemas/
│   └── requests.py      # Request/response schemas
├── services/
│   └── validator.py     # Workflow validation logic
├── providers/
│   └── base.py          # LLMProvider abstract interface
└── core/
    └── config.py        # Settings (pydantic-settings, reads .env)

tests/
└── test_workflow_model.py   # Pytest tests
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_PROVIDER` | Provider name (`openai`, `gemini`) | `openai` |
| `LLM_API_KEY` | API key — never commit this | _(required for generation)_ |
| `LLM_MODEL` | Model identifier | `gpt-4o-mini` |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:5173` |

---

## Adding a New Node Type

1. Add the value to `NodeType` enum in `app/models/workflow.py`
2. Add any required config fields to `_REQUIRED_CONFIG` in `app/services/validator.py`
3. Add the matching entry to `NODE_DEFINITIONS` in the frontend's `nodeDefinitions.ts`
