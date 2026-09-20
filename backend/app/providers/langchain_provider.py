from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import JsonOutputParser
from app.providers.base import LLMProvider

_SYSTEM_PROMPT = """
You are an AI workflow designer. Generate a workflow JSON for the given description.

Return ONLY a valid JSON object — no markdown, no explanation, just the JSON.

Schema:
{
  "version": "1.0",
  "id": "<uuid-v4>",
  "name": "<short workflow name>",
  "description": "<one sentence description>",
  "nodes": [
    {
      "id": "<kebab-case-unique-id>",
      "type": "<NODE_TYPE>",
      "name": "<human-readable display name>",
      "position": { "x": <number>, "y": <number> },
      "config": { ... }
    }
  ],
  "edges": [
    {
      "source": "<node-id>",
      "target": "<node-id>",
      "condition": "<optional label, e.g. simple / complex / yes / no>"
    }
  ],
  "metadata": {}
}

Node types (use the exact string):
  START      — Entry point. No config. Exactly ONE per workflow.
  END        — Exit point. No config. At least one per workflow.
  LLM        — LLM call. Config: { "model": "gpt-4o-mini", "prompt": "<system prompt>", "temperature": 0 }
  TOOL       — Tool/function. Config: { "name": "<tool name>", "description": "<what it does>" }
  API        — HTTP call. Config: { "method": "GET|POST|PUT|PATCH|DELETE", "url": "<url>" }
  DATABASE   — DB query. Config: { "type": "postgresql", "connection": "env:DB_URL", "query": "<SQL>" }
  RAG        — Retrieval. Config: { "knowledgeBase": "<name>", "topK": 5 }
  CONDITION  — Decision. Config: { "expression": "<condition expression>" }
  HITL       — Human review. Config: { "instructions": "<review instructions>" }
  TRANSFORM  — Transform. Config: { "description": "<what the transformation does>" }

Layout rules:
  - Main path nodes: x=300, y starts at 100 and increments by 160 per level.
  - CONDITION branches: left branch x=150, right branch x=450.
  - After branches converge, resume main path at x=300.
  - Edges from CONDITION nodes must include a "condition" label.

Constraints:
  - Every node has a unique, descriptive kebab-case id.
  - Every node except END must have at least one outgoing edge.
  - Every node except START must have at least one incoming edge.
  - Fill config fields with meaningful values based on the description.
""".strip()


class LangChainProvider(LLMProvider):
    def __init__(self, base_url: str | None, api_key: str, model: str) -> None:
        kwargs: dict = {"model": model, "api_key": api_key or "lm-studio", "temperature": 0}
        if base_url:
            # Local server (e.g. LM Studio) — pass base_url; skip json_object mode
            # since not all local models support the response_format parameter
            kwargs["base_url"] = base_url
        else:
            # OpenAI — enforce JSON output mode to prevent markdown wrapping
            kwargs["model_kwargs"] = {"response_format": {"type": "json_object"}}
        self._llm = ChatOpenAI(**kwargs)
        self._parser = JsonOutputParser()

    async def generate_workflow(self, description: str) -> dict:
        messages = [SystemMessage(content=_SYSTEM_PROMPT), HumanMessage(content=description)]
        chain = self._llm | self._parser
        result = await chain.ainvoke(messages)
        return result  # type: ignore[return-value]

    async def complete_json(self, system: str, user: str) -> dict:
        messages = [SystemMessage(content=system), HumanMessage(content=user)]
        chain = self._llm | self._parser
        result = await chain.ainvoke(messages)
        return result  # type: ignore[return-value]
