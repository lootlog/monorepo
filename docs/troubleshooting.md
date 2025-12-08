# Troubleshooting Guide

## Database Issues

### Connection Failed

```bash
docker compose ps                    # Check containers running
docker compose logs -f lootlog-db   # Check DB logs
docker compose down && docker compose up -d  # Restart
```

### Prisma Client Errors

```bash
pnpm api:generate         # Regenerate after schema changes
pnpm battlelog:generate
pnpm activity:generate
```

### Migration Issues

```bash
cd apps/api
pnpm prisma migrate reset   # Reset DB (DESTRUCTIVE - dev only)
pnpm api:migrate:dev        # Apply pending migrations
```

## Auth Issues

### 401 Unauthorized

- Check headers `x-auth-discord-id` and `x-auth-user-id` are present
- In production, verify Traefik forward auth is configured

### 403 Forbidden (PermissionsGuard)

Check:
1. Member exists: `SELECT * FROM "Member" WHERE "userId" = 'discordId' AND "guildId" = 'guildId'`
2. Member is active: `active = true`
3. Roles have required permission
4. Clear stale cache: `redis-cli DEL "permissions:userId:guildId"`

## Redis Issues

### Connection Errors

```bash
redis-cli -h localhost -p 6379 -a password PING
redis-cli INFO clients
```

### Clear Specific Cache

```bash
redis-cli DEL "guild:123"
redis-cli DEL "permissions:userId:guildId"
redis-cli KEYS "permissions:*:guildId" | xargs redis-cli DEL  # Pattern delete
```

## RabbitMQ Issues

- Management UI: http://localhost:15672
- Check queues: `rabbitmqctl list_queues`
- Check bindings: `rabbitmqctl list_bindings`

## Timer Race Conditions

`TIMER_RACE_CONDITION` error is expected when multiple clients submit same timer. Built-in locking handles this - client should retry.

## Stale Member Data

`isStale: true` in response means Discord API was unavailable. Cached data is returned. Will refresh automatically when Discord API is available.

## Port Reference

| Service | Port |
|---------|------|
| PostgreSQL (Users) | 5432 |
| PostgreSQL (Lootlog) | 5433 |
| PostgreSQL (Battlelog) | 5434 |
| PostgreSQL (Activity) | 5435 |
| RabbitMQ AMQP | 5672 |
| RabbitMQ Management | 15672 |
| Redis | 6379 |
| Meilisearch | 7700 |
