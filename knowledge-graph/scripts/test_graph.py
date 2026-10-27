#!/usr/bin/env python3
"""Validate private graph structure without depending on confidential project names."""
import json
from graph_paths import OUTPUT, INVENTORY


def validate(graph, inventory):
    assert graph["schemaVersion"] == 2
    assert graph["matchingPolicy"]["exactKeywordMatchRequired"] is False
    assert len(inventory["repositories"]) == graph["counts"]["repositories"]
    node_ids = [node["@id"] for node in graph["nodes"]]
    assert len(node_ids) == len(set(node_ids)), "Duplicate node IDs"
    nodes = set(node_ids)
    edges = [(edge["source"], edge["target"], edge["type"]) for edge in graph["edges"]]
    assert len(edges) == len(set(edges)), "Duplicate edges"
    assert all(source in nodes and target in nodes for source, target, _ in edges)
    assert any(kind == "TRANSFERS_TO" for _, _, kind in edges)
    assert any(kind == "DEMONSTRATES_SKILL" for _, _, kind in edges)
    if inventory["repositories"]:
        assert any(kind == "HAS_REPOSITORY_EVIDENCE" for _, _, kind in edges)
    for field, node_type in [("projects", "Project"), ("repositories", "Repository"), ("evidence", "Evidence"), ("skills", "Skill"), ("capabilities", "Capability"), ("technologies", "Technology")]:
        assert graph["counts"][field] == sum(node["@type"] == node_type for node in graph["nodes"])
    assert graph["counts"]["edges"] == len(edges)
    assert all(target in nodes for target in graph["matchIndex"]["aliases"].values())
    assert all(target in nodes for target in graph["matchIndex"]["technologies"].values())


if __name__ == "__main__":
    graph = json.loads(OUTPUT.read_text())
    validate(graph, json.loads(INVENTORY.read_text()))
    print(json.dumps({"status": "ok", "counts": graph["counts"]}))
