# ADR 0007: RabbitMQ wire compatibility through a transport module

- Status: Accepted
- Date: 2026-09-01

## Context

RabbitMQ connects independently deployed services. Existing exchange names,
routing keys, queue arguments, payload shapes, retry queues, dead-letter queues,
and acknowledgement behavior are deployed contracts. Framework-specific AMQP
decorators obscured parts of that contract and coupled consumers to the old
application framework.

## Decision

Keep RabbitMQ as the asynchronous service boundary. Store canonical event
schemas and topology in `@lootlog/protocol`; implement scoped connections,
publisher confirms, consumers, retry routing, dead-lettering, ack, and nack in
`@lootlog/messaging`.

Do not replace RabbitMQ events with Effect RPC. Preserve unversioned payloads
byte-for-byte where they are already deployed, and add versions only through an
explicit coordinated contract change. Consumers must remain idempotent when a
message can be redelivered.

## Consequences

- Queue topology can be tested without starting an application framework.
- Transport failures remain typed Effect failures while wire payloads stay
  independent of Effect internals.
- Known delivery windows remain documented until a separate decision changes
  them, including Activity deduplication and Discord result republishing.
- Integration tests require real RabbitMQ to prove confirms, redelivery, retry,
  and dead-letter behavior.
