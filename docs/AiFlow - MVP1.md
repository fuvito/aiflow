# MVP1 — AI Workflow Designer

## 1. Product Overview

### Product Purpose

Build a developer tool that allows users to describe an AI/agentic use case in natural language and visually design the corresponding workflow.

The application should help developers:

1. Describe an AI workflow/use case.
2. Generate an initial workflow from the description.
3. Visually add, remove, configure, and connect workflow nodes.
4. Represent LLMs, tools, APIs, databases, RAG, conditions, and Human-in-the-Loop steps.
5. Save and load workflows as JSON files.
6. Provide a clean internal workflow representation that can later be executed, simulated, evaluated, and exported as LangGraph/LangChain code.

### MVP1 User Flow

```text
User describes use case
        ↓
AI generates workflow
        ↓
Visual workflow appears
        ↓
User edits workflow
        ↓
User configures nodes
        ↓
User validates workflow
        ↓
User saves/exports workflow
        ↓
workflow.json
```

Example user request:

> Create a customer support agent that classifies a request, searches the knowledge base, retrieves customer information, and sends complicated cases to a human.

Expected workflow:

```text
START
  ↓
CLASSIFY REQUEST
  ↓
KNOWLEDGE SEARCH
  ↓
CUSTOMER API
  ↓
DECISION
  ├── Simple → RESPONSE
  │
  └── Complex → HUMAN REVIEW
                    ↓
                 RESPONSE
                    ↓
                   END
```

---

# 2. MVP1 Business Requirements

## 2.1 Workflow Designer

The application must provide a visual node-based workflow editor.

Users must be able to:

* Create a workflow.
* Add nodes.
* Move nodes.
* Connect nodes.
* Select nodes.
* Configure nodes.
* Rename nodes.
* Delete nodes.
* Zoom and pan the canvas.
* Validate the workflow.
* Save/export the workflow as JSON.
* Import/load a workflow from JSON.

## 2.2 Supported Node Types

MVP1 must support:

```text
START
END

LLM
TOOL
API
DATABASE
RAG

CONDITION
HITL

TRANSFORM
```

The implementation must make it easy to add additional node types later.

## 2.3 Natural Language Workflow Generation

The user should be able to describe a workflow using natural language.

Example:

> Build a customer support workflow that classifies the request, searches the knowledge base, retrieves customer information, and sends complex cases to a human.

The backend sends the description to an LLM.

The LLM returns the application's Workflow JSON.

The backend validates the generated workflow.

The validated workflow is displayed on the visual canvas.

The LLM must NOT generate arbitrary application code as the first step.

The first AI generation step must produce structured workflow data.

## 2.4 Workflow Persistence

MVP1 does not require a database.

The application must support:

* New workflow.
* Save.
* Save As.
* Open/import JSON.
* Export JSON.

Example:

```text
my-support-agent.json
```

The JSON should be human-readable and versioned.

## 2.5 Workflow Validation

The application must detect basic workflow problems.

Examples:

* Missing START node.
* More than one START node.
* Missing END node.
* Duplicate node IDs.
* Invalid node types.
* Edges referencing nonexistent nodes.
* Missing required node configuration.
* Disconnected nodes where practical.

Validation errors and warnings should be clearly displayed to the user.

---

# 3. MVP1 Scope

## In Scope

* React visual workflow editor.
* React Flow integration.
* TypeScript workflow model.
* FastAPI backend.
* Pydantic workflow schemas.
* Natural-language workflow generation.
* One LLM provider initially.
* Node configuration.
* Workflow validation.
* JSON import/export.
* Example workflow.
* Basic automated tests.
* Documentation.

## Out of Scope

Do NOT implement these in MVP1:

* Production API execution.
* Real database execution.
* Real RAG execution.
* Real HITL execution.
* Full workflow simulator.
* Evaluation engine.
* LLM-as-a-judge.
* Langfuse integration.
* Authentication.
* Multi-user collaboration.
* Billing.
* Team management.
* Git integration.
* Deployment.
* Electron desktop application.
* Production LangGraph execution.

