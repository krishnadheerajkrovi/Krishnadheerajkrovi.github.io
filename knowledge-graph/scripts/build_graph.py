#!/usr/bin/env python3
"""Build a private capability graph from confidential evidence and a configured source root."""

import argparse
import json
import shutil
import os
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from graph_paths import CURATED, INVENTORY, ONTOLOGY, OUTPUT, SITE, VIEWER, source_root

SOURCE_ROOT = None

PRUNE = {
    ".git", ".idea", ".vscode", ".venv", "venv", "node_modules", "dist", "build",
    "target", "coverage", ".next", ".cache", "__pycache__", ".pytest_cache",
    "Library", "Applications", "Movies", "Music", "Pictures", "Downloads",
}
TEXT_FILES = {"README.md", "README.rst", "README.txt", "pyproject.toml", "requirements.txt", "package.json", "go.mod", "pom.xml", "build.gradle", "docker-compose.yml", "docker-compose.yaml"}
SOURCE_EXTENSIONS = {".py", ".go", ".java", ".js", ".jsx", ".ts", ".tsx", ".sql", ".scala", ".rs", ".cs"}
LANGUAGE_NAMES = {".py":"Python", ".go":"Go", ".java":"Java", ".js":"JavaScript", ".jsx":"JavaScript", ".ts":"TypeScript", ".tsx":"TypeScript", ".sql":"SQL", ".scala":"Scala", ".rs":"Rust", ".cs":"C#"}


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def safe_text(path, limit=120_000):
    try:
        return path.read_text(errors="ignore")[:limit]
    except (OSError, PermissionError):
        return ""


def discover_repositories(root, max_depth=3):
    repositories = []
    root_depth = len(root.parts)
    for current, dirs, files in os.walk(root, onerror=lambda _error: None):
        path = Path(current)
        depth = len(path.parts) - root_depth
        dirs[:] = [d for d in dirs if d not in PRUNE and not d.startswith(".")]
        if depth > max_depth:
            dirs[:] = []
            continue
        file_set = set(files)
        has_manifest = bool(file_set & {"pyproject.toml", "requirements.txt", "package.json", "go.mod", "pom.xml", "build.gradle", "Cargo.toml"})
        has_readme = bool(file_set & {"README.md", "README.rst", "README.txt"})
        if ".git" in files or (path / ".git").exists() or (has_manifest and has_readme):
            repositories.append(path)
            dirs[:] = []
    return sorted(set(repositories), key=lambda p: str(p).lower())


def repository_record(repo, ontology):
    files = []
    for current, dirs, names in os.walk(repo, onerror=lambda _error: None):
        dirs[:] = [d for d in dirs if d not in PRUNE and not d.startswith(".")]
        for name in names:
            path = Path(current) / name
            try:
                if path.stat().st_size <= 2_000_000:
                    files.append(path)
            except (OSError, PermissionError):
                continue
        if len(files) > 12_000:
            break

    language_counts = Counter(LANGUAGE_NAMES[p.suffix.lower()] for p in files if p.suffix.lower() in LANGUAGE_NAMES)
    readme = next((repo / name for name in ("README.md", "README.rst", "README.txt") if (repo / name).exists()), None)
    readme_text = safe_text(readme) if readme else ""
    manifest_text = "\n".join(safe_text(p, 40_000) for p in files if p.name in TEXT_FILES)
    search_text = (repo.name + "\n" + readme_text + "\n" + manifest_text).lower()

    technologies = []
    for tech_id, aliases in ontology["technologies"].items():
        if any(alias.lower() in search_text for alias in aliases):
            technologies.append(tech_id)
    capabilities = infer_capabilities(search_text, ontology)
    tests = sum(1 for p in files if re.search(r"(^test_|_test\.|\.test\.|\.spec\.)", p.name.lower()))
    evidence_level = "strong" if readme_text and (tests or capabilities) else "moderate" if readme_text or capabilities else "limited"
    summary_lines = [line.strip(" #\t") for line in readme_text.splitlines() if line.strip() and not line.lstrip().startswith(("[!", "![", "<"))]
    summary = next((line for line in summary_lines if 20 <= len(line) <= 260), repo.name.replace("_", " "))
    relative = str(repo.relative_to(SOURCE_ROOT))
    docs = [str(p.relative_to(repo)) for p in files if p.name.lower() in {"architecture.md", "status.md", "security.md"}][:12]
    return {
        "id": "repo:" + slug(relative),
        "name": repo.name.replace("_", " ").replace("-", " ").title(),
        "path": str(repo),
        "relativePath": relative,
        "summary": summary,
        "languages": [{"name": name, "files": count} for name, count in language_counts.most_common()],
        "technologies": sorted(technologies),
        "capabilities": sorted(capabilities),
        "signals": {
            "sourceFiles": sum(language_counts.values()),
            "testFiles": tests,
            "hasReadme": bool(readme_text),
            "documentation": docs,
        },
        "evidenceLevel": evidence_level,
        "provenance": [str(readme)] if readme else [str(repo)],
    }


