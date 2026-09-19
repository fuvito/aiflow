# AiFlow Frontend

React + TypeScript + Vite application — the visual workflow designer UI.

---

## Prerequisites

- Node.js 18+
- npm 9+
- AiFlow backend running on port 8000

---

## Setup

```bash
npm install
cp .env.example .env
```

## Running

```bash
npm run dev
```

Opens at `http://localhost:5173`.

The app calls `http://localhost:8000` for validation and workflow generation. Start the backend first.

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | TypeScript check + production build |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint with oxlint |

---

## Project Structure

```
src/
├── components/
│   └── Toolbar.tsx              # Top toolbar
├── features/
│   └── workflow/
│       ├── WorkflowCanvas.tsx       # React Flow canvas
│       ├── NodePalette.tsx          # Left-panel node palette
│       ├── PropertiesPanel.tsx      # Right-panel config editor
│       ├── WorkflowAdapter.ts       # Domain model ↔ React Flow adapter
│       └── nodes/
│           ├── nodeDefinitions.ts   # Data-driven node type definitions
│           └── WorkflowNodeComponent.tsx
├── models/
│   └── workflow.ts              # TypeScript domain types
├── utils/
│   └── workflowSerializer.ts   # JSON serialize / deserialize / validate
└── test/
    └── setup.ts
```

---

## Key Design Decisions

**Workflow Model is the source of truth.** `App.tsx` holds `workflow: Workflow` as state. `WorkflowAdapter.ts` maps it to React Flow nodes/edges for rendering and back when changes occur.

**Data-driven node types.** Adding a new node type means adding one entry to `nodeDefinitions.ts` — no other files need changing.

---

## Environment Variables

Copy `.env.example` to `.env`:

```
VITE_API_BASE_URL=http://localhost:8000
```