The architecture should support these future capabilities, but MVP1 should remain focused.

---

# 4. Recommended Technology

## Frontend

```text
React
TypeScript
Vite
React Flow
```

## Backend

```text
Python
FastAPI
Pydantic
```

## AI

Use a provider-independent abstraction.

Conceptually:

```text
LLMProvider
   ├── OpenAI
   ├── Gemini
   └── Future providers
```

Implement one provider initially.

Keep provider-specific implementation isolated.

## Storage

No database is required for MVP1.

Use JSON files.

A database can be introduced in a future milestone.

---

# 5. Core Architecture

The application's internal Workflow Model is the **source of truth**.

Do NOT make LangChain, LangGraph, or React Flow objects the permanent source of truth.

Architecture:

```text
                    Workflow Model
                          │
              ┌───────────┼────────────┐
              ↓           ↓            ↓
          React Flow     JSON       Future APIs
              │
              ↓
          User Interface
```

Future architecture:

```text
                     Workflow Model
                           │
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
    Simulator          Evaluator        LangGraph
                                           Adapter
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ↓
                    Workflow Execution
```

This separation is critical.

---

# 6. Workflow Data Model

The application must have its own workflow schema.

Example:

```json
{
  "version": "1.0",
  "id": "customer-support",
  "name": "Customer Support Agent",
  "description": "Handles customer support requests",
  "nodes": [
    {
      "id": "start",
      "type": "START",
      "name": "Start",
      "position": {
        "x": 100,
        "y": 100
      },
      "config": {}
    },
    {
      "id": "classifier",
      "type": "LLM",
      "name": "Classify Request",
      "position": {
        "x": 300,
        "y": 100
      },
      "config": {
        "model": "default",
        "prompt": "Classify the customer request",
        "temperature": 0
      }
    },
    {
      "id": "knowledge",
      "type": "RAG",
      "name": "Knowledge Search",
      "position": {
        "x": 500,
        "y": 100
      },
      "config": {
        "knowledgeBase": "support-documents",
        "topK": 5
      }
    }
  ],
  "edges": [
    {
      "source": "start",
      "target": "classifier"
    },
    {
      "source": "classifier",
      "target": "knowledge"
    }
  ],
  "metadata": {}
}
```

The schema must be extensible.

---

# 7. Node Model

Each node should contain:

```text
id
type
name
position
config
```

Each edge should contain:

```text
source
target
condition (optional)
metadata (optional)
```

Node types should use a strongly typed enum or equivalent.

---

# 8. Node Configuration

At minimum, support the following configurations.

## LLM

```text
model
prompt
temperature
```

## TOOL

```text
name
description
inputSchema
```

## API

```text
method
url
headers
requestSchema
responseSchema
```

## DATABASE

```text
type
connection/reference
query
```

Do not store real credentials in workflow JSON.

## RAG

```text
knowledgeBase
topK
similarityThreshold
```

## CONDITION

```text
expression
```

## HITL

```text
instructions
```

## TRANSFORM

```text
description
inputSchema
outputSchema
```

START and END require no special configuration.

---

# 9. UI Design

Use a three-panel developer-tool layout.

```text
┌─────────────────────────────────────────────────────────────┐
│ Logo │ Workflow Name │ New │ Open │ Save │ Export │ Generate│
├────────────┬───────────────────────────────┬────────────────┤
│            │                               │                │
│   Nodes    │                               │   Properties   │
│            │                               │                │
│ START      │                               │ Node Name      │
│ END        │       WORKFLOW CANVAS         │ Node Type      │
│ LLM        │                               │                │
│ TOOL       │                               │ Configuration  │
│ API        │                               │                │
│ DATABASE   │                               │                │
│ RAG        │                               │                │
│ CONDITION  │                               │                │
│ HITL       │                               │                │
│ TRANSFORM  │                               │                │
│            │                               │                │
└────────────┴───────────────────────────────┴────────────────┘
```

