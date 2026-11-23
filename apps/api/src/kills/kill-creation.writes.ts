import { sql } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import { mapValues } from "es-toolkit";
import type { Effect } from "effect";
import { activityFeedNpcCategory } from "@lootlog/domain/activity-feed";
import type { KillLootRolls } from "@lootlog/domain/loot-rolls";
import type { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  bossKillTable,
  guildKillActivityTable,
  guildKillBucketTable,
  guildKillDayTable,
  guildKillTotalTable,
  memberKillBucketTable,
  memberKillTotalTable,
  userCharacterKillBucketTable,
  userKillBucketTable,
  userKillCharacterTable,
  userKillTotalTable,
} from "#src/database/drizzle/kill-statistics.schema";
import { toStatsDate, toStatsHour } from "./kill-stats-period.js";

export type KillInput = {
  readonly userId: string;
  readonly world: string;
  readonly npcId: number;
  readonly npcName: string;
  readonly npcType: NpcType;
  readonly npcLvl: number;
  readonly npcProf: string | null;
  readonly npcIcon: string | null;
  readonly lastKilledAt: Date;
  readonly lootRolls: KillLootRolls | null;
};

type CharacterInput = {
  readonly characterId: string;
  readonly name: string | null;
  readonly level: number | null;
  readonly profession: string | null;
  readonly icon: string | null;
};

type Transaction = Parameters<
  Parameters<(typeof ApiDatabase.Service)["transaction"]>[0]
>[0];

export type KillWrite = (
  transaction: Transaction,
) => ReadonlyArray<Effect.Effect<void, EffectDrizzleQueryError>>;

const descriptive = (input: KillInput) => ({
  npcName: input.npcName,
  npcType: input.npcType,
  npcLvl: input.npcLvl,
  npcProf: input.npcProf,
  npcIcon: input.npcIcon,
  lastKilledAt: input.lastKilledAt,
});

export const incrementUser =
  (input: KillInput, character: CharacterInput, periodStart: Date): KillWrite =>
  (transaction) => {
    const key = {
      discordUserId: input.userId,
      world: input.world,
      npcId: input.npcId,
    };

    const characterKey = { ...key, characterId: character.characterId };

    const characterDetails = {
      name: character.name,
      level: character.level,
      profession: character.profession,
      icon: character.icon,
    };

    const characterCount = {
      kills: sql`${userKillCharacterTable.kills} + 1`,
      lastKilledAt: input.lastKilledAt,
    };

    return [
      transaction
        .insert(userKillTotalTable)
        .values({ ...key, ...descriptive(input), kills: 1 })
        .onConflictDoUpdate({
          target: [
            userKillTotalTable.discordUserId,
            userKillTotalTable.world,
            userKillTotalTable.npcId,
          ],
          set: {
            kills: sql`${userKillTotalTable.kills} + 1`,
            ...descriptive(input),
          },
        }),
      transaction
        .insert(userKillBucketTable)
        .values({ ...key, periodStart, ...descriptive(input), kills: 1 })
        .onConflictDoUpdate({
          target: [
            userKillBucketTable.discordUserId,
            userKillBucketTable.world,
            userKillBucketTable.npcId,
            userKillBucketTable.periodStart,
          ],
          set: {
            kills: sql`${userKillBucketTable.kills} + 1`,
            ...descriptive(input),
          },
        }),
      transaction
        .insert(userCharacterKillBucketTable)
        .values({
          ...characterKey,
          periodStart,
          ...descriptive(input),
          kills: 1,
        })
        .onConflictDoUpdate({
          target: [
            userCharacterKillBucketTable.discordUserId,
            userCharacterKillBucketTable.world,
            userCharacterKillBucketTable.characterId,
            userCharacterKillBucketTable.npcId,
            userCharacterKillBucketTable.periodStart,
          ],
          set: {
            kills: sql`${userCharacterKillBucketTable.kills} + 1`,
            ...descriptive(input),
          },
        }),
      transaction
        .insert(userKillCharacterTable)
        .values({
          discordUserId: input.userId,
          world: input.world,
          characterId: character.characterId,
          ...characterDetails,
          kills: 1,
          firstKilledAt: input.lastKilledAt,
          lastKilledAt: input.lastKilledAt,
        })
        .onConflictDoUpdate({
          target: [
            userKillCharacterTable.discordUserId,
            userKillCharacterTable.world,
            userKillCharacterTable.characterId,
          ],
          set:
            character.name === null
              ? characterCount
              : { ...characterCount, ...characterDetails },
        }),
    ];
  };

