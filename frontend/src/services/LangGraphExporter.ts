import type { Workflow } from '../models/workflow';

/**
 * LangGraphExporter — Future Milestone
 *
 * Converts an AiFlow Workflow model into executable LangGraph Python code.
 * The internal Workflow model is the source of truth; this adapter translates
 * it to the LangGraph StateGraph API without the rest of the app knowing.
 *
 * Responsibilities:
 *   - Map each AiFlow node type to its LangGraph equivalent
 *     (LLM → ChatOpenAI + PromptTemplate node, CONDITION → conditional_edges, etc.)
 *   - Generate Python import statements for required packages
 *   - Produce a runnable .py file or return the source as a string
 *   - Handle edge conditions → LangGraph's conditional routing
 *   - Output HITL nodes as interrupt_after patterns
 *
 * Future usage:
 *   const exporter = new LangGraphExporter();
 *   const pythonSource = exporter.export(workflow);
 *   // download pythonSource as workflow.py
 */
export interface LangGraphExporter {
  export(workflow: Workflow): string;
}

// Not yet implemented — placeholder to establish the interface.
