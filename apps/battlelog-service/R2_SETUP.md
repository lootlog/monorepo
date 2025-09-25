# Cloudflare R2 Setup for Battlelog Service

## Overview

The battlelog service now uses a hybrid approach combining PostgreSQL database and Cloudflare R2 storage:

- **Database**: Stores processed battle analysis and statistics for fast querying
- **R2**: Stores complete raw battle events for detailed replay/analysis
- Battle records are created in the database first (auto-generated ID)
- Raw battle data is then stored in R2 using the database ID
- This keeps structured data queryable while preserving complete battle logs

## Configuration

Add these environment variables to your `.env` file:

```bash
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_REGION=auto
R2_BUCKET_NAME=lootlog-battles
```

## Getting Cloudflare R2 Credentials

1. Log in to Cloudflare Dashboard
2. Go to R2 Object Storage
3. Create a new bucket (e.g., `lootlog-battles`)
4. Go to "Manage R2 API tokens"
5. Create a new API token with R2 permissions
6. Use the credentials in your environment variables

## API Endpoints

### Create Battle (stores in DB + R2)
```
POST /battles
Authorization: Required
```

Returns battle analysis, database record, and battleId for later raw data retrieval.

### List Battles (with optimized pagination and filtering)
```
GET /battles?page=1&limit=20&world=fobos&type=1v1&public=true&search=PlayerName
Authorization: Required
```

#### Pagination Strategies

**Offset-based pagination (traditional):**
```
GET /battles?page=2&limit=50&strategy=offset
```

**Cursor-based pagination (high performance):**
```
GET /battles?cursor=eyJpZCI6IjEyMyIsImNyZWF0ZWRBdCI6IjIwMjMtMDktMjhUMTA6MjM6MTIuMDAwWiJ9&size=50&strategy=cursor
```

**Auto-strategy (recommended):**
```
GET /battles?page=1&limit=20&strategy=auto
```

#### Query Parameters

**Pagination:**
- `strategy` (enum): `offset` | `cursor` | `auto` (default: `auto`)
- `page` (number): Page number for offset pagination (default: 1)
- `limit` (number): Items per page for offset pagination (default: 20, max: 100)
- `cursor` (string): Base64 encoded cursor for cursor pagination
- `size` (number): Items per page for cursor pagination (default: 20, max: 100)

**Sorting:**
- `sortBy` (enum): `createdAt` | `updatedAt` | `duration` | `type` (default: `createdAt`)
- `sortOrder` (enum): `asc` | `desc` (default: `desc`)

**Performance Options:**
- `includeTotal` (boolean): Include total count (default: `true`)
- `estimateTotal` (boolean): Use estimated count for better performance (default: `false`)

**Filters:**
- `world` (string): Filter by game world
- `type` (string): Filter by battle type (e.g., "1v1", "2v2")
- `userId` (string): Filter battles by specific user
- `public` (boolean): Filter by public battles only
- `characterId` (string): Filter by character ID
- `search` (string): Search by warrior names

#### Response Format

```json
{
  "battles": [...],
  "pagination": {
    // Offset pagination response
    "page": 2,
    "limit": 20,
    "total": 1500,
    "totalPages": 75,
    "hasNext": true,
    "hasPrev": true

    // OR cursor pagination response
    "size": 20,
    "hasNext": true,
    "hasPrev": true,
    "nextCursor": "eyJpZCI6IjQ1NiIsImNyZWF0ZWRBdCI6IjIwMjMtMDktMjhUMTI6MzQ6NTYuMDAwWiJ9",
    "total": 1500  // Optional for performance
  },
  "meta": {
    "strategy": "cursor",
    "performance": {
      "queryTime": 45,
      "countTime": 12,
      "totalItems": 1500,
      "estimatedTotal": false
    }
  }
}
```

### Get Battle (from database)
```
GET /battles/:battleId
Authorization: Required
```

Retrieves processed battle data with warriors and stats from the database.

