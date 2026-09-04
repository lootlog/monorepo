/** Shared input and output schemas for the kills feature. */
import * as Schema from "effect/Schema";
import {
  LevelFilter,
  PageSize,
  NonEmptyString,
  JsonValue,
  PositiveSafeInteger,
  NonNegativeSafeInteger,
  FiniteNumber,
} from "#src/contracts/scalars";
import { NpcTypeSchema } from "@lootlog/schema/npc-type";

const KillCountsByNpcType = Schema.Struct({
  COMMON: Schema.optionalKey(FiniteNumber),
  ELITE: Schema.optionalKey(FiniteNumber),
  ELITE2: Schema.optionalKey(FiniteNumber),
  ELITE3: Schema.optionalKey(FiniteNumber),
  HERO: Schema.optionalKey(FiniteNumber),
  TITAN: Schema.optionalKey(FiniteNumber),
  COLOSSUS: Schema.optionalKey(FiniteNumber),
  NPC: Schema.optionalKey(FiniteNumber),
  EVENT_HERO: Schema.optionalKey(FiniteNumber),
});

const KilledNpcSummary = Schema.Struct({
  npcId: FiniteNumber,
  npcName: Schema.String,
  npcType: Schema.String,
  npcLvl: FiniteNumber,
  npcProf: Schema.Union([Schema.String, Schema.Null]),
  npcIcon: Schema.Union([Schema.String, Schema.Null]),
  totalKills: FiniteNumber,
});

const KillPagination = Schema.Struct({
  total: FiniteNumber,
  cursor: FiniteNumber,
  limit: FiniteNumber,
  hasNext: Schema.Boolean,
});

const RankedKiller = Schema.Struct({
  memberId: FiniteNumber,
  memberName: Schema.String,
  memberAvatar: Schema.Union([Schema.String, Schema.Null]),
  memberUserId: Schema.String,
  totalParticipations: FiniteNumber,
});

export type CreateKillRequest = typeof CreateKillRequest.Type;

export const CreateKillRequest = Schema.Struct({
  world: NonEmptyString,
  npc: Schema.Struct({
    id: FiniteNumber,
    name: NonEmptyString,
    lvl: FiniteNumber,
    prof: Schema.optionalKey(Schema.String),
    wt: FiniteNumber,
    icon: Schema.optionalKey(Schema.String),
  }),
  characterId: NonEmptyString,
  accountId: NonEmptyString,
}).annotate({ identifier: "CreateKillDto" });

export type CreateKillResponse = typeof CreateKillResponse.Type;

export const CreateKillResponse = Schema.Struct({
  updated: FiniteNumber,
  deduplicated: Schema.optionalKey(Schema.Boolean),
}).annotate({ identifier: "CreateKillResponseDto_Output" });

export type GuildKillStatsResponse = typeof GuildKillStatsResponse.Type;

export const GuildKillStatsResponse = Schema.Struct({
  overview: Schema.Struct({
    guildUniqueKills: FiniteNumber,
    totalMemberParticipations: FiniteNumber,
    killsByType: KillCountsByNpcType,
    participationsByType: KillCountsByNpcType,
  }),
  memberRanking: Schema.Array(
    Schema.Struct({
      memberId: FiniteNumber,
      memberName: Schema.String,
      memberAvatar: Schema.Union([Schema.String, Schema.Null]),
      memberUserId: Schema.String,
      totalParticipations: FiniteNumber,
      participationsByType: KillCountsByNpcType,
    }),
  ),
}).annotate({ identifier: "GuildKillStatsResponseDto_Output" });

export type UserKillStatsResponse = typeof UserKillStatsResponse.Type;

export const UserKillStatsResponse = Schema.Struct({
  overview: Schema.Struct({
    totalKills: FiniteNumber,
    killsByType: KillCountsByNpcType,
    killsByWorld: Schema.Record(Schema.String, FiniteNumber),
  }),
  topNpcs: Schema.Array(
    Schema.Struct({
      npcId: FiniteNumber,
      npcName: Schema.String,
      npcType: Schema.String,
      npcLvl: FiniteNumber,
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      npcProf: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
      totalKills: FiniteNumber,
    }),
  ),
}).annotate({ identifier: "UserKillStatsResponseDto_Output" });

