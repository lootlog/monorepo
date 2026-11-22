# 0017. Battle logs

Status: accepted

## Context

The battlelog service stores every battle the Game client submits and serves
lists, analytics and public battle links. The client retries submissions and
Margonem resends whole battles after a reload, so each battle and finishing
blow must be stored once, and no side effect may abort an accepted battle.

Battles live in TimescaleDB hypertables partitioned by UUIDv7 battle id, with
older chunks compressed. Queries and deletions must respect compression
quirks, partition-key comparisons and planner behaviour. Battles saved before
UUIDv7 ids still keep their timelines in R2 under legacy ids that public links
use, and those links are a compatibility contract.

## Decisions

### Battle identity

- **`createBattleId`** (`apps/battlelog/src/battles/battle-id.ts`): a battle id is a UUIDv7 whose first 48 bits are `createdAt` in Unix milliseconds, enforced by the database, so ordering by id orders battles by save time and the id serves as the hypertable partition key.
- **`boundaryId`** (`apps/battlelog/src/battles/battle-id.ts`): time bounds on battle ids are the smallest or largest UUIDv7 of a millisecond (`firstBattleIdAt`, `lastBattleIdAt`), because TimescaleDB compares its UUID partition column only with UUIDv7 values.
- **`resolveBattleId`** (`apps/battlelog/src/battles/catalog/battle-catalog.ts`): accepts legacy pre-UUIDv7 ids through `battle_legacy_ids`, because old public battle links use them.
- **`battleLegacyIds`** (`apps/battlelog/src/database/schema.ts`): keeps old public links and R2 object keys of pre-UUIDv7 battles; it can be dropped only together with the R2 bucket.

### Storage layout

- **Hypertables** (`apps/battlelog/src/database/schema.ts`): `battles` and `battle_timelines` are partitioned by battle id and created by the migration, because the Drizzle schema cannot express hypertables.
- **`encodeBattleEvents`** (`apps/battlelog/src/battles/battle-timeline.ts`): a timeline stores only the Margonem events the client submitted, as zstd-compressed JSON (about a third smaller than jsonb with TOAST); parsed moves and the timeline view are derived on read.
- **`getBattleObjectId`** and **`loadRawBattleData`** (`apps/battlelog/src/battles/battle-timeline-read.ts`): newer battles keep events in PostgreSQL `battle_timelines` and legacy ones in R2, so reads try PostgreSQL first and fall back to R2.
- **`battleWarriorFilters`** (`apps/battlelog/src/database/schema.ts`): duplicates filterable warrior columns keyed by owner with a covering primary key, because `battle_warriors` can only be read per battle. Rows are written and removed with their `battle_warriors` row and never change.

### Submission idempotency

- **`createBattle`** (`apps/battlelog/src/battles/submission/battle-creation.ts`): a `battle_submissions` row claims the battle id first; a concurrent retry that loses the claim reads the winner's battle, so retries never create duplicates. The character upsert beside it logs and absorbs its own failures, so it can never abort the transaction and lose an accepted battle.
- **`battleSubmissions`** (`apps/battlelog/src/database/schema.ts`): submission ids live in a plain table because a unique index on a hypertable must contain the battle id.
- **`createKillFingerprint`** and **`recordWeaponKills`** (`apps/battlelog/src/battles/weapon-kills/weapon-kills.ts`): weapon kills are fingerprinted by hashing the battle log up to the finishing blow, so a truncated log, the whole log and Margonem's resend agree. The server derives blows from the log, the client only names the weapon, and a re-submitted blow keeps its first weapon.
- **`weaponKills`** (`apps/battlelog/src/database/schema.ts`): a weapon's kill counter is the count of its rows for its current owner, so a weapon that changes hands starts from zero.

### Query planning

