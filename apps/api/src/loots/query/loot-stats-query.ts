import { Effect, Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  and,
  asc,
  avg,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  min,
  ne,
  notInArray,
  sql,
  type SQL,
} from "drizzle-orm";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  itemSnapshotTable as item,
  lootItemTable as lootItem,
  lootNpcTable as lootNpc,
  lootSubmissionTable as submission,
  lootTable as loot,
  memberTable as member,
  npcSnapshotTable as npc,
  npcTypeEnum,
  organizationLootRecordTable as record,
} from "#src/database/drizzle/schema";
import type { NpcTypeEnum } from "@lootlog/schema/npc-type";

export class LootStatsQueryError extends TaggedErrorClass<LootStatsQueryError>()(
  "LootStatsQueryError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const runLootStatsQuery = <A, E>(
  operation: string,
  query: Effect.Effect<A, E>,
) =>
  query.pipe(
    Effect.mapError((cause) => new LootStatsQueryError({ operation, cause })),
    Effect.withSpan(operation, {
      attributes: { adapter: "loot-stats.postgres", retryCount: 0 },
    }),
  );

type LootStatsDatabase = Pick<
  typeof ApiDatabase.Service,
  "select" | "selectDistinct" | "$with" | "with"
>;

export const buildLootStatsQueries = (
  database: LootStatsDatabase,
  options: {
    guildId: string;
    dateFrom: Date | null;
    world?: string;
    npcTypes?: NpcTypeEnum[];
    excludeColossus?: boolean;
    visibility?: SQL;
    truncUnit: "hour" | "day" | "week";
  },
) => {
  const organization = and(
    eq(record.guildId, options.guildId),
    isNull(record.archivedAt),
    options.visibility,
  );

  const scope = and(
    organization,
    // Preserve the raw query's timestamptz binding, including non-UTC sessions.
    options.dateFrom
      ? gte(loot.createdAt, sql.param(options.dateFrom))
      : undefined,
    options.world ? eq(loot.world, options.world) : undefined,
  );

  const eligibleNpc = and(
    ne(npc.type, "COMMON"),
    // Keep the array parameter: expanding IN values changed join estimates on production-sized data.
    options.npcTypes?.length
      ? sql`${npc.type} = ANY(${sql.param(options.npcTypes)}::${sql.identifier(npcTypeEnum.enumName)}[])`
      : undefined,
    options.excludeColossus ? ne(npc.type, "COLOSSUS") : undefined,
  );

  const npcFilter = and(scope, eligibleNpc);

  const needsNpcFilter = Boolean(
    options.npcTypes?.length || options.excludeColossus,
  );

  const validLoots = database
    .$with("valid_loots")
    .as(
      database
        .selectDistinct({ lootId: loot.id })
        .from(loot)
        .innerJoin(record, eq(record.lootId, loot.id))
        .innerJoin(lootNpc, eq(lootNpc.lootId, loot.id))
        .innerJoin(npc, eq(npc.id, lootNpc.npcSnapshotId))
        .where(npcFilter),
    );

  const itemSource = needsNpcFilter ? database.with(validLoots) : database;

  const legendary =
    sql<number>`count(${lootItem.id}) filter (where ${item.rarity} = 'LEGENDARY')`.mapWith(
      Number,
    );

  const heroic =
    sql<number>`count(${lootItem.id}) filter (where ${item.rarity} = 'HEROIC')`.mapWith(
      Number,
    );

  const overviewFields = {
    total_loots: countDistinct(loot.id),
    total_items: count(lootItem.id),
    legendary_items: legendary,
    heroic_items: heroic,
    avg_item_level: avg(item.lvl),
  };

  const overviewBase = itemSource
    .select(overviewFields)
    .from(loot)
    .innerJoin(lootItem, eq(lootItem.lootId, loot.id))
    .innerJoin(item, eq(item.id, lootItem.itemSnapshotId))
    .$dynamic();

  const overview = needsNpcFilter
    ? overviewBase.innerJoin(validLoots, eq(validLoots.lootId, loot.id))
    : overviewBase.innerJoin(record, eq(record.lootId, loot.id)).where(scope);

  const rarityBase = itemSource
    .select({ rarity: item.rarity, count: count() })
    .from(loot)
    .innerJoin(lootItem, eq(lootItem.lootId, loot.id))
    .innerJoin(item, eq(item.id, lootItem.itemSnapshotId))
    .$dynamic();

  const byRarity = (
    needsNpcFilter
      ? rarityBase
          .innerJoin(validLoots, eq(validLoots.lootId, loot.id))
          .where(isNotNull(item.rarity))
      : rarityBase
          .innerJoin(record, eq(record.lootId, loot.id))
          .where(and(scope, isNotNull(item.rarity)))
  ).groupBy(item.rarity);

  const truncUnit = {
    hour: sql`'hour'`,
    day: sql`'day'`,
    week: sql`'week'`,
  }[options.truncUnit];

  // Both PostgreSQL drivers decode the native timestamp; a column codec adds a costly text cast.
  const timelineDate = sql<Date>`date_trunc(${truncUnit}, ${loot.createdAt})`;

  const timelineBase = itemSource
    .select({
      date: timelineDate.as("date"),
      rarity: item.rarity,
      count: count(),
    })
    .from(loot)
    .innerJoin(lootItem, eq(lootItem.lootId, loot.id))
    .innerJoin(item, eq(item.id, lootItem.itemSnapshotId))
    .$dynamic();

  const timeline = (
    needsNpcFilter
      ? timelineBase.innerJoin(validLoots, eq(validLoots.lootId, loot.id))
      : timelineBase.innerJoin(record, eq(record.lootId, loot.id)).where(scope)
  )
    // Group timestamps, not the driver's text-cast selection alias.
    .groupBy(timelineDate, item.rarity)
    .orderBy(asc(timelineDate));

  const rankedNpcs = database.$with("ranked_npcs").as(
    database
      .select({
        lootId: loot.id,
        npcId: npc.npcId,
        name: npc.name,
        type: npc.type,
        lvl: npc.lvl,
        icon: npc.icon,
        rank: sql<number>`row_number() over (partition by ${loot.id} order by case ${npc.type} when 'TITAN' then 1 when 'COLOSSUS' then 2 when 'HERO' then 3 when 'EVENT_HERO' then 4 when 'ELITE3' then 5 when 'ELITE2' then 6 when 'ELITE' then 7 else 8 end)`.as(
          "rn",
        ),
      })
      .from(loot)
      .innerJoin(record, eq(record.lootId, loot.id))
      .innerJoin(lootNpc, eq(lootNpc.lootId, loot.id))
      .innerJoin(npc, eq(npc.id, lootNpc.npcSnapshotId))
      .where(npcFilter),
  );

  const topNpcs = database
    .with(rankedNpcs)
    .select({
      npc_id: rankedNpcs.npcId,
      name: rankedNpcs.name,
      type: rankedNpcs.type,
      lvl: rankedNpcs.lvl,
      icon: rankedNpcs.icon,
      count: count(lootItem.id),
      legendary,
      heroic,
    })
    .from(rankedNpcs)
    .innerJoin(loot, eq(loot.id, rankedNpcs.lootId))
    .innerJoin(lootItem, eq(lootItem.lootId, loot.id))
    .innerJoin(item, eq(item.id, lootItem.itemSnapshotId))
    .where(
      and(
        eq(rankedNpcs.rank, 1),
        inArray(item.rarity, ["LEGENDARY", "HEROIC"]),
      ),
    )
    .groupBy(
      rankedNpcs.npcId,
      rankedNpcs.name,
      rankedNpcs.type,
      rankedNpcs.lvl,
      rankedNpcs.icon,
    )
    .orderBy(desc(legendary), desc(count(lootItem.id)))
    .limit(10);

  const contributorBase = itemSource
    .select({
      member_id: member.id,
      name: member.name,
      avatar: member.avatar,
      user_id: member.userId,
      count: countDistinct(loot.id),
      legendary:
        sql<number>`count(distinct ${loot.id}) filter (where ${item.rarity} = 'LEGENDARY')`.mapWith(
          Number,
        ),
      heroic:
        sql<number>`count(distinct ${loot.id}) filter (where ${item.rarity} = 'HEROIC')`.mapWith(
          Number,
        ),
      unique:
        sql<number>`count(distinct ${loot.id}) filter (where ${item.rarity} = 'UNIQUE')`.mapWith(
          Number,
        ),
      upgraded:
        sql<number>`count(distinct ${loot.id}) filter (where ${item.rarity} = 'UPGRADED')`.mapWith(
          Number,
        ),
    })
    .from(loot)
    .innerJoin(record, eq(record.lootId, loot.id))
    .innerJoin(submission, eq(submission.organizationLootRecordId, record.id))
    .innerJoin(member, eq(member.id, submission.memberId))
    .innerJoin(lootItem, eq(lootItem.lootId, loot.id))
    .innerJoin(item, eq(item.id, lootItem.itemSnapshotId))
    .$dynamic();

  const topContributors = (
    needsNpcFilter
      ? contributorBase
          .innerJoin(validLoots, eq(validLoots.lootId, loot.id))
          .where(organization)
      : contributorBase.where(scope)
  )
    .groupBy(member.id, member.name, member.avatar, member.userId)
    .orderBy(desc(countDistinct(loot.id)))
    .limit(10);

  const topItems = database
    .with(rankedNpcs)
    .select({
      item_id: item.itemId,
      hid: min(lootItem.hid),
      name: item.name,
      icon: item.icon,
      rarity: item.rarity,
      lvl: item.lvl,
      count: count(),
    })
    .from(rankedNpcs)
    .innerJoin(loot, eq(loot.id, rankedNpcs.lootId))
    .innerJoin(lootItem, eq(lootItem.lootId, loot.id))
    .innerJoin(item, eq(item.id, lootItem.itemSnapshotId))
    .where(
      and(
        eq(rankedNpcs.rank, 1),
        eq(item.rarity, "LEGENDARY"),
        notInArray(item.itemType, ["BLESS", "UPGRADE", "CONSUME"]),
      ),
    )
    .groupBy(item.itemId, item.name, item.icon, item.rarity, item.lvl)
    .orderBy(desc(count()))
    .limit(10);

  return { overview, byRarity, timeline, topNpcs, topContributors, topItems };
};
