# Portfolio and career graph

Maintain both applications in this repository. Public portfolio files are at the root; graph code and viewer source are under `knowledge-graph/`.

- The GitHub repository and GitHub Pages are public. Confidential evidence, repository inventories, raw graph outputs, deployment credentials, and legacy graph Git history must remain outside this checkout.
- The default private state directory is `~/.local/share/krishna-career-knowledge-graph/`. Read `knowledge-graph/README.md` before private graph or Site work.
- Public skills and Q&A have one reviewed source: `knowledge-graph/data/public-profile.json`. Generate its exports with `python3 knowledge-graph/scripts/export_public.py`; do not edit generated JSON independently or copy the private graph into public assets.
- Before pushing changes to skills or graph code, run the public export check, Q&A tests, and graph pipeline fixture tests documented in the README. Only the scheduled private graph refresh should scan the configured confidential source tree; other tasks use its cached graph.
- Keep the existing private Site private. Publishing the public portfolio does not authorize publishing confidential evidence or changing the private Site's audience.
