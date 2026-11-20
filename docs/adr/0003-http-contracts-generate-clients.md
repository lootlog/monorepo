# 0003. HTTP contracts are the source of generated clients

Status: accepted

## Context

Several clients call the same services: the web app, the game client, the
public apps, and third-party integrations through the public SDK. Hand-written
request code in each of them drifts from the server, and the drift surfaces at
runtime, in the game, for players.

## Decision

Each service declares its HTTP API with Effect `HttpApi` and Effect schemas.
Those schemas validate requests on the server, and the TypeScript types are
inferred from them rather than written separately.

Each service exports an OpenAPI document that is committed to the repository.
`packages/client` and the public `packages/sdk` are generated from those
documents. Applications call the generated clients; they do not write request
code by hand.

Continuous integration regenerates the clients when a contract changes and
fails when the committed output differs.

## Consequences

- A contract change shows up as a reviewable diff in the OpenAPI document and
  the generated client, and as type errors in every caller.
- Changing a backend contract includes regenerating and committing the
  clients. The generated files are large.
- OpenAPI component identifiers are part of the public contract and stay
  stable for SDK consumers.
- The guarantee holds only for endpoints whose handlers are bound to the
  declared contract.
