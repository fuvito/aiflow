"""
LangGraphExporter — Future Milestone

Converts an AiFlow Workflow model into executable LangGraph Python code.
The internal Workflow model is the source of truth; this adapter translates
it to the LangGraph StateGraph API without the rest of the app knowing.

Responsibilities:
  - Map each AiFlow node type to its LangGraph equivalent:
      LLM       → ChatOpenAI + PromptTemplate node
      CONDITION → conditional_edges with routing function
      HITL      → interrupt_after pattern
      API       → custom tool node
      DATABASE  → custom tool node
      RAG       → retrieval node with vector store
      TOOL      → ToolNode
      TRANSFORM → custom node
  - Generate Python import statements
  - Produce a runnable .py file as a string
  - Handle branching edges → LangGraph conditional routing

Future usage::

    exporter = LangGraphExporter()
    python_source = exporter.export(workflow)
    # return python_source as a downloadable .py file

Not implemented in MVP1.
"""
from app.models.workflow import Workflow


class LangGraphExporter:
    def export(self, workflow: Workflow) -> str:
        raise NotImplementedError("LangGraphExporter is not yet implemented (planned for a future milestone).")