The application should look like a professional developer tool.

Avoid making it look like a generic CRUD application.

---

# 10. Natural Language Generation

Provide a workflow description input.

Example:

```text
┌───────────────────────────────────────────────┐
│ Describe your workflow...                     │
│                                               │
│ Create a customer support agent that...       │
│                                               │
└───────────────────────────────────────────────┘

             [ Generate Workflow ]
```

Execution:

```text
User Description
       ↓
React
       ↓
POST /api/workflows/generate
       ↓
FastAPI
       ↓
LLM
       ↓
Structured Workflow JSON
       ↓
Pydantic Validation
       ↓
React Flow
```

The LLM should generate only structured workflow data.

Use structured output/schema validation where supported.

If the LLM generates invalid data:

1. Validate it.
2. Return a meaningful error.
3. Do not render an invalid workflow.

---

# 11. Backend API

Implement a minimal REST API.

## Health

```http
GET /api/health
```

## Generate Workflow

```http
POST /api/workflows/generate
```

Request:

```json
{
  "description": "Create a customer support workflow..."
}
```

Response:

```json
{
  "workflow": {}
}
```

## Validate Workflow

```http
POST /api/workflows/validate
```

Request:

```json
{
  "workflow": {}
}
```

Response:

```json
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```

Keep the backend small and focused.

---

# 12. Project Structure

Use the following general structure:

```text
ai-workflow-designer/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── features/
│   │   │   └── workflow/
│   │   ├── models/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── utils/
│   └── ...
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── providers/
│   │   └── core/
│   │
│   └── tests/
│
├── examples/
│
└── README.md
```

The exact structure may be adjusted if Claude determines a better organization, but separation of concerns must be maintained.

---

# 13. Instructions for Claude

## Primary Goal

Build MVP1 of the AI Workflow Designer described in this document.

The result must be a working local application.

The application must allow a developer to:

1. Create a workflow.
2. Add nodes.
3. Connect nodes.
4. Configure nodes.
5. Validate the workflow.
6. Describe a workflow using natural language.
7. Generate a workflow using an LLM.
8. Edit the generated workflow.
9. Export it as JSON.
10. Import it later.

## Important Architectural Principle

The application's internal Workflow Model is the source of truth.

Do not make:

* React Flow state
* LangChain objects
* LangGraph objects

the permanent domain model.

Use adapters/mappers where necessary.

For example:

```text
Workflow Model
      ↓
React Flow Adapter
      ↓
React Flow
```

and:

```text
React Flow
      ↓
Workflow Model
      ↓
JSON
```

Future:

```text
Workflow Model
      ↓
LangGraph Adapter
      ↓
LangGraph
```

## Code Quality

Use production-quality engineering practices.

Use:

* Strong TypeScript types.
* Pydantic models.
* Clear separation of concerns.
* Reusable React components.
* Service boundaries.
* Environment variables.
* Error handling.
* Basic logging.
* Automated tests.

Avoid:

* Giant React components.
* Business logic directly inside UI components.
* Provider-specific code throughout the application.
* Hard-coded API keys.
* Hard-coded node behavior.
* Unnecessary dependencies.
* Premature implementation of future features.

## Node Architecture

Create a generic node architecture.

Adding a new node type later should require minimal changes.

Use:

```text
NodeType
NodeDefinition
NodeConfig
```

or an equivalent clean architecture.

Node definitions should ideally describe:

* display name
* node type
* default configuration
* configuration fields
* visual representation
* validation rules

## LLM Architecture

Create:

```text
LLMProvider
```

with one initial implementation.

Keep provider-specific code isolated.

The rest of the application should not know whether the provider is OpenAI, Gemini, or another model.

## Security

Never put API keys in frontend code.

Use backend environment variables.

Do not store API credentials inside workflow JSON.

---

