"""Public export boundaries and portable private graph builds (synthetic fixtures only)."""
import copy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from export_public import PROFILE, outputs


class PublicExportTests(unittest.TestCase):
    def setUp(self):
        self.profile = json.loads(PROFILE.read_text())

    def test_public_graph_integrity(self):
        graph = outputs(self.profile)["public-graph.json"]
        ids = [n["@id"] for n in graph["nodes"]]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertTrue(all(e["source"] in ids and e["target"] in ids for e in graph["edges"]))
        self.assertEqual(len(self.profile["records"]), sum(n["@type"] in {"Project", "Evidence"} for n in graph["nodes"]))

    def test_reject_private_fields_and_links(self):
        for key, value in [("provenance", "internal-document"), ("path", "internal-path")]:
            profile = copy.deepcopy(self.profile)
            profile["records"][0][key] = value
            with self.assertRaises(ValueError):
                outputs(profile)
        for value in ["file:///private/source", "https://internal.invalid/source"]:
            profile = copy.deepcopy(self.profile)
            profile["records"][0]["source"]["url"] = value
            with self.assertRaises(ValueError):
                outputs(profile)

    def test_reject_unreviewed_and_raw_paths(self):
        for key, value in [("kind", "repository-signal"), ("summary", "/home/example/internal/source.md")]:
            profile = copy.deepcopy(self.profile)
            profile["records"][0][key] = value
            with self.assertRaises(ValueError):
                outputs(profile)


class PrivatePipelineTests(unittest.TestCase):
    def test_scan_fixture_and_rebuild_from_offline_cache(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            source = base / "source"
            repo = source / "demo"
            repo.mkdir(parents=True)
            (repo / "README.md").write_text("# Demo\nA synthetic LangGraph workflow with tests.\n")
            (repo / "package.json").write_text('{"name":"demo"}')
            (repo / "test_demo.py").write_text("assert True\n")
            state = base / "state"
            (state / "data").mkdir(parents=True)
            curated = {"person": {"id": "person:demo", "name": "Demo"}, "projects": [{"id": "project:demo", "name": "Demo", "repo": str(repo)}], "evidence": [{"id": "evidence:demo", "project": "project:demo", "status": "verified", "title": "Workflow", "claim": "Built a synthetic LangGraph workflow.", "skills": ["LangGraph"], "source": "Synthetic fixture"}]}
            (state / "data/curated_evidence.json").write_text(json.dumps(curated))
            env = {**os.environ, "CAREER_GRAPH_STATE_DIR": str(state), "CAREER_GRAPH_SOURCE_ROOT": str(source)}
            def run(script, *args):
                return subprocess.run([sys.executable, str(ROOT / "scripts" / script), *args], env=env, check=True, capture_output=True, text=True)
            run("build_graph.py")
            run("test_graph.py")
            inventory = state / "data/repository_inventory.json"
            cached = inventory.read_bytes()
            graph = json.loads((state / "site/dist/data/knowledge_graph.json").read_text())
            self.assertEqual(graph["counts"]["repositories"], 1)
            self.assertTrue((state / "site/dist/app.js").is_file())
            source.rename(base / "offline-source")
            run("build_graph.py", "--use-cache")
            self.assertEqual(inventory.read_bytes(), cached)
            run("test_graph.py")

    def test_reject_private_state_under_public_repo(self):
        env = {**os.environ, "CAREER_GRAPH_STATE_DIR": str(ROOT / ".private")}
        result = subprocess.run([sys.executable, str(ROOT / "scripts/build_graph.py"), "--use-cache"], env=env, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("outside the public repository", result.stderr)


if __name__ == "__main__":
    unittest.main()
