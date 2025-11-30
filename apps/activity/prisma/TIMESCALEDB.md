# TimescaleDB Integration Guide

This schema is prepared for TimescaleDB integration to optimize time-series queries.

**Data Retention**: Activities are automatically deleted after 14 days.

## Prerequisites

1. PostgreSQL with TimescaleDB extension installed
2. Superuser access to enable the extension (one-time setup)

## Setup Steps

### 1. Enable TimescaleDB Extension

Connect as superuser and enable TimescaleDB:

```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

### 2. Run Initial Migration

```bash
pnpm activity:migrate:dev
```

### 3. Convert to Hypertable

After the migration completes, run the TimescaleDB setup:

```bash
psql -U your_user -d your_database -f apps/activity/prisma/timescaledb.sql
```

Or connect to the database and run:

```sql
SELECT create_hypertable(
  '"Activity"',
  'createdAt',
  chunk_time_interval => INTERVAL '7 days'
);
```

## Schema Optimizations for TimescaleDB

### Timestamp with Timezone

- `createdAt` uses `@db.Timestamptz` for proper timezone handling

### Composite Indexes

Indexes are optimized for time-series queries:

- `[createdAt DESC, guildId]` - Query recent activities by guild
- `[createdAt DESC, userId]` - Query recent activities by user
- `[createdAt DESC, type]` - Query recent activities by type
- `[guildId, createdAt DESC]` - Query guild activities in time range

### Query Patterns

These indexes optimize queries like:

```typescript
// Recent activities for a guild
prisma.activity.findMany({
  where: { guildId: 'xxx' },
  orderBy: { createdAt: 'desc' },
  take: 100
});

// Activities in time range
prisma.activity.findMany({
  where: {
    guildId: 'xxx',
    createdAt: {
      gte: new Date('2025-01-01'),
      lte: new Date('2025-01-31')
    }
  }
});
```

## Optional Features

### Compression (Recommended for production)

Compress old data to save storage:

```sql
ALTER TABLE "Activity" SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'guildId,type'
);

SELECT add_compression_policy('"Activity"', INTERVAL '30 days');
```

### Retention Policy (Enabled by default - 14 days)

Data older than 14 days is automatically dropped. This is already configured in `timescaledb.sql`.

To modify the retention period:

```sql
-- Remove existing policy
SELECT remove_retention_policy('"Activity"');

-- Add new policy with different interval
SELECT add_retention_policy('"Activity"', INTERVAL '30 days');
```

### Continuous Aggregates

Pre-compute hourly statistics:

```sql
CREATE MATERIALIZED VIEW activity_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', "createdAt") AS bucket,
  "guildId",
  "type",
  COUNT(*) as count
FROM "Activity"
GROUP BY bucket, "guildId", "type";

SELECT add_continuous_aggregate_policy('activity_hourly',
  start_offset => INTERVAL '3 hours',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');
```

## Docker Compose

To use TimescaleDB in development, update `docker-compose.yml`:

```yaml
activity-log-db:
  image: timescale/timescaledb:latest-pg17
  environment:
    POSTGRES_USER: activity_user
    POSTGRES_PASSWORD: activity_password
    POSTGRES_DB: activity_db
  ports:
    - "5435:5432"
  volumes:
    - activity-log-db:/var/lib/postgresql/data
```

## Performance Benefits

- **Fast time-range queries**: Automatic partitioning by time (7-day chunks)
- **Reduced storage**: Compression can save 90%+ storage
- **Auto-maintenance**: Automatic chunk management and 14-day data retention
- **Continuous aggregates**: Real-time analytics without manual materialization
- **Predictable storage**: Maximum 14 days of data = predictable disk usage
