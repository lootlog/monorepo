# 0004. Fail fast on broker loss and keep consumers idempotent

Status: accepted

## Context

Services exchange facts over RabbitMQ. A consumer that loses its connection,
channel, or subscription and reconnects on its own can end up half
initialized: the process reports healthy while one of its queues is no longer
consumed. Accepted durable records must not disappear silently, so that state
is worse than a crash.

## Decision

Losing the RabbitMQ connection, a channel, or a broker subscription fails the
whole service process and closes its Effect scopes. The deployment supervisor
restarts it; the messaging adapter does not reconnect a partially initialized
application. Closing a consumer scope cancels its subscription and requeues
interrupted deliveries.

Every consumer is idempotent, because restarts and requeues redeliver
messages.

Messages that exhaust their retries go to a dead-letter queue. The application
exposes the queue depth as a metric and neither consumes nor logs the bodies.
Replay is an operator action, described in
[Operations](../operations.md#backend-artifacts-and-recovery).

## Consequences

- A messaging fault is visible as a restart instead of a silent stall.
- A broker outage restarts every consuming service, and their in-flight work
  is redelivered afterwards.
- Idempotency is a requirement on every consumer, including new ones.
- Recovering dead letters needs a person.
