# Career knowledge graph

This directory holds the graph builder, capability ontology, private viewer source, and reviewed public profile. The portfolio and skills Q&A use the public exports from this same repository.

## Public build

Edit `data/public-profile.json` after reviewing verified evidence, then run from the repository root:

```sh
python3 knowledge-graph/scripts/export_public.py
python3 knowledge-graph/scripts/export_public.py --check
node scripts/test-knowledge.mjs
python3 -m unittest discover -s knowledge-graph/tests
```

The exporter reads only the reviewed profile. It produces:

- `assets/data/public-knowledge.json`: summaries used by portfolio Q&A.
- `assets/data/public-graph.json`: public Person, Project, Evidence, and Skill nodes and their relationships.

Review remains explicit: private evidence never automatically becomes public, and repository signals never automatically become verified public claims.

## Private graph

Confidential state lives outside the checkout, by default in `~/.local/share/krishna-career-knowledge-graph/`. Override with `CAREER_GRAPH_STATE_DIR`. The builder rejects a state directory inside the public repository.

```text
config.json                     # private sourceRoot setting
 data/curated_evidence.json      # verified work evidence
 data/repository_inventory.json  # cached source inventory
 site/.openai/hosting.json       # existing private Site identity
 site/dist/                     # generated private graph and viewer
 archive/                       # recovery archive of the old repository
```

Set `CAREER_GRAPH_SOURCE_ROOT`, or `sourceRoot` in the private config. Run from the repository root:

```sh
# Scan the configured sources and rebuild the private graph.
python3 knowledge-graph/scripts/build_graph.py
# Rebuild with the cached inventory, without scanning sources.
python3 knowledge-graph/scripts/build_graph.py --use-cache
python3 knowledge-graph/scripts/test_graph.py
node --check knowledge-graph/viewer/app.js
```

The private graph retains provenance, confidence, capability relationships, and resume evidence. `inventoryGeneratedAt` records when source discovery last ran, independently of the graph build time. Open the generated viewer only through a trusted private/local environment. Do not serve the confidential state as part of the public portfolio.

## Deployment

The public portfolio continues to deploy from this repository through GitHub Pages. The existing private Site remains a separate deployment audience, with its identity in the external state's `site/.openai/hosting.json`.

For private Site updates, use the Sites workflow to open its deployment checkout outside this public repository, then copy the generated `site/dist/` into that checkout before packaging and publishing. Preserve the private Site's audience. The deployment checkout is generated publishing state; maintained application source lives here. Never sync confidential data or the legacy Git history to the public GitHub remote.

The private graph's application code is covered by the included MIT license. Confidential evidence is not distributed with the code.