export const incrementMember =
  (
    input: KillInput & {
      readonly guildId: string;
      readonly memberId: number;
    },
    periodStart: Date,
  ): KillWrite =>
  (transaction) => {
    const key = {
      guildId: input.guildId,
      memberId: input.memberId,
      discordUserId: input.userId,
      world: input.world,
      npcId: input.npcId,
    };

    return [
      transaction
        .insert(memberKillTotalTable)
        .values({ ...key, ...descriptive(input), kills: 1 })
        .onConflictDoUpdate({
          target: [
            memberKillTotalTable.guildId,
            memberKillTotalTable.memberId,
            memberKillTotalTable.world,
            memberKillTotalTable.npcId,
          ],
          set: {
            kills: sql`${memberKillTotalTable.kills} + 1`,
            ...descriptive(input),
          },
        }),
      transaction
        .insert(memberKillBucketTable)
        .values({ ...key, periodStart, ...descriptive(input), kills: 1 })
        .onConflictDoUpdate({
          target: [
            memberKillBucketTable.guildId,
            memberKillBucketTable.memberId,
            memberKillBucketTable.world,
            memberKillBucketTable.npcId,
            memberKillBucketTable.periodStart,
          ],
          set: {
            kills: sql`${memberKillBucketTable.kills} + 1`,
            ...descriptive(input),
          },
        }),
    ];
  };

const partyOf = ({ lootRolls }: KillInput) => ({
  lootRolls: lootRolls?.rolls ?? null,
  partyWarriors: lootRolls?.members.w ?? null,
  partyPaladins: lootRolls?.members.p ?? null,
  partyBladeDancers: lootRolls?.members.b ?? null,
  partyMages: lootRolls?.members.m ?? null,
  partyTrackers: lootRolls?.members.t ?? null,
  partyHunters: lootRolls?.members.h ?? null,
});

export const recordBossKill =
  (
    input: KillInput & { readonly guildId: string },
    killedAt: Date,
  ): KillWrite =>
  (transaction) => {
    const table = bossKillTable;
    const party = partyOf(input);

    const fillParty = mapValues(
      party,
      (value, key) => sql`coalesce(${table[key]}, ${value})`,
    );

    return [
      transaction
        .insert(table)
        .values({
          world: input.world,
          npcId: input.npcId,
          killedAt,
          npcName: input.npcName,
          npcType: input.npcType,
          guildIds: [input.guildId],
          ...party,
        })
        .onConflictDoUpdate({
          target: [table.world, table.npcId, table.killedAt],
          set: {
            guildIds: sql`case
              when ${input.guildId}::text = any(${table.guildIds}) then ${table.guildIds}
              else array_append(${table.guildIds}, ${input.guildId}::text)
            end`,
            ...fillParty,
          },
        }),
    ];
  };

const incrementGuildDay = (
  transaction: Transaction,
  input: KillInput & { readonly guildId: string },
  periodStart: Date,
) => {
  const hour = toStatsHour(periodStart);
  const table = guildKillDayTable;
  const slot = sql.raw(String(hour));

  return transaction
    .insert(table)
    .values({
      guildId: input.guildId,
      world: input.world,
      npcId: input.npcId,
      day: toStatsDate(periodStart),
      npcName: input.npcName,
      npcType: input.npcType,
      npcLvl: input.npcLvl,
      kills: 1,
      hours: Array.from({ length: 24 }, (_, index) => (index === hour ? 1 : 0)),
    })
    .onConflictDoUpdate({
      target: [table.guildId, table.world, table.npcId, table.day],
      set: {
        kills: sql`${table.kills} + 1`,
        hours: sql`${table.hours}[1:${slot}] || (${table.hours}[${slot} + 1] + 1) || ${table.hours}[${slot} + 2:24]`,
        npcName: input.npcName,
        npcType: input.npcType,
        npcLvl: input.npcLvl,
      },
    });
};

export const incrementGuild =
  (
    input: KillInput & { readonly guildId: string },
    periodStart: Date,
  ): KillWrite =>
  (transaction) => [
    transaction
      .insert(guildKillTotalTable)
      .values({
        guildId: input.guildId,
        world: input.world,
        npcId: input.npcId,
        ...descriptive(input),
        kills: 1,
      })
      .onConflictDoUpdate({
        target: [
          guildKillTotalTable.guildId,
          guildKillTotalTable.world,
          guildKillTotalTable.npcId,
        ],
        set: {
          kills: sql`${guildKillTotalTable.kills} + 1`,
          ...descriptive(input),
        },
      }),
    transaction
      .insert(guildKillBucketTable)
      .values({
        periodStart,
        guildId: input.guildId,
        world: input.world,
        npcId: input.npcId,
        ...descriptive(input),
        kills: 1,
      })
      .onConflictDoUpdate({
        target: [
          guildKillBucketTable.guildId,
          guildKillBucketTable.world,
          guildKillBucketTable.npcId,
          guildKillBucketTable.periodStart,
        ],
        set: {
          kills: sql`${guildKillBucketTable.kills} + 1`,
          ...descriptive(input),
        },
      }),
    incrementGuildDay(transaction, input, periodStart),
    ...(activityFeedNpcCategory(input.npcType) !== "OTHER"
      ? [
          transaction.insert(guildKillActivityTable).values({
            id: Bun.randomUUIDv7(),
            guildId: input.guildId,
            world: input.world,
            npcId: input.npcId,
            npcName: input.npcName,
            npcType: input.npcType,
            npcLvl: input.npcLvl,
            npcProf: input.npcProf,
            npcIcon: input.npcIcon,
            occurredAt: input.lastKilledAt,
          }),
        ]
      : []),
  ];