def infer_capabilities(text, ontology):
    haystack = text.lower()
    found = set()
    for capability in ontology["capabilities"]:
        terms = [capability["name"], *capability.get("aliases", [])]
        if any(term.lower() in haystack for term in terms):
            found.add(capability["id"])
    technology_capabilities = {
        "langgraph":["cap:agentic-systems","cap:workflow-orchestration"],
        "langchain":["cap:llm-integration","cap:retrieval-knowledge"],
        "mcp":["cap:agentic-systems","cap:enterprise-integration"],
        "react":["cap:frontend-product"],
        "postgresql":["cap:backend-api","cap:data-engineering"],
        "mongodb":["cap:backend-api","cap:data-engineering"],
        "redis":["cap:distributed-systems","cap:reliability"],
        "elasticsearch":["cap:retrieval-knowledge","cap:data-engineering"],
        "spark":["cap:data-engineering","cap:distributed-systems"],
        "aws":["cap:cloud-platform"], "azure":["cap:cloud-platform"], "gcp":["cap:cloud-platform"],
        "docker":["cap:cloud-platform","cap:cicd"], "kubernetes":["cap:cloud-platform","cap:reliability"],
        "terraform":["cap:cloud-platform","cap:cicd"], "opentelemetry":["cap:observability"],
        "prometheus":["cap:observability"], "grafana":["cap:observability"],
        "mlflow":["cap:ml-applied-ai","cap:ai-evaluation"], "milvus":["cap:retrieval-knowledge"],
        "chroma":["cap:retrieval-knowledge"], "oauth":["cap:security-auth"], "keycloak":["cap:security-auth"],
    }
    for tech_id, aliases in ontology["technologies"].items():
        if any(alias.lower() in haystack for alias in aliases):
            found.update(technology_capabilities.get(tech_id, []))
    return found


def add_edge(edges, seen, source, target, edge_type, **metadata):
    key = (source, target, edge_type)
    if key not in seen:
        edges.append({"source": source, "target": target, "type": edge_type, **metadata})
        seen.add(key)


