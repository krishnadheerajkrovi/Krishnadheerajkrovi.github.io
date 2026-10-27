# Personal portfolio

Static portfolio hosted on GitHub Pages at https://krishnadheerajkrovi.me.

## Preview and checks

Run `python3 -m http.server 4180`, then open http://localhost:4180.
Run `node scripts/test-knowledge.mjs` to check Q&A retrieval and public data boundaries.

## Public knowledge base

`assets/data/public-knowledge.json` is a deliberately reviewed subset of the private career knowledge graph. It contains public capability summaries and links to public repositories. Portfolio Q&A retrieves these exact summaries in the visitor's browser; it does not call an LLM, store questions, or connect to private repositories.

Update summaries manually after reviewing verified evidence. Never copy the private graph, repository inventory, internal paths, project names, business context, metrics, or source files into this repository. The public subset is not automatically synchronized. `reviewedOn` records the review date of this subset.

The page remains readable without JavaScript. Project filters and Q&A require JavaScript; source links and the JSON download remain available without it.
