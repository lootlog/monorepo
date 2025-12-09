# Gateway Service

Real-time WebSocket service for live event streaming to clients.

## Tech Stack

- NestJS with Socket.IO
- RabbitMQ for event consumption
- Redis for session management
- No direct database access

## Commands

```bash
pnpm dev      # Start with hot reload
pnpm build    # Build service
pnpm test     # Run tests
```

## Key Files

- `src/gateway/gateway.ts` - WebSocket gateway, connection handlers
- `src/gateway/gateway.service.ts` - Event filtering by user roles
- `src/gateway/gateway-queue.handler.ts` - RabbitMQ message handlers with retry logic
- `src/gateway/enums/` - Event names, routing keys, queue names

## Event Flow

RabbitMQ → Queue handlers → GatewayService (permission filtering) → Socket.IO emit to eligible clients.

## Socket Metadata

Each connection stores: discordId, userId, sessionId, platform, guild list. Events filtered based on user permissions (owner, admin, member).

## Event Types

Supports 19+ event types: timers, reservations, chat, notifications, game events (hero kills, map status, rankings).