def main():
    global SOURCE_ROOT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--use-cache", action="store_true", help="Build without scanning any source repositories")
    args = parser.parse_args()
    SOURCE_ROOT = source_root()
    curated = json.loads(CURATED.read_text())
    ontology = json.loads(ONTOLOGY.read_text())
    generated_at = datetime.now(timezone.utc).isoformat()
    if args.use_cache:
        inventory = json.loads(INVENTORY.read_text())
        if Path(inventory["sourceRoot"]).resolve() != SOURCE_ROOT:
            raise ValueError("Cached inventory does not match the configured source root")
        repo_records = inventory["repositories"]
        inventory_generated_at = inventory["generatedAt"]
    else:
        if not SOURCE_ROOT.is_dir():
            raise ValueError("Configured source root is not an accessible directory")
        repo_records = [repository_record(repo, ontology) for repo in discover_repositories(SOURCE_ROOT)]
        inventory_generated_at = generated_at
        INVENTORY.parent.mkdir(parents=True, exist_ok=True)
        INVENTORY.write_text(json.dumps({"generatedAt": generated_at, "sourceRoot": str(SOURCE_ROOT), "repositories": repo_records}, indent=2) + "\n")

    nodes, edges, edge_keys = [], [], set()
    nodes.append({"@id": curated["person"]["id"], "@type": "Person", **curated["person"]})
    capabilities = {item["id"]: item for item in ontology["capabilities"]}
    for capability in ontology["capabilities"]:
        nodes.append({"@id": capability["id"], "@type": "Capability", **capability})
        for related in capability.get("related", []):
            add_edge(edges, edge_keys, capability["id"], related, "TRANSFERS_TO", weight=0.55)

    tech_nodes = {}
    for tech_id, aliases in ontology["technologies"].items():
        node_id = "tech:" + tech_id
        tech_nodes[tech_id] = node_id
        nodes.append({"@id": node_id, "@type": "Technology", "name": aliases[0], "aliases": aliases[1:]})

    repo_by_path = {record["path"]: record for record in repo_records}
    project_to_repo = {}
    for project in curated["projects"]:
        nodes.append({"@id": project["id"], "@type": "Project", **project})
        add_edge(edges, edge_keys, curated["person"]["id"], project["id"], "BUILT_OR_CONTRIBUTED")
        repo = repo_by_path.get(project["repo"])
        if repo:
            project_to_repo[project["id"]] = repo["id"]
            add_edge(edges, edge_keys, project["id"], repo["id"], "IMPLEMENTED_IN")

    for repo in repo_records:
        nodes.append({"@id": repo["id"], "@type": "Repository", **repo})
        add_edge(edges, edge_keys, curated["person"]["id"], repo["id"], "HAS_REPOSITORY_EVIDENCE", evidenceLevel=repo["evidenceLevel"])
        for capability_id in repo["capabilities"]:
            add_edge(edges, edge_keys, repo["id"], capability_id, "IMPLEMENTS_CAPABILITY", evidenceLevel=repo["evidenceLevel"])
        for tech_id in repo["technologies"]:
            add_edge(edges, edge_keys, repo["id"], tech_nodes[tech_id], "USES_TECHNOLOGY", evidenceLevel=repo["evidenceLevel"])

    skills = {}
    for item in curated["evidence"]:
        combined = " ".join([item["title"], item["claim"], *item.get("skills", [])])
        capability_ids = sorted(infer_capabilities(combined, ontology))
        node = {"@id": item["id"], "@type": "Evidence", **item, "capabilities": capability_ids, "evidenceLevel": "verified"}
        nodes.append(node)
        add_edge(edges, edge_keys, item["project"], item["id"], "SUPPORTED_BY")
        if item["project"] in project_to_repo:
            add_edge(edges, edge_keys, item["id"], project_to_repo[item["project"]], "EVIDENCED_IN")
        for capability_id in capability_ids:
            add_edge(edges, edge_keys, item["id"], capability_id, "DEMONSTRATES_CAPABILITY", evidenceLevel="verified")
        for skill in item.get("skills", []):
            skill_id = "skill:" + slug(skill)
            skills.setdefault(skill_id, skill)
            add_edge(edges, edge_keys, item["id"], skill_id, "DEMONSTRATES_SKILL", evidenceLevel="verified")
    nodes.extend({"@id": skill_id, "@type": "Skill", "name": name} for skill_id, name in skills.items())

    alias_index = {}
    for capability in ontology["capabilities"]:
        for alias in [capability["name"], *capability.get("aliases", [])]:
            alias_index[alias.lower()] = capability["id"]
    technology_index = {alias.lower(): "tech:" + tech_id for tech_id, aliases in ontology["technologies"].items() for alias in aliases}
    payload = {
        "@context": {"name":"https://schema.org/name","Person":"https://schema.org/Person","Project":"https://schema.org/SoftwareSourceCode"},
        "schemaVersion": 2,
        "generatedAt": generated_at,
        "inventoryGeneratedAt": inventory_generated_at,
        "sourceRoot": str(SOURCE_ROOT),
        "matchingPolicy": {
            "mode": "capability-and-transferability",
            "exactKeywordMatchRequired": False,
            "guidance": "Map requirements to capabilities, technologies, implementation mechanisms, and adjacent capabilities. Use verified claims for resume bullets; use repository signals as transferable evidence with provenance and confidence.",
        },
        "nodes": nodes,
        "edges": edges,
        "matchIndex": {
            "aliases": alias_index,
            "technologies": technology_index,
            "capabilityNeighbors": {key: value.get("related", []) for key, value in capabilities.items()},
        },
        "counts": {
            "projects": len(curated["projects"]), "repositories": len(repo_records),
            "evidence": len(curated["evidence"]), "skills": len(skills),
            "capabilities": len(capabilities), "technologies": len(tech_nodes), "edges": len(edges),
        },
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n")
    for asset in ("index.html", "app.js", "styles.css"):
        shutil.copy2(VIEWER / asset, SITE / "dist" / asset)
    print(json.dumps(payload["counts"]))


if __name__ == "__main__":
    main()