# 14. Claude Task List

Implement the following tasks sequentially.

## Phase 1 — Project Foundation

### Task 1 — Repository Setup

Create the project structure.

Set up:

* React
* TypeScript
* Vite
* React Flow
* FastAPI
* Pydantic
* Testing frameworks

Verify frontend and backend start successfully.

---

## Phase 2 — Domain Model

### Task 2 — Workflow Schema

Implement:

```text
Workflow
Node
Edge
NodeType
NodeConfig
```

Create strongly typed frontend models.

Create corresponding Pydantic backend models.

Implement JSON serialization/deserialization.

Add tests.

---

## Phase 3 — Workflow Editor

### Task 3 — Basic Canvas

Add React Flow.

Implement:

* canvas
* zoom
* pan
* node movement
* edge connections
* node selection

Keep React Flow state separate from the application's domain model.

---

### Task 4 — Node Palette

Create the left-side node palette.

Add:

```text
START
END
LLM
TOOL
API
DATABASE
RAG
CONDITION
HITL
TRANSFORM
```

Allow nodes to be dragged onto the canvas.

---

### Task 5 — Node Properties

Create the right-side properties panel.

When a node is selected, display:

```text
Name
Type
Configuration
```

Implement configuration fields for the supported node types.

---

## Phase 4 — Workflow Management

### Task 6 — New Workflow

Implement:

```text
New
```

Create:

```text
START → END
```

as the initial workflow.

---

### Task 7 — Save/Export JSON

Implement JSON export.

The exported file must represent the application's Workflow model.

Do not export raw React Flow state.

---

### Task 8 — Import/Open JSON

Implement JSON import.

Flow:

```text
JSON
 ↓
Parse
 ↓
Validate
 ↓
Workflow Model
 ↓
React Flow
```

Show useful errors for invalid files.

---

## Phase 5 — Validation

### Task 9 — Workflow Validator

Implement:

```text
validateWorkflow(workflow)
```

Validate:

* exactly one START
* at least one END
* unique node IDs
* valid node types
* valid edge references
* required configuration
* disconnected nodes where practical

Display validation results in the UI.

---

# Phase 6 — AI Generation

### Task 10 — LLM Provider

Implement the provider abstraction.

Implement one provider.

Use environment variables for credentials.

Example:

```text
LLM_API_KEY=...
LLM_MODEL=...
```

Do not expose credentials to the frontend.

---

### Task 11 — Workflow Generation API

Implement:

```http
POST /api/workflows/generate
```

Request:

```json
{
  "description": "Create a customer support workflow..."
}
```

The backend should:

1. Receive description.
2. Build structured LLM request.
3. Call LLM.
4. Parse structured result.
5. Validate Workflow.
6. Return Workflow.
7. Return useful errors if validation fails.

---

### Task 12 — Generate UI

Add:

```text
Describe your workflow...

[Generate Workflow]
```

On success:

```text
Workflow JSON
      ↓
Workflow Model
      ↓
Canvas
```

The generated workflow must be editable.

---

# Phase 7 — Example

### Task 13 — Customer Support Example

Create an example workflow:

```text
START
 ↓
Classify Request
 ↓
Knowledge Search
 ↓
Customer API
 ↓
Decision
 ├── Simple → Response
 │
 └── Complex → Human Review
                     ↓
                  Response
                     ↓
                    END
```

Allow the user to load this example.

---

# Phase 8 — Future Architecture

### Task 14 — Future Service Interfaces

Define clean boundaries/interfaces for:

```text
WorkflowSimulator
WorkflowEvaluator
LangGraphExporter
```

Do not fully implement them.

Document their future responsibilities.

Future architecture:

```text
Workflow
   ↓
Simulator
   ↓
Execution Trace
   ↓
Evaluator
```

and:

```text
Workflow
   ↓
LangGraphExporter
   ↓
LangGraph Python
```

---

# Phase 9 — Testing

### Task 15 — Backend Tests

