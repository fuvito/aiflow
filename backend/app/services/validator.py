from app.models.workflow import Workflow, NodeType
from app.schemas.requests import ValidationResult

# Required config keys per node type
_REQUIRED_CONFIG: dict[NodeType, list[str]] = {
    NodeType.LLM: ["prompt"],
    NodeType.API: ["method", "url"],
    NodeType.DATABASE: ["query"],
    NodeType.RAG: ["knowledgeBase"],
    NodeType.CONDITION: ["expression"],
    NodeType.HITL: ["instructions"],
}


def validate_workflow(workflow: Workflow) -> ValidationResult:
    errors: list[str] = []
    warnings: list[str] = []

    node_ids = [n.id for n in workflow.nodes]

    # Duplicate IDs
    seen: set[str] = set()
    for nid in node_ids:
        if nid in seen:
            errors.append(f"Duplicate node ID: '{nid}'")
        seen.add(nid)

    # START / END counts
    start_nodes = [n for n in workflow.nodes if n.type == NodeType.START]
    end_nodes = [n for n in workflow.nodes if n.type == NodeType.END]

    if len(start_nodes) == 0:
        errors.append("Workflow must have exactly one START node.")
    elif len(start_nodes) > 1:
        errors.append(f"Workflow has {len(start_nodes)} START nodes; exactly one is required.")

    if len(end_nodes) == 0:
        errors.append("Workflow must have at least one END node.")

    # Edge references
    id_set = set(node_ids)
    for edge in workflow.edges:
        if edge.source not in id_set:
            errors.append(f"Edge references unknown source node: '{edge.source}'")
        if edge.target not in id_set:
            errors.append(f"Edge references unknown target node: '{edge.target}'")

    # Required config
    for node in workflow.nodes:
        required = _REQUIRED_CONFIG.get(node.type, [])
        for key in required:
            if key not in node.config or not node.config[key]:
                warnings.append(
                    f"Node '{node.name}' ({node.type}) is missing recommended config field: '{key}'"
                )

    # Disconnected nodes (warn only)
    connected_ids: set[str] = set()
    for edge in workflow.edges:
        connected_ids.add(edge.source)
        connected_ids.add(edge.target)

    for node in workflow.nodes:
        if node.type not in (NodeType.START, NodeType.END) and node.id not in connected_ids:
            warnings.append(f"Node '{node.name}' ({node.id}) is not connected to any edge.")

    return ValidationResult(valid=len(errors) == 0, errors=errors, warnings=warnings)
