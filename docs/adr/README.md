# Architecture decision records

Each record states one decision that constrains how Lootlog is built, the
situation that led to it, and what it costs. Records describe the system as it
is; a change to one of these decisions updates its record in the same pull
request.

| Record                                                       | Decision                                               |
| ------------------------------------------------------------ | ------------------------------------------------------ |
| [0001](0001-organization-is-the-security-boundary.md)        | The Organization is the security boundary              |
| [0002](0002-one-writer-per-data-domain.md)                   | One writer per data domain                             |
| [0003](0003-http-contracts-generate-clients.md)              | HTTP contracts are the source of generated clients     |
| [0004](0004-fail-fast-messaging-and-idempotent-consumers.md) | Fail fast on broker loss and keep consumers idempotent |
| [0005](0005-game-client-runtime-bridge.md)                   | The game client stays behind a runtime bridge          |
| [0006](0006-immutable-release-artifacts.md)                  | Releases promote immutable artifacts                   |
