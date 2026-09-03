# RabbitMQ Events CLI

Quick reference for publishing test events to RabbitMQ.

## Quick Start

### Interactive Mode (Recommended)

```bash
bun run events:publish
```

This launches an interactive menu where you can:

1. Select an event from the list
2. See it published with a nice spinner animation
3. View the published event details

### Non-Interactive Mode

```bash
# Publish a predefined event
bun run events:publish --event loot-created
bun run events:publish --event timer-expired
bun run events:publish --event member-joined
bun run events:publish --event battle-completed

# Publish a custom event
bun run events:publish \
  --exchange lootlog.events \
  --routing-key custom.test \
  --payload '{"foo": "bar"}'
```

## Available Events

All predefined events are located in `packages/cli/src/events/fixtures/`:

1. **loot-created** - New loot drop event
   - Exchange: `lootlog.events`
   - Routing Key: `loot.created`

2. **timer-expired** - Boss respawn timer
   - Exchange: `lootlog.events`
   - Routing Key: `timer.expired`

3. **member-joined** - Guild member joined
   - Exchange: `lootlog.events`
   - Routing Key: `member.joined`

4. **battle-completed** - Battle statistics
   - Exchange: `lootlog.events`
   - Routing Key: `battle.completed`

## Adding New Events

Create a new JSON file in `packages/cli/src/events/fixtures/`:

```json
{
  "exchange": "lootlog.events",
  "routingKey": "your.event.type",
  "payload": {
    "eventType": "your.event.type",
    "timestamp": "2025-12-01T12:00:00.000Z",
    "data": {
      "your": "data"
    }
  }
}
```

The CLI will automatically detect and load the new fixture.

## Requirements

1. **RABBITMQ_URI** must be set in your `.env`:

   ```env
   RABBITMQ_URI=amqp://user:password@localhost:5672
   ```

2. **RabbitMQ** must be running:
   ```bash
   docker compose up -d rabbitmq
   ```

## Debugging

### Check RabbitMQ is Running

```bash
docker compose ps rabbitmq
```

### Check Environment Variable

```bash
echo $RABBITMQ_URI
```

### View RabbitMQ Management UI

Open http://localhost:15672 (default credentials from your `.env`)

## Use Cases

- **Manual Testing**: Trigger event subscribers without using the API
- **Debugging**: Test how services handle specific events
- **Development**: Simulate events during local development
- **CI/CD**: Seed RabbitMQ with test data in pipelines

## Architecture

```
CLI (publish.ts)
  ↓
RabbitMQ Client (client.ts)
  ↓
RabbitMQ Exchange
  ↓
Event Subscribers (API, Discord Bot, Search, etc.)
```

## Examples

### Test loot indexing in Meilisearch

```bash
bun run events:publish --event loot-created
# → Search service indexes loot in Meilisearch
```

### Test Discord bot timer notifications

```bash
bun run events:publish --event timer-expired
# → Discord bot posts timer notification to Discord
```

### Test battle statistics processing

```bash
bun run events:publish --event battle-completed
# → Battlelog service processes stats
```

## Troubleshooting

### Error: "RABBITMQ_URI environment variable is not set"

Set the environment variable:

```bash
export RABBITMQ_URI=amqp://user:password@localhost:5672
```

Or add it to your `.env` file.

### Error: "Failed to connect to RabbitMQ"

1. Check RabbitMQ is running: `docker compose ps`
2. Check the URI is correct
3. Check network connectivity

### Event published but nothing happens

1. Check the event subscriber is running
2. Check the routing key matches the subscriber binding
3. Check RabbitMQ logs: `docker compose logs -f rabbitmq`
4. Check subscriber logs