### Get Raw Battle Data (from R2)
```
GET /battles/:battleId/raw
Authorization: Required
```

Retrieves the complete raw battle data from R2 for detailed analysis.

### Update Battle (owner only)
```
PATCH /battles/:battleId
Authorization: Required (must be battle owner)
Content-Type: application/json

{
  "public": true
}
```

Only allows changing the public visibility of the battle.

### Delete Battle (owner only)
```
DELETE /battles/:battleId
Authorization: Required (must be battle owner)
```

Deletes the battle from both database and R2 storage. Only the battle owner can delete their battles.

## Pagination Performance Guide

### Strategy Selection

**Auto Strategy (Recommended)**
- Automatically chooses the best pagination method
- Uses offset pagination for small datasets and early pages
- Switches to cursor pagination for large datasets or high page numbers
- Provides optimal balance of performance and usability

**When to Use Offset Pagination**
- ✅ Small datasets (< 10K records)
- ✅ First few pages (page < 50)
- ✅ UI requires page numbers and jump-to-page functionality
- ✅ Total count is essential for user experience
- ❌ Large datasets with high page numbers (slow)

**When to Use Cursor Pagination**
- ✅ Large datasets (> 10K records)
- ✅ Real-time feeds with frequent updates
- ✅ Mobile apps with infinite scroll
- ✅ High-performance APIs where speed is critical
- ❌ UI requires exact page numbers or jump-to-page

### Performance Optimizations

**Estimated Counts**
```
GET /battles?estimateTotal=true
```
- Uses PostgreSQL table statistics instead of COUNT(*)
- ~95-99% faster for large datasets
- Accuracy within 5-10% for most queries
- Recommended for dashboards and analytics

**Skip Total Counts**
```
GET /battles?includeTotal=false
```
- Eliminates count query entirely
- Fastest option for pure pagination
- Recommended for infinite scroll interfaces

**Database Indexing**
- See `DATABASE_INDEXES.md` for required indexes
- Properly indexed queries are 50-95% faster
- Essential for production performance

### Performance Benchmarks

| Dataset Size | Strategy | Page 1 | Page 50 | Page 500 |
|--------------|----------|--------|---------|----------|
| 10K records  | Offset   | 15ms   | 25ms    | 150ms    |
| 10K records  | Cursor   | 12ms   | 15ms    | 12ms     |
| 100K records| Offset   | 45ms   | 200ms   | 2000ms   |
| 100K records| Cursor   | 20ms   | 25ms    | 20ms     |
| 1M records   | Offset   | 200ms  | 2000ms  | 20000ms  |
| 1M records   | Cursor   | 50ms   | 60ms    | 55ms     |

*Benchmarks assume proper database indexing*

## Authorization

The API uses a hierarchical authorization system:

### AuthGuard (Global)
- All endpoints require user authentication
- Sets `userId` in the request context

### BattleOwnerGuard (Specific endpoints)
- Applied to `PATCH` and `DELETE` operations
- Ensures only the battle owner can modify/delete their battles
- Automatically returns `403 Forbidden` for non-owners
- Returns `404 Not Found` if battle doesn't exist

### Access Control Rules
- **Create**: Any authenticated user
- **Read**: Any authenticated user (single battle or list)
- **Update**: Battle owner only (can only change `public` field)
- **Delete**: Battle owner only (removes from both DB and R2)

## Data Structure

### Database Structure

The database stores processed battle data including:
- Battle metadata (duration, type, winner/loser)
- Warrior statistics (damage, healing, combat stats)
- Legendary bonuses for each warrior

### R2 Structure

Raw battle data is stored in R2 as:
```json
{
  "battleId": "cm7h5k9l20001xyz123456789",
  "timestamp": "2023-09-28T10:23:12.000Z",
  "rawData": {
    // Complete CreateBattleDto data with all events
  }
}
```

Files are stored as: `battles/{battleId}.json` where `battleId` is the database-generated ID.