Test:

* valid workflow
* invalid workflow
* serialization
* deserialization
* invalid node type
* invalid edge
* missing START
* missing END
* duplicate node ID
* invalid configuration

---

### Task 16 — Frontend Tests

Test at least:

* workflow canvas renders
* node can be added
* node can be selected
* node configuration can be edited
* nodes can be connected
* workflow can be exported

---

# Phase 10 — Documentation

### Task 17 — README

Document:

* Product purpose.
* Architecture.
* Project structure.
* Prerequisites.
* Installation.
* Environment variables.
* Running frontend.
* Running backend.
* Running tests.
* Workflow JSON format.
* Node types.
* Current MVP1 limitations.
* Future roadmap.

---

# 15. Definition of Done

MVP1 is complete when a developer can:

* Start the application locally.
* Create a new workflow.
* See START → END.
* Drag nodes onto the canvas.
* Connect nodes.
* Configure nodes.
* Delete nodes.
* Validate the workflow.
* Describe a workflow in natural language.
* Generate a workflow using an LLM.
* Edit the generated workflow.
* Export it as JSON.
* Import the JSON later.
* Load the example workflow.
* Run the automated tests.

The application does **not** need to execute real AI workflows in MVP1.

---

# 16. Future Roadmap

MVP1 establishes the foundation for the following milestones.

## MVP2 — Simulator

```text
Workflow
   ↓
Simulator
   ↓
Mock APIs
Mock DB
Mock RAG
Mock Tools
Mock HITL
   ↓
Execution Trace
```

Capabilities:

* Mock external APIs.
* Mock databases.
* Mock tool calls.
* Mock LLM responses.
* Simulated HITL.
* Execution trace.
* Inputs/outputs at every node.
* Error simulation.
* Retry simulation.
* Branch visualization.

## MVP3 — Evaluator

Add:

* Test cases.
* Test suites.
* LLM-as-judge.
* Rule-based evaluation.
* Expected paths.
* Expected tool calls.
* Expected outputs.
* Scoring.
* Evaluation reports.

Example:

```text
Workflow Evaluation
────────────────────────────

Correctness          92%
Tool Selection       88%
Routing              94%
HITL Behavior        91%
Response Quality     95%
Error Handling       82%
```

## MVP4 — Optimization

Add:

* Workflow optimization suggestions.
* Parallel execution suggestions.
* Model selection recommendations.
* Prompt optimization.
* Cost analysis.
* Token analysis.
* Latency analysis.
* Retry recommendations.

## Future — Developer Platform

Potential future capabilities:

```text
Git integration
Workflow versioning
Team collaboration
Real API integrations
Secrets management
LangGraph export
LangChain export
Langfuse integration
Deployment
CLI
Desktop/Electron application
Cloud execution
```

---

# 17. Product Vision

The long-term product should evolve from:

> **Visual AI Workflow Designer**

into:

> **A development environment for designing, simulating, testing, evaluating, and optimizing agentic AI workflows.**

The intended workflow lifecycle is:

```text
              ┌─────────────┐
              │  Describe   │
              └──────┬──────┘
                     ↓
              ┌─────────────┐
              │  Generate   │
              └──────┬──────┘
                     ↓
              ┌─────────────┐
              │   Design    │
              └──────┬──────┘
                     ↓
              ┌─────────────┐
              │  Simulate   │
              └──────┬──────┘
                     ↓
              ┌─────────────┐
              │    Test     │
              └──────┬──────┘
                     ↓
              ┌─────────────┐
              │  Evaluate   │
              └──────┬──────┘
                     ↓
              ┌─────────────┐
              │  Optimize   │
              └──────┬──────┘
                     ↓
              ┌─────────────┐
              │   Export    │
              └─────────────┘
```

**MVP1 should focus on getting the first three stages working extremely well:**

```text
Describe → Generate → Design
```

Do not allow future features to unnecessarily expand the MVP1 implementation.