- **`ownedBy`** (`apps/battlelog/src/battles/analytics/battle-analytics-read.service.ts`): analytics resolve both participants from the owner's `battle_warrior_filters` rows, so a whole-history read touches only that owner's adjacent index entries.
- **`getHeadToHead`** (`apps/battlelog/src/battles/analytics/battle-analytics-read.service.ts`): keeps window-function rows narrow and resolves presentation data and statistics only for each opponent's latest record.
- **Analytics source filters** (`apps/battlelog/src/battles/analytics/battle-analytics-query.service.ts`): exclude unfinished battles with `unfinished IS DISTINCT FROM true`, because chunks compressed before the column existed hold only its default and TimescaleDB 2.24 fails vectorized boolean filters on them. Teams 0/0 cannot replace the flag, since draws are stored that way too.
- **`getCharacterIds`** (`apps/battlelog/src/battles/analytics/battle-analytics-query.service.ts`): is not cached separately inside analytics, because the outer cache owns the result and a nested cache generation could advance while the lookup reads an older repeatable-read snapshot.
- **`warriorExists`** (`apps/battlelog/src/battles/battle-warrior-query.ts`): correlates the EXISTS on the battle owner and wraps it with OFFSET 0 so PostgreSQL does not flatten it into a scan of every owner's warriors.
- **`latestBattleWarrior`** (`apps/battlelog/src/battles/catalog/battle-metadata.service.ts`): keeps the join inside LIMIT with OFFSET 0 so it runs battle-first, and an incomplete newest battle cannot hide the character's last recorded level and profession.
- **`minLevel`** and **`maxLevel`** (`apps/battlelog/src/battles/catalog/battle-list-filter.service.ts`): level bounds equal to the default 1–500 range are dropped, because they exclude nothing yet make the EXISTS probe warriors once per battle.

### Deletion

- **`makeBattleDeletion`** and **`removeBattles`** (`apps/battlelog/src/battles/deletion/battle-deletion.ts`): deletion removes a battle's rows from every hypertable in one transaction, since they have no foreign keys or cascades, and records the R2 cleanup intent in the same transaction so cleanup retries need no battle row. Only legacy battles still own an R2 object.
- **`removeBattles`** (`apps/battlelog/src/battles/deletion/battle-deletion.ts`): sets `timescaledb.max_tuples_decompressed_per_dml_transaction` to 0 for its transaction, so deleting a whole owner removes compressed batches without hitting the decompression limit.
- **`deleteBattlesData`** (`apps/battlelog/src/infrastructure/battle-object-storage.ts`): an R2 batch delete fails as a whole when an error lacks a key, since no object is then known removed, and a cache-eviction failure after removal keeps the durable cleanup intent so the retry is safe.

### HTTP contract

- **`withJsonBody`** and raw handlers (`apps/battlelog/src/http/battlelog-http.ts`): battle creation, battle update, weapon-kill recording and internal user-data deletion check authentication or the cleanup credential before decoding the body, and decode with domain schemas that normalize incomplete warrior snapshots the published DTO cannot describe.
- **`WeaponKillsControllerRecordWeaponKills`** (`apps/battlelog/src/http/battlelog-http.ts`): decodes with `onExcessProperty: "ignore"`, because clients loaded before the account proof was dropped still send `battleKey` and `margonemAccountProof`, and their kills must still count.
- **`PublicBattleResponseSchema`** (`apps/battlelog/src/battles/catalog/battle-response.ts`): omits `userId`, because public links are read without signing in and must not reveal the uploader.
- **`OptionalWarriorsRecordSchema`** (`apps/battlelog/src/battles/submission/create-battle.ts`): an incomplete warriors record decodes to a missing key rather than an undefined value, because raw battle responses encode events as JSON values.
- **Optional response fields** (`apps/battlelog/src/battles/analytics/battle-analytics-paging.service.ts`, `apps/battlelog/src/battles/analytics/pagination.service.ts`, `packages/battle-processor/src/statistics.ts`): are spread only when present (`...(cond && {...})`), because the contracts declare optional keys and reject a key present with an undefined value.

## Consequences

- Every new battle table must be partitioned by battle id, and every query bound on time must use UUIDv7 boundary ids.
- Filters on columns added after compression started must tolerate default-only compressed chunks; new boolean filters need a check against TimescaleDB's vectorized path.
- Legacy ids, `battle_legacy_ids` and the R2 bucket stay until public links to pre-UUIDv7 battles are deliberately retired.
- Planner fences such as OFFSET 0 are load-bearing; removing one needs a measured plan on production-sized data.
- New battle side effects must not run inside the creation transaction unless their failure is absorbed.
