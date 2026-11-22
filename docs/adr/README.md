# Architecture decision records

Each record states one decision that constrains how Lootlog is built, the
situation that led to it, and what it costs. Records describe the system as it
is; a change to one of these decisions updates its record in the same pull
request.

Records 0007 onward collect the decisions that code comments used to carry,
grouped by area. Code carries no prose comments (`lootlog-comments/no-comments`
in `.oxlintrc.json`), so a decision that a maintainer could otherwise break or
undo belongs in the record for its area.

| Record                                                       | Decision                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| [0001](0001-organization-is-the-security-boundary.md)        | The Organization is the security boundary                          |
| [0002](0002-one-writer-per-data-domain.md)                   | One writer per data domain                                         |
| [0003](0003-http-contracts-generate-clients.md)              | HTTP contracts are the source of generated clients                 |
| [0004](0004-fail-fast-messaging-and-idempotent-consumers.md) | Fail fast on broker loss and keep consumers idempotent             |
| [0005](0005-game-client-runtime-bridge.md)                   | The game client stays behind a runtime bridge                      |
| [0006](0006-immutable-release-artifacts.md)                  | Releases promote immutable artifacts                               |
| [0007](0007-organization-access-and-privacy.md)              | Organization access and privacy rules                              |
| [0008](0008-identity-and-authentication.md)                  | Identity and authentication at the edge                            |
| [0009](0009-margonem-runtime-integration.md)                 | Margonem runtime integration rules                                 |
| [0010](0010-margonem-data-semantics.md)                      | Margonem data semantics                                            |
| [0011](0011-game-client-performance-budget.md)               | The game client stays inside Margonem's performance budget         |
| [0012](0012-game-client-ui-and-preferences.md)               | Game client UI coexists with Margonem and keeps stored preferences |
| [0013](0013-realtime-gateway-delivery.md)                    | Realtime delivery through the v1 gateway                           |
| [0014](0014-presence-and-online-time.md)                     | Presence, sightings and online time                                |
| [0015](0015-durable-messaging-and-outboxes.md)               | Durable messaging and outboxes                                     |
| [0016](0016-loot-and-kill-records.md)                        | Loot and kill records                                              |
| [0017](0017-battle-logs.md)                                  | Battle logs                                                        |
| [0018](0018-notifications-and-discord.md)                    | Notifications and Discord                                          |
| [0019](0019-coordination-features.md)                        | Coordination features                                              |
| [0020](0020-data-storage-and-compatibility.md)               | Data storage, caching and compatibility                            |
| [0021](0021-web-data-freshness.md)                           | Client data freshness and state                                    |
| [0022](0022-web-interface-behaviour.md)                      | Web interface behaviour                                            |
| [0023](0023-build-and-test-infrastructure.md)                | Build, tooling and test infrastructure                             |