export type UserNpcKillsResponse = typeof UserNpcKillsResponse.Type;

export const UserNpcKillsResponse = Schema.Struct({
  npcs: Schema.Array(KilledNpcSummary),
  pagination: KillPagination,
}).annotate({ identifier: "UserNpcKillsResponseDto_Output" });

export type NpcType = typeof NpcType.Type;

export const NpcType = NpcTypeSchema.annotate({ identifier: "NpcType" });

export type GuildTopNpcsQuery = typeof GuildTopNpcsQuery.Type;

export const GuildTopNpcsQuery = Schema.Struct({
  limit: FiniteNumber,
  npcType: Schema.optionalKey(NpcType),
  world: Schema.String,
  search: Schema.String,
  minLvl: Schema.String,
  maxLvl: Schema.String,
  period: Schema.String,
});

export type GuildTopNpcsResponse = typeof GuildTopNpcsResponse.Type;

export const GuildTopNpcsResponse = Schema.Struct({
  topNpcs: Schema.Array(
    Schema.Struct({
      npcId: FiniteNumber,
      npcName: Schema.String,
      npcType: Schema.String,
      npcLvl: FiniteNumber,
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      uniqueKills: FiniteNumber,
    }),
  ),
}).annotate({ identifier: "GuildTopNpcsResponseDto_Output" });

export type GuildTopKillersByTypeResponse =
  typeof GuildTopKillersByTypeResponse.Type;

export const GuildTopKillersByTypeResponse = Schema.Struct({
  TITAN: Schema.optionalKey(Schema.Array(RankedKiller)),
  HERO: Schema.optionalKey(Schema.Array(RankedKiller)),
  EVENT_HERO: Schema.optionalKey(Schema.Array(RankedKiller)),
}).annotate({ identifier: "GuildTopKillersByTypeResponseDto_Output" });

export type NpcKillersResponse = typeof NpcKillersResponse.Type;

export const NpcKillersResponse = Schema.Struct({
  npc: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        npcId: FiniteNumber,
        npcName: Schema.String,
        npcType: Schema.String,
        npcLvl: FiniteNumber,
        npcProf: Schema.Union([Schema.String, Schema.Null]),
        npcIcon: Schema.Union([Schema.String, Schema.Null]),
        uniqueGuildKills: FiniteNumber,
        totalMemberParticipations: FiniteNumber,
      }),
      [Schema.Record(Schema.String, JsonValue)],
    ),
    Schema.Null,
  ]),
  killers: Schema.Array(
    Schema.Struct({
      memberId: FiniteNumber,
      memberName: Schema.String,
      memberAvatar: Schema.Union([Schema.String, Schema.Null]),
      memberUserId: Schema.String,
      participationCount: FiniteNumber,
    }),
  ),
}).annotate({ identifier: "NpcKillersResponseDto_Output" });

export type MemberKillsResponse = typeof MemberKillsResponse.Type;

export const MemberKillsResponse = Schema.Struct({
  member: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        memberId: FiniteNumber,
        memberName: Schema.String,
        memberAvatar: Schema.Union([Schema.String, Schema.Null]),
        memberUserId: Schema.String,
      }),
      [Schema.Record(Schema.String, JsonValue)],
    ),
    Schema.Null,
  ]),
  overview: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        totalParticipations: FiniteNumber,
        participationsByType: Schema.Record(Schema.String, FiniteNumber),
      }),
      [Schema.Record(Schema.String, JsonValue)],
    ),
    Schema.Null,
  ]),
  npcs: Schema.Array(KilledNpcSummary),
  pagination: Schema.Union([
    Schema.StructWithRest(KillPagination, [
      Schema.Record(Schema.String, JsonValue),
    ]),
    Schema.Null,
  ]),
}).annotate({ identifier: "MemberKillsResponseDto_Output" });

export type KillOrganizationPath = typeof KillOrganizationPath.Type;

export const KillOrganizationPath = Schema.Struct({
  guildId: JsonValue,
});

