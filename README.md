# Personal portfolio and career knowledge graph

One source repository for the portfolio at https://krishnadheerajkrovi.me, public skills Q&A, and the career graph engine.

```text
index.html, assets/css/, assets/js/  # public portfolio and Q&A
assets/data/                        # generated reviewed public profile and graph
knowledge-graph/data/                # ontology and reviewed public profile source
knowledge-graph/scripts/             # private graph builder and public exporter
knowledge-graph/viewer/              # source for the existing private graph UI
knowledge-graph/tests/               # synthetic pipeline and export-boundary tests
```

Confidential evidence and full graph data stay outside this public repository. See [the graph guide](knowledge-graph/README.md) for private storage, refresh, and publishing instructions. The old standalone graph repository is retained as a recovery archive in the private state directory; its history is not imported into this public repository.

## Preview and checks

Run `python3 -m http.server 4180`, then open http://localhost:4180.

```sh
python3 knowledge-graph/scripts/export_public.py --check
python3 -m unittest discover -s knowledge-graph/tests
node scripts/test-knowledge.mjs
```

## Update public skills

Edit `knowledge-graph/data/public-profile.json` after reviewing verified evidence, then run `python3 knowledge-graph/scripts/export_public.py`. This generates both the public graph and the summaries consumed by Q&A from one reviewed source.

Portfolio Q&A retrieves those summaries in the visitor's browser. It does not call an LLM, store questions, or connect to private repositories. Public exports are deterministic and require review before new evidence is added. The page stays readable without JavaScript; project filters and Q&A require JavaScript.
