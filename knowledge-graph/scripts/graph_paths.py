"""Shared paths for code in Git and confidential state outside the checkout."""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = ROOT.parent
STATE = Path(os.environ.get("CAREER_GRAPH_STATE_DIR", Path.home() / ".local/share/krishna-career-knowledge-graph")).expanduser().resolve()
if STATE == REPOSITORY or REPOSITORY in STATE.parents:
    raise ValueError("Confidential graph state must be outside the public repository")
CURATED = STATE / "data/curated_evidence.json"
INVENTORY = STATE / "data/repository_inventory.json"
ONTOLOGY = ROOT / "data/capability_ontology.json"
OUTPUT = STATE / "site/dist/data/knowledge_graph.json"
VIEWER = ROOT / "viewer"
SITE = STATE / "site"


def source_root():
    config = STATE / "config.json"
    value = os.environ.get("CAREER_GRAPH_SOURCE_ROOT")
    if not value and config.is_file():
        value = json.loads(config.read_text()).get("sourceRoot")
    if not value:
        raise ValueError("Set CAREER_GRAPH_SOURCE_ROOT or sourceRoot in the private state config.json")
    return Path(value).expanduser().resolve()
