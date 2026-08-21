---
name: blast-radius
description: Assess what a code change can break beyond its direct diff and prove the key safety assumptions with executable evidence. Use for risky reviews, cross-workspace changes, generated contracts, migrations, shared packages, queues, WebSockets, or requests such as "what could this break?".
---

# Blast radius

Find the indirect failure modes before a change ships.

## Workflow

1. Read the diff, affected symbols, package boundaries, schemas, generated artifacts, and relevant tests.
2. If `.codegraph/` exists, use CodeGraph before text search to trace callers, callees, and package relationships.
3. State the one or two facts that make the change safe. Do not hide assumptions inside a long risk list.
4. Trace where symbol search stops: OpenAPI contracts, database columns, serialized events, Redis keys, queue payloads, generated clients, environment variables, and consumers in other workspaces.
5. Classify each meaningful risk by likelihood, impact, and the cheapest check that would expose it.
6. Prove the key safety fact with the narrowest real check available: a focused test, a script against production code, an existing running application, or direct inspection of a generated artifact. Do not start an application in this repository.
7. Run adjacent validation in proportion to the risk.

## Report

Return:

- what behavior changed;
- the key safety fact and the strongest evidence reached;
- confirmed risks with concrete paths and checks;
- risks investigated and cleared;
- the smallest pre-merge verification still needed.

Mark an assumption as unproven when it cannot be checked cheaply. A plausible explanation is not proof.
