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
  "metadata": {
    "sample_input": {
      "<field-name>": "<representative value>",
      "...": "..."
    }
  }
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
  - metadata.sample_input: a flat JSON object with 2–5 key-value pairs representing realistic initial input for this workflow (e.g. { "user_id": "usr_123", "message": "How do I reset my password?" }). Keys must match what the workflow logic actually needs.
""".strip()

_CHAT_SYSTEM_PROMPT = """
You are an expert AI workflow designer helping users design AI agent workflows through conversation.

ALWAYS respond with ONLY valid JSON — no extra text, no markdown:

While gathering information:
{ "status": "gathering", "reply": "<your message or question>", "workflow": null, "sample_input": null }

When ready to generate (or update):
{ "status": "ready", "reply": "<brief friendly confirmation>", "workflow": { <complete workflow> }, "sample_input": { "<key>": "<value>", ... } }

DECISION RULES:
- If the user's first message is specific enough to build a good workflow, respond status=ready immediately.
- Ask at most ONE focused question per turn. Never ask more than 2 questions before generating.
- Make reasonable assumptions rather than asking about minor details.
- Keep replies short and friendly.

WORKFLOW SCHEMA:
{
  "version": "1.0",
  "id": "<uuid-v4>",
  "name": "<short workflow name>",
  "description": "<one sentence>",
  "nodes": [{ "id": "<kebab-id>", "type": "<NODE_TYPE>", "name": "<name>", "position": { "x": 0, "y": 0 }, "config": {} }],
  "edges": [{ "source": "<id>", "target": "<id>", "condition": "<optional label>" }],
  "metadata": {}
}

NODE TYPES: START (entry, no config, exactly one) · END (exit, no config) · LLM (config: model, prompt, temperature) · TOOL (config: name, description) · API (config: method, url) · DATABASE (config: type, connection, query) · RAG (config: knowledgeBase, topK) · CONDITION (config: expression) · HITL (config: instructions) · TRANSFORM (config: description)

LAYOUT: main path x=300 y=100+160*level; CONDITION left branch x=150 right x=450; CONDITION edges must have condition label.

CONSTRAINTS: unique kebab-case ids; every non-END has outgoing edge; every non-START has incoming edge; fill configs with meaningful values; sample_input: 2–5 realistic key-value pairs matching the workflow's initial input.
""".strip()

_CHAT_REFINE_ADDON = """

REFINEMENT MODE: The user already has an existing workflow. Apply their requested changes.
- Respond status=ready immediately if the request is clear.
- Preserve existing node IDs and positions for unchanged nodes.
- Return the COMPLETE updated workflow (not a partial diff).
- Update sample_input if the changes affect workflow inputs.
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

    async def chat_workflow(
        self,
        messages: list[dict],
        current_workflow: dict | None = None,
    ) -> dict:
        import json as _json
        system = _CHAT_SYSTEM_PROMPT
        if current_workflow:
            system = (
                system
                + "\n\n"
                + _CHAT_REFINE_ADDON
                + "\n\nCurrent workflow:\n"
                + _json.dumps(current_workflow, indent=2)
            )
        from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
        lc_messages = [SystemMessage(content=system)]
        for m in messages:
            if m["role"] == "user":
                lc_messages.append(HumanMessage(content=m["content"]))
            else:
                lc_messages.append(AIMessage(content=m["content"]))
        chain = self._llm | self._parser
        result = await chain.ainvoke(lc_messages)
        return result  # type: ignore[return-value]

    async def complete_json(self, system: str, user: str) -> dict:
        messages = [SystemMessage(content=system), HumanMessage(content=user)]
        chain = self._llm | self._parser
        result = await chain.ainvoke(messages)
        return result  # type: ignore[return-value]
