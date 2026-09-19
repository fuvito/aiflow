import json
from openai import AsyncOpenAI
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


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, model: str) -> None:
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    async def generate_workflow(self, description: str) -> dict:
        response = await self._client.chat.completions.create(
            model=self._model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": description},
            ],
            temperature=0,
        )
        content = response.choices[0].message.content or ""
        return json.loads(content)
