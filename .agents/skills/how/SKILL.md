---
name: how
description: Trace and explain how a subsystem, feature, request path, or package works. Use for code walkthroughs, ownership questions, onboarding explanations, runtime flows, and questions about where behavior lives in this monorepo.
---

# How

Build a working mental model from current code.

## Explore

1. Interpret the narrowest useful scope from the request. State the interpretation when ambiguity remains instead of blocking on a question.
2. Read `AGENTS.md`, relevant design guidance, and local package metadata.
3. If `.codegraph/` exists, use `codegraph explore` first. Trace entry points, calls, data transformations, side effects, and downstream consumers.
4. Use `codegraph node` for specific symbols or files. Use `rg` only for strings, configuration, generated data, or gaps outside the graph.
5. Verify framework behavior against the pinned version and current primary documentation when it matters.
6. Separate observed behavior from inferred intent.

Do not spawn subagents unless the user explicitly asks for delegation or parallel analysis.

## Explain

Lead with the subsystem's purpose and boundary. Then cover, as needed:

- key concepts and owners;
- the flow from trigger to observable effect;
- important files and packages;
- data and external-system boundaries;
- non-obvious constraints and failure modes.

Reference real symbols and paths, but do not turn the answer into annotated source code.
