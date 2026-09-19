# AiFlow — Claude Code Guide

## Project Overview

**AiFlow** is a developer tool for visually designing AI/agentic workflows. Users describe a workflow in natural language, the AI generates it, and they can edit, validate, and export it as JSON.

MVP1 scope: **Describe → Generate → Design** (no execution, no simulation).

Full spec: `docs/AiFlow - MVP1.md`

---

## Architecture Principles

### Source of Truth

The application's **internal Workflow Model is the source of truth** — not React Flow state, not LangGraph objects.

```
Workflow Model
      │
      ├── React Flow Adapter → React Flow → UI
      ├── JSON (save/load)
      └── Future: LangGraph Adapter
```

Always map TO React Flow for display. Always map FROM React Flow back to the Workflow Model before saving or validating.

### Key Separations

- Business logic lives in `services/`, not inside React components.
- LLM provider code is isolated in `backend/app/providers/`.
- Node type definitions are data-driven — adding a node type should not require touching canvas or properties panel code.

---

## Tech Stack

### Frontend

- React + TypeScript + Vite
- React Flow (canvas)
- No UI component library chosen yet — keep it lean

### Backend

- Python / FastAPI / Pydantic
- Single LLM provider initially (provider-agnostic interface)
- No database — JSON files only

---

## Project Structure

```
aiflow/
├── frontend/
│   └── src/
│       ├── components/        # Shared/generic UI components
│       ├── features/
│       │   └── workflow/      # All workflow-domain UI
│       ├── models/            # TypeScript domain types
│       ├── services/          # API calls, business logic
│       ├── hooks/             # Custom React hooks
│       └── utils/
│
├── backend/
│   └── app/
│       ├── api/               # FastAPI route handlers
│       ├── models/            # Pydantic domain models
│       ├── schemas/           # Request/response schemas
│       ├── services/          # Workflow generation, validation logic
│       ├── providers/         # LLM provider implementations
│       └── core/              # Config, settings, logging
│
├── examples/                  # Example workflow JSON files
├── docs/                      # Product docs / specs
├── CLAUDE.md                  # This file
├── BACKLOG.md                 # Full task backlog
└── TASKS.md                   # Current iteration tasks
```

---

## Workflow Data Model

```json
{
  "version": "1.0",
  "id": "uuid",
  "name": "Workflow Name",
  "description": "...",
  "nodes": [
    {
      "id": "node-id",
      "type": "LLM",
      "name": "Display Name",
      "position": { "x": 0, "y": 0 },
      "config": {}
    }
  ],
  "edges": [
    {
      "source": "node-id",
      "target": "other-node-id",
      "condition": null,
      "metadata": {}
    }
  ],
  "metadata": {}
}
```

### Node Types

`START`, `END`, `LLM`, `TOOL`, `API`, `DATABASE`, `RAG`, `CONDITION`, `HITL`, `TRANSFORM`

---

## Backend API

```
GET  /api/health
POST /api/workflows/generate   { description: string }
POST /api/workflows/validate   { workflow: Workflow }
```

LLM credentials come from environment variables only. Never expose them to the frontend.

---

## Development Rules

- **Never** put API keys in frontend code.
- **Never** store credentials in workflow JSON.
- Use `NodeType` enum everywhere — no raw strings for node types.
- React Flow is a rendering detail — map from domain model to React Flow, not the reverse.
- No premature implementation of MVP2+ features (simulator, evaluator, LangGraph export).
- Stub-out future service interfaces (WorkflowSimulator, LangGraphExporter) as empty interfaces only.

---

## Environment Variables

```bash
# backend/.env
LLM_PROVIDER=openai        # or gemini, etc.
LLM_API_KEY=...
LLM_MODEL=...
CORS_ORIGINS=http://localhost:5173
```

---

## Running the App (once set up)

```bash
# Frontend
cd frontend && npm run dev

# Backend
cd backend && uvicorn app.main:app --reload

# Tests
cd frontend && npm test
cd backend && pytest
```

---

## Iteration Approach

Development proceeds in iterations tracked in `TASKS.md`. Complete each task fully (including tests) before starting the next. The backlog is in `BACKLOG.md`.
