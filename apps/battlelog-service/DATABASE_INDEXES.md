# Database Indexing for Optimal Pagination

## Required Indexes for Battle Pagination

To achieve optimal performance with the new pagination system, the following database indexes are recommended:

### Primary Indexes (High Priority)

```sql
-- 1. Composite index for default sorting (createdAt DESC + id)
CREATE INDEX CONCURRENTLY idx_battles_created_at_id_desc
ON battles (created_at DESC, id DESC);

-- 2. Composite index for ascending sorts
CREATE INDEX CONCURRENTLY idx_battles_created_at_id_asc
ON battles (created_at ASC, id ASC);

-- 3. Index for duration sorting
CREATE INDEX CONCURRENTLY idx_battles_duration_id
ON battles (duration DESC, id DESC);

-- 4. Index for type sorting
CREATE INDEX CONCURRENTLY idx_battles_type_id
ON battles (type, id DESC);
```

### Filter Indexes (Medium Priority)

```sql
-- 5. World filtering
CREATE INDEX CONCURRENTLY idx_battles_world_created_at
ON battles (world, created_at DESC, id DESC);

-- 6. Public battles filtering
CREATE INDEX CONCURRENTLY idx_battles_public_created_at
ON battles (public, created_at DESC, id DESC);

-- 7. User battles filtering
CREATE INDEX CONCURRENTLY idx_battles_user_created_at
ON battles (user_id, created_at DESC, id DESC);

-- 8. Character filtering
CREATE INDEX CONCURRENTLY idx_battles_character_created_at
ON battles (character_id, created_at DESC, id DESC);
```

### Composite Filter Indexes (Low Priority - Create as needed)

```sql
-- 9. World + Type filtering
CREATE INDEX CONCURRENTLY idx_battles_world_type_created_at
ON battles (world, type, created_at DESC, id DESC);

-- 10. Public + World filtering
CREATE INDEX CONCURRENTLY idx_battles_public_world_created_at
ON battles (public, world, created_at DESC, id DESC);

-- 11. User + World filtering
CREATE INDEX CONCURRENTLY idx_battles_user_world_created_at
ON battles (user_id, world, created_at DESC, id DESC);
```

### Battle Warriors Search Index

```sql
-- 12. Warrior name search (for search functionality)
CREATE INDEX CONCURRENTLY idx_battle_warriors_name_trgm
ON battle_warriors USING gin (name gin_trgm_ops);

-- Enable trigram extension first
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 13. Warrior name + battle relationship
CREATE INDEX CONCURRENTLY idx_battle_warriors_name_battle_id
ON battle_warriors (battle_id, name);
```

### Statistics and Estimation Indexes

```sql
-- 14. For table statistics (used by estimated counts)
ANALYZE battles;
ANALYZE battle_warriors;
ANALYZE legendary_bonuses;

-- Set up automatic statistics updates
ALTER TABLE battles SET (autovacuum_analyze_scale_factor = 0.05);
ALTER TABLE battle_warriors SET (autovacuum_analyze_scale_factor = 0.05);
```

## Index Usage by Query Pattern

### Offset Pagination Queries
- **Simple list**: Uses `idx_battles_created_at_id_desc`
- **World filter**: Uses `idx_battles_world_created_at`
- **User battles**: Uses `idx_battles_user_created_at`
- **Public battles**: Uses `idx_battles_public_created_at`

### Cursor Pagination Queries
- **Forward cursor**: Uses same indexes but with range conditions
- **Backward cursor**: May benefit from ASC indexes
- **Mixed sorting**: Uses appropriate sort field indexes

### Search Queries
- **Warrior name search**: Uses `idx_battle_warriors_name_trgm`
- **Complex filters**: May use multiple indexes with bitmap scans

## Performance Monitoring

### Query Analysis Commands

```sql
-- Check index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN ('battles', 'battle_warriors', 'legendary_bonuses')
ORDER BY idx_scan DESC;

-- Check table statistics for estimation accuracy
SELECT
  schemaname,
  tablename,
  n_tup_ins,
  n_tup_upd,
  n_tup_del,
  n_live_tup,
  n_dead_tup,
  last_analyze
FROM pg_stat_user_tables
WHERE tablename IN ('battles', 'battle_warriors', 'legendary_bonuses');

-- Analyze specific query performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM battles
WHERE world = 'fobos'
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

### Index Maintenance

```sql
-- Rebuild indexes if needed (during maintenance windows)
REINDEX INDEX CONCURRENTLY idx_battles_created_at_id_desc;

-- Check for unused indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND tablename IN ('battles', 'battle_warriors', 'legendary_bonuses');
```

## Migration Strategy

1. **Create indexes during low-traffic periods**
2. **Use `CONCURRENTLY` to avoid table locks**
3. **Monitor index creation progress**:
   ```sql
   SELECT
     pid,
     query,
     state,
     query_start
   FROM pg_stat_activity
   WHERE query LIKE '%CREATE INDEX%';
   ```

4. **Verify index usage after creation**:
   ```sql
   -- Wait 24-48 hours for statistics
   SELECT * FROM pg_stat_user_indexes
   WHERE indexname LIKE 'idx_battles%'
   ORDER BY idx_scan DESC;
   ```

## Expected Performance Improvements

- **Offset pagination**: 50-90% faster for typical queries
- **Cursor pagination**: 90-95% faster for large datasets
- **Filtered queries**: 70-95% faster depending on selectivity
- **Search queries**: 80-95% faster with trigram indexes
- **Count queries**: 95-99% faster with estimated counts