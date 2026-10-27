#!/usr/bin/env python3
"""Export only the explicitly reviewed public profile. Never read private state."""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROFILE = ROOT / "data/public-profile.json"
PUBLIC = ROOT.parent / "assets/data"
FIELDS = {"id", "title", "summary", "skills", "aliases", "source", "kind"}


def validate(profile):
    if set(profile) != {"version", "reviewedOn", "scope", "records"}:
        raise ValueError("Unexpected public profile fields")
    if profile["version"] != 1 or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", profile["reviewedOn"]):
        raise ValueError("Invalid public profile version or review date")
    seen = set()
    for record in profile["records"]:
        if set(record) != FIELDS or record["id"] in seen:
            raise ValueError("Invalid record fields or duplicate ID")
        seen.add(record["id"])
        if not all(isinstance(record[k], str) and record[k].strip() for k in ("id", "title", "summary", "aliases")):
            raise ValueError("Public text fields must be nonempty strings")
        if not isinstance(record["skills"], list) or not record["skills"] or not all(isinstance(x, str) and x.strip() for x in record["skills"]):
            raise ValueError("Invalid skills")
        if record["kind"] not in {"verified-capability", "public-project"}:
            raise ValueError("Only reviewed capabilities and public projects can be exported")
        if set(record["source"]) != {"label", "url"}:
            raise ValueError("Private source metadata cannot be exported")
        if not re.fullmatch(r"#(?:skills|experience)|https://github\.com/krishnadheerajkrovi/[A-Za-z0-9_.-]+", record["source"]["url"]):
            raise ValueError("Source must be a public portfolio section or approved public repository")
    # A structural boundary plus common accidental copy/paste indicators.
    if re.search(r"/Users/|/home/|[A-Z]:\\\\|sourceRoot|relativePath|provenance", json.dumps(profile)):
        raise ValueError("Public profile contains internal source metadata or filesystem paths")


def public_graph(profile):
    nodes = [{"@id": "person:krishna", "@type": "Person", "name": "Krishna Dheeraj Krovi"}]
    edges = []
    skill_ids = {}
    for record in profile["records"]:
        node_id = "public:" + record["id"]
        nodes.append({"@id": node_id, "@type": "Project" if record["kind"] == "public-project" else "Evidence", "name": record["title"], "description": record["summary"], "url": record["source"]["url"], "evidenceLevel": "reviewed-public"})
        edges.append({"source": "person:krishna", "target": node_id, "type": "HAS_PUBLIC_EVIDENCE"})
        for skill in record["skills"]:
            if skill not in skill_ids:
                skill_ids[skill] = "skill:" + str(len(skill_ids) + 1)
                nodes.append({"@id": skill_ids[skill], "@type": "Skill", "name": skill})
            edges.append({"source": node_id, "target": skill_ids[skill], "type": "DEMONSTRATES_SKILL"})
    return {"@context": {"name": "https://schema.org/name", "description": "https://schema.org/description", "url": "https://schema.org/url"}, "schemaVersion": 1, "reviewedOn": profile["reviewedOn"], "scope": profile["scope"], "nodes": nodes, "edges": edges}


def outputs(profile):
    validate(profile)
    return {"public-knowledge.json": profile, "public-graph.json": public_graph(profile)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if generated public files are out of date")
    args = parser.parse_args()
    for filename, payload in outputs(json.loads(PROFILE.read_text())).items():
        path = PUBLIC / filename
        text = json.dumps(payload, indent=2) + "\n"
        if args.check:
            if not path.exists() or path.read_text() != text:
                raise SystemExit(f"Public output is out of date: {filename}")
        else:
            PUBLIC.mkdir(parents=True, exist_ok=True)
            path.write_text(text)
    print("Public profile and graph are current." if args.check else "Exported reviewed public profile and graph.")


if __name__ == "__main__":
    main()
