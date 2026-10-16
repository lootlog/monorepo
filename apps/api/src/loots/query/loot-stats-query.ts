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
  exists,
  gte,
  inArray,
  isNull,
  min,
  ne,
  notInArray,
  or,
  sql,
  type SQL,
  type SQLWrapper,
} from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  itemSnapshotTable as item,
  lootItemTable as lootItem,
  lootNpcTable as lootNpc,
  lootPlayerTable as lootPlayer,
  playerSnapshotTable as player,
  userCharactersLootlogSettingsTable as settings,
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

const legendary =
  sql<number>`count(${lootItem.id}) filter (where ${item.rarity} = 'LEGENDARY')`.mapWith(
    Number,
  );

const heroic =
  sql<number>`count(${lootItem.id}) filter (where ${item.rarity} = 'HEROIC')`.mapWith(
    Number,
  );

/** Orders a loot's NPCs strongest first; the strongest one names the loot. */
const strongestNpcFirst = sql`case ${npc.type} when 'TITAN' then 1 when 'COLOSSUS' then 2 when 'HERO' then 3 when 'EVENT_HERO' then 4 when 'ELITE3' then 5 when 'ELITE2' then 6 when 'ELITE' then 7 else 8 end`;

/** Legendary items that count as a find; blessings, upgrades and consumables do not. */
const rankedLegendary = and(
  eq(item.rarity, "LEGENDARY"),
  notInArray(item.itemType, ["BLESS", "UPGRADE", "CONSUME"]),
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
        rank: sql<number>`row_number() over (partition by ${loot.id} order by ${strongestNpcFirst})`.as(
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

  // A semi-join keeps one row per loot item however many of the loot's NPCs qualify.
  const topItems = database
    .select({
      item_id: item.itemId,
      hid: min(lootItem.hid),
      name: item.name,
      icon: item.icon,
      rarity: item.rarity,
      lvl: item.lvl,
      count: count(),
    })
    .from(loot)
    .innerJoin(record, eq(record.lootId, loot.id))
    .innerJoin(lootItem, eq(lootItem.lootId, loot.id))
    .innerJoin(item, eq(item.id, lootItem.itemSnapshotId))
    .where(
      and(
        scope,
        rankedLegendary,
        exists(
          new QueryBuilder()
            .select({ id: lootNpc.id })
            .from(lootNpc)
            .innerJoin(npc, eq(npc.id, lootNpc.npcSnapshotId))
            .where(and(eq(lootNpc.lootId, loot.id), eligibleNpc)),
        ),
      ),
    )
    .groupBy(item.itemId, item.name, item.icon, item.rarity, item.lvl)
    .orderBy(desc(count()))
    .limit(10);

  return { overview, timeline, topNpcs, topContributors, topItems };
};

/**
 * Loots of fights one of the user's registered characters took part in, kept
 * when an Organization of theirs holds the loot and lets them see it. A loot in
 * several Organizations counts once.
 */
export const buildUserLootIdsQuery = (
  database: LootStatsDatabase,
  options: {
    discordId: string;
    /** Start of the first counted Europe/Warsaw day. */
    start: string;
    world?: string;
    characterId?: number;
    /** Matches a visible Organization record of `LootPlayer.lootId`. */
    visibleRecord: SQL;
  },
) => {
  // Settings ids are text; only numeric ones can name a Margonem character.
  const numeric = (column: typeof settings.accountId) =>
    sql`${column} ~ '^[0-9]{1,9}$'`;

  const characters = database.$with("user_characters").as(
    database
      .select({
        accountId: sql<number>`${settings.accountId}::int`.as("account_id"),
        characterId: sql<number>`${settings.characterId}::int`.as(
          "character_id",
        ),
      })
      .from(settings)
      .where(
        and(
          eq(settings.userId, options.discordId),
          numeric(settings.accountId),
          numeric(settings.characterId),
        ),
      ),
  );

  // A character's fights span its whole history, and only LootPlayer's
  // player index reaches them. Loot ids grow with createdAt, so the first id
  // of the period bounds it without reading each loot; loots committed out of
  // order within a moment of the period's start may fall on the other side.
  const firstLootId = database
    .select({ id: loot.id })
    .from(loot)
    .where(
      gte(
        loot.createdAt,
        sql`${options.start}::timestamptz at time zone 'UTC'`,
      ),
    )
    .orderBy(asc(loot.createdAt))
    .limit(1);

  return database
    .with(characters)
    .selectDistinct({ lootId: lootPlayer.lootId })
    .from(characters)
    .innerJoin(
      player,
      and(
        eq(player.accountId, characters.accountId),
        eq(player.characterId, characters.characterId),
      ),
    )
    .innerJoin(lootPlayer, eq(lootPlayer.playerSnapshotId, player.id))
    .innerJoin(loot, eq(loot.id, lootPlayer.lootId))
    .where(
      and(
        // Dialog rewards list the player too, but only fights count.
        eq(loot.source, "FIGHT"),
        // A loot's players are snapshots of its world.
        options.world ? eq(player.world, options.world) : undefined,
        options.characterId === undefined
          ? undefined
          : eq(player.characterId, options.characterId),
        gte(lootPlayer.lootId, firstLootId),
        exists(
          new QueryBuilder()
            .select({ id: record.id })
            .from(record)
            .where(
              and(
                eq(record.lootId, lootPlayer.lootId),
                isNull(record.archivedAt),
                options.visibleRecord,
              ),
            ),
        ),
      ),
    );
};

/**
 * What the user's characters caught among the chosen loots: every item of a
 * loot they fought alone, and the items its loot share gives them otherwise.
 */
export const buildUserCaughtItemsQueries = (
  database: LootStatsDatabase,
  options: {
    lootIds: number[];
    /** Loot share keys: a character id followed by its account id. */
    shareKeys: string[];
  },
) => {
  const selected = (lootId: SQLWrapper) =>
    sql`${lootId} = ANY(${sql.param(options.lootIds)}::int[])`;

  // The loot's only player, who caught every item.
  const soloLoots = database
    .select({
      lootId: lootPlayer.lootId,
      accountId: min(player.accountId),
      characterId: min(player.characterId),
    })
    .from(lootPlayer)
    .innerJoin(player, eq(player.id, lootPlayer.playerSnapshotId))
    .where(selected(lootPlayer.lootId))
    .groupBy(lootPlayer.lootId)
    .having(eq(count(), 1));

  const shareKeys = sql`${sql.param(options.shareKeys)}::text[]`;

  // The loot's shared items of every key of the user, as one array of
  // [share key, hid] pairs.
  const sharedArray = sql`(
    select coalesce(jsonb_agg(jsonb_build_array(share_key, shared.hid)), '[]'::jsonb)
    from unnest(${shareKeys}) as share_key,
      jsonb_array_elements(
        case jsonb_typeof(${loot.lootShare} -> share_key)
          when 'array' then ${loot.lootShare} -> share_key
          else '[]'::jsonb
        end
      ) as shared(hid)
  )`;

  const sharedItems = database
    .select({
      share: sql<
        [shareKey: string, hid: string]
      >`jsonb_array_elements(${sharedArray})`.as("share"),
    })
    .from(loot)
    .where(
      and(
        selected(loot.id),
        sql`jsonb_exists_any(${loot.lootShare}, ${shareKeys})`,
      ),
    );

  return { soloLoots, sharedItems };
};

/** The statistics of loots chosen once by buildUserLootIdsQuery. */
export const buildUserLootStatsQueries = (
  database: LootStatsDatabase,
  options: {
    lootIds: number[];
    /** Loots of a lone character of the user, who took every item. */
    soloLootIds: number[];
    /** Items the loot shares give the user's characters. */
    sharedHids: string[];
    truncUnit: "day" | "week";
  },
) => {
  const selected = (lootId: SQLWrapper) =>
    sql`${lootId} = ANY(${sql.param(options.lootIds)}::int[])`;

  // Chosen by buildUserCaughtItemsQueries; the driver cannot type an empty
  // array parameter.
  const caught =
    or(
      options.soloLootIds.length
        ? sql`${lootItem.lootId} = ANY(${sql.param(options.soloLootIds)}::int[])`
        : undefined,
      options.sharedHids.length
        ? sql`${lootItem.hid} = ANY(${sql.param(options.sharedHids)}::text[])`
        : undefined,
    ) ?? sql`false`;

  const overview = database
    .select({
      total_loots: countDistinct(lootItem.lootId),
      total_items: count(lootItem.id),
      legendary_items: legendary,
      heroic_items: heroic,
      avg_item_level: avg(item.lvl),
    })
    .from(lootItem)
    .innerJoin(loot, eq(loot.id, lootItem.lootId))
    .innerJoin(item, eq(item.id, lootItem.itemSnapshotId))
    .where(selected(lootItem.lootId));

  const truncUnit = { day: sql`'day'`, week: sql`'week'` }[options.truncUnit];

  // Days and weeks follow the Europe/Warsaw calendar, as the kill statistics do.
  const timelineDate = sql<Date>`date_trunc(${truncUnit}, ${loot.createdAt} at time zone 'UTC' at time zone 'Europe/Warsaw')`;

  const timeline = database
    .select({
      date: timelineDate.as("date"),
      rarity: item.rarity,
      count: count(),
    })
    .from(loot)
    .innerJoin(lootItem, eq(lootItem.lootId, loot.id))
    .innerJoin(item, eq(item.id, lootItem.itemSnapshotId))
    .where(selected(loot.id))
    .groupBy(timelineDate, item.rarity)
    .orderBy(asc(timelineDate));

  const rankedNpcs = database.$with("ranked_npcs").as(
    database
      .select({
        lootId: lootNpc.lootId,
        // Kills record the runtime spawn id that a loot reports beside its catalog id.
        npcId: sql<number>`coalesce(${lootNpc.runtimeNpcId}, ${npc.npcId})`.as(
          "npc_id",
        ),
        name: npc.name,
        type: npc.type,
        lvl: npc.lvl,
        icon: npc.icon,
        rank: sql<number>`row_number() over (partition by ${lootNpc.lootId} order by ${strongestNpcFirst})`.as(
          "rn",
        ),
      })
      .from(lootNpc)
      .innerJoin(npc, eq(npc.id, lootNpc.npcSnapshotId))
      .where(and(selected(lootNpc.lootId), ne(npc.type, "COMMON"))),
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
    .innerJoin(lootItem, eq(lootItem.lootId, rankedNpcs.lootId))
    .innerJoin(loot, eq(loot.id, lootItem.lootId))
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

  const legends = database
    .with(rankedNpcs)
    .select({
      item_id: item.itemId,
      name: item.name,
      icon: item.icon,
      // The latest revision's stats describe the item in its tooltip.
      stat: sql<string>`(array_agg(${item.statRaw} order by ${lootItem.id} desc))[1]`,
      type: sql<
        string | null
      >`(array_agg(${item.itemType} order by ${lootItem.id} desc))[1]`,
      world: loot.world,
      npc_id: rankedNpcs.npcId,
      npc_name: rankedNpcs.name,
      npc_lvl: rankedNpcs.lvl,
      npc_icon: rankedNpcs.icon,
      count: count(),
      caught: sql<number>`count(*) filter (where ${caught})`.mapWith(Number),
      caught_items: sql<
        { lootId: number; hid: string }[]
      >`coalesce(jsonb_agg(jsonb_build_object('lootId', ${lootItem.lootId}, 'hid', ${lootItem.hid})) filter (where ${caught}), '[]'::jsonb)`,
    })
    .from(rankedNpcs)
    .innerJoin(lootItem, eq(lootItem.lootId, rankedNpcs.lootId))
    .innerJoin(loot, eq(loot.id, lootItem.lootId))
    .innerJoin(item, eq(item.id, lootItem.itemSnapshotId))
    .where(and(eq(rankedNpcs.rank, 1), rankedLegendary))
    .groupBy(
      item.itemId,
      item.name,
      item.icon,
      loot.world,
      rankedNpcs.npcId,
      rankedNpcs.name,
      rankedNpcs.lvl,
      rankedNpcs.icon,
    )
    .orderBy(
      desc(count()),
      desc(sql`count(*) filter (where ${caught})`),
      asc(item.name),
    );

  return { overview, timeline, topNpcs, legends };
};
