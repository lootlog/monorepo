# 0002. One writer per data domain

Status: accepted

## Context

The backend is split into services with different load and failure profiles:
battle ingestion is write-heavy and stores large objects, the gateway holds
long-lived WebSocket connections, and activity data is time-series. A shared
database would let any service read or change another's tables, which couples
their schemas and migrations and hides who is responsible for a record.

## Decision

Each data domain has exactly one writer, and each service that stores data owns
its own database: `api`, `auth`, `battlelog`, `activity`, and `catalog`. A
service never reads or mutates another service's database. Services exchange
authenticated, versioned HTTP APIs or RabbitMQ facts instead.

Caches and search indexes are projections. They can be dropped and rebuilt
from the owning service's data, and no service treats them as a source of
truth.

A shared package may define a type that several services use. Defining the
type does not make the package, or any of those services, an owner of the
data.

A new deployable service is added only when a scaling, failure, data,
security, or release boundary justifies deploying it independently.

## Consequences

- A schema migration is local to one service and one deployment.
- Reads that span domains go through an API call or a projection maintained
  from events, and are eventually consistent.
- Consumers must tolerate redelivery, because facts are the only way state
  crosses a service boundary (see [0004](0004-fail-fast-messaging-and-idempotent-consumers.md)).
- Local development runs five databases.