export type GuildKillStatsQuery = typeof GuildKillStatsQuery.Type;

export const GuildKillStatsQuery = Schema.Struct({
  npcTypes: Schema.optionalKey(Schema.Array(NpcTypeSchema)),
  minLvl: Schema.optionalKey(LevelFilter),
  maxLvl: Schema.optionalKey(LevelFilter),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["all", "24h", "3d", "7d", "14d", "30d"]),
  ),
}).check(
  Schema.makeFilter((data) =>
    data.minLvl === undefined ||
    data.maxLvl === undefined ||
    data.minLvl <= data.maxLvl
      ? undefined
      : { path: ["minLvl"], issue: "minLvl must be <= maxLvl" },
  ),
);

export type UserKillStatsQuery = typeof UserKillStatsQuery.Type;

export const UserKillStatsQuery = Schema.Struct({
  npcTypes: Schema.optionalKey(Schema.Array(NpcTypeSchema)),
  npcType: Schema.optionalKey(NpcTypeSchema),
  world: Schema.optionalKey(Schema.String),
  topNpcsLimit: Schema.optionalKey(PositiveSafeInteger),
  period: Schema.optionalKey(
    Schema.Literals(["all", "24h", "3d", "7d", "14d", "30d"]),
  ),
});

export type UserNpcKillsQuery = typeof UserNpcKillsQuery.Type;

export const UserNpcKillsQuery = Schema.Struct({
  npcTypes: Schema.optionalKey(Schema.Array(NpcTypeSchema)),
  world: Schema.optionalKey(Schema.String),
  search: Schema.optionalKey(Schema.String),
  cursor: Schema.optionalKey(NonNegativeSafeInteger),
  limit: Schema.optionalKey(PageSize),
  sortOrder: Schema.optionalKey(Schema.Literals(["asc", "desc"])),
  sortBy: Schema.optionalKey(Schema.Literals(["kills", "level"])),
  minLvl: Schema.optionalKey(LevelFilter),
  maxLvl: Schema.optionalKey(LevelFilter),
  period: Schema.optionalKey(
    Schema.Literals(["all", "24h", "3d", "7d", "14d", "30d"]),
  ),
}).check(
  Schema.makeFilter((data) =>
    data.minLvl === undefined ||
    data.maxLvl === undefined ||
    data.minLvl <= data.maxLvl
      ? undefined
      : { path: ["minLvl"], issue: "minLvl must be <= maxLvl" },
  ),
);

export type GuildTopKillersQuery = typeof GuildTopKillersQuery.Type;

export const GuildTopKillersQuery = Schema.Struct({
  limit: FiniteNumber,
  period: Schema.String,
});

export type NpcKillersPath = typeof NpcKillersPath.Type;

export const NpcKillersPath = Schema.Struct({
  npcId: Schema.String.annotate({ examples: ["999"] }),
  guildId: JsonValue,
});

export type NpcKillersQuery = typeof NpcKillersQuery.Type;

export const NpcKillersQuery = Schema.Struct({
  limit: Schema.optionalKey(PageSize),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["all", "24h", "3d", "7d", "14d", "30d"]),
  ),
});

export type MemberKillsPath = typeof MemberKillsPath.Type;

export const MemberKillsPath = Schema.Struct({
  memberId: Schema.String.annotate({ examples: ["123"] }),
  guildId: JsonValue,
});

export type MemberKillsQuery = typeof MemberKillsQuery.Type;

export const MemberKillsQuery = Schema.Struct({
  minLvl: Schema.optionalKey(LevelFilter),
  maxLvl: Schema.optionalKey(LevelFilter),
  world: Schema.optionalKey(Schema.String),
  npcTypes: Schema.optionalKey(Schema.Array(NpcTypeSchema)),
  search: Schema.optionalKey(Schema.String),
  limit: Schema.optionalKey(PageSize),
  cursor: Schema.optionalKey(NonNegativeSafeInteger),
  period: Schema.optionalKey(
    Schema.Literals(["all", "24h", "3d", "7d", "14d", "30d"]),
  ),
});
