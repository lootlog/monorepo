import * as Schema from "effect/Schema";
import {
  PageSize,
  NonEmptyString,
  JsonValue,
  DateTimeString,
  FiniteNumber,
  NpcLevelRange,
  NpcTypes,
  PageCursor,
  Page,
  Period,
  SearchText,
  WorldParam,
} from "@lootlog/schema/http-scalars";
import { NpcTypeSchema } from "@lootlog/schema/npc-type";
import { MemberSummary } from "../shared.js";

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

const KillPageTotal = FiniteNumber;

const RankedKiller = Schema.Struct({
  member: MemberSummary,
  totalParticipations: FiniteNumber,
});

export type CreateKillRequest = typeof CreateKillRequest.Type;

export const CreateKillRequest = Schema.Struct({
  world: WorldParam,
  npc: Schema.Struct({
    id: FiniteNumber,
    name: NonEmptyString,
    lvl: FiniteNumber,
    prof: Schema.optionalKey(Schema.String),
    wt: FiniteNumber,
    icon: Schema.optionalKey(Schema.String),
    isHeroFromEvent: Schema.optionalKey(
      Schema.Boolean.annotate({
        description:
          "Margonem template flag (`isHeroFromEvent`) of a hero spawned by an event; omitted when the client did not observe it.",
      }),
    ),
  }),
  characterId: NonEmptyString,
  accountId: NonEmptyString,
  party: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        prof: Schema.String.annotate({
          description: "Margonem profession shortname, such as `w`.",
        }),
        lvl: FiniteNumber,
        alive: Schema.Boolean.annotate({
          description: "Whether the member survived the battle.",
        }),
      }),
    ).check(Schema.isMaxLength(30)),
  ),
  character: Schema.optionalKey(
    Schema.Struct({
      name: NonEmptyString,
      lvl: FiniteNumber,
      prof: Schema.optionalKey(Schema.String),
      icon: Schema.optionalKey(Schema.String),
    }),
  ),
}).annotate({ identifier: "CreateKillDto" });

export type CreateKillResponse = typeof CreateKillResponse.Type;

export const CreateKillResponse = Schema.Struct({
  updated: FiniteNumber,
  deduplicated: Schema.optionalKey(Schema.Boolean),
}).annotate({ identifier: "CreateKillResponseDto_Output" });

export type GuildKillStatsResponse = typeof GuildKillStatsResponse.Type;

const GuildKillStatsBody = Schema.Struct({
  overview: Schema.Struct({
    guildUniqueKills: FiniteNumber,
    totalMemberParticipations: FiniteNumber,
    killsByType: KillCountsByNpcType,
    participationsByType: KillCountsByNpcType,
  }),
  memberRanking: Schema.Array(
    Schema.Struct({
      member: MemberSummary,
      totalParticipations: FiniteNumber,
      participationsByType: KillCountsByNpcType,
    }),
  ),
  timeline: Schema.Struct({
    unit: Schema.Literals(["hour", "day"]),
    untimedKills: FiniteNumber,
    points: Schema.Array(
      Schema.Struct({ date: Schema.String, kills: FiniteNumber }),
    ),
  }),
  hourlyWeekday: Schema.Array(
    Schema.Struct({
      weekday: FiniteNumber,
      hour: FiniteNumber,
      kills: FiniteNumber,
    }),
  ),
});

export { GuildKillStatsBody };

export const GuildKillStatsResponse = Schema.Struct({
  ...GuildKillStatsBody.fields,
  computedAt: DateTimeString,
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
  ...Page(KilledNpcSummary).fields,
  total: KillPageTotal,
}).annotate({ identifier: "UserNpcKillsResponseDto_Output" });

export type NpcType = typeof NpcType.Type;

export const NpcType = NpcTypeSchema.annotate({ identifier: "NpcType" });

export const GUILD_TOP_NPCS_DEFAULT_LIMIT = 10;

export const GUILD_TOP_KILLERS_DEFAULT_LIMIT = 5;

export type GuildTopNpcsQuery = typeof GuildTopNpcsQuery.Type;

export const GuildTopNpcsQuery = Schema.Struct({
  limit: Schema.optionalKey(
    PageSize.annotate({ default: GUILD_TOP_NPCS_DEFAULT_LIMIT }),
  ),
  npcType: Schema.optionalKey(NpcType),
  world: Schema.optionalKey(WorldParam),
  search: Schema.optionalKey(SearchText),
  ...NpcLevelRange.fields,
  period: Schema.optionalKey(Period),
}).check(NpcLevelRange.check);

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
      member: MemberSummary,
      participationCount: FiniteNumber,
    }),
  ),
}).annotate({ identifier: "NpcKillersResponseDto_Output" });

export type MemberKillsResponse = typeof MemberKillsResponse.Type;

export const MemberKillsResponse = Schema.Struct({
  member: Schema.NullOr(MemberSummary),
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
  total: KillPageTotal,
  nextCursor: Schema.NullOr(Schema.String),
}).annotate({ identifier: "MemberKillsResponseDto_Output" });

export type KillOrganizationPath = typeof KillOrganizationPath.Type;

export const KillOrganizationPath = Schema.Struct({
  guildId: Schema.String,
});

export type GuildKillStatsQuery = typeof GuildKillStatsQuery.Type;

export const GuildKillStatsQuery = Schema.Struct({
  npcTypes: Schema.optionalKey(NpcTypes),
  ...NpcLevelRange.fields,
  world: Schema.optionalKey(WorldParam),
  period: Schema.optionalKey(Period),
}).check(NpcLevelRange.check);

export type UserKillStatsQuery = typeof UserKillStatsQuery.Type;

export const USER_TOP_NPCS_DEFAULT_LIMIT = 5;

export const UserKillStatsQuery = Schema.Struct({
  npcTypes: Schema.optionalKey(NpcTypes),
  npcType: Schema.optionalKey(NpcType),
  world: Schema.optionalKey(WorldParam),
  topNpcsLimit: Schema.optionalKey(
    PageSize.annotate({ default: USER_TOP_NPCS_DEFAULT_LIMIT }),
  ),
  period: Schema.optionalKey(Period),
});

export type UserNpcKillsQuery = typeof UserNpcKillsQuery.Type;

export const UserNpcKillsQuery = Schema.Struct({
  npcTypes: Schema.optionalKey(NpcTypes),
  world: Schema.optionalKey(WorldParam),
  search: Schema.optionalKey(SearchText),
  cursor: Schema.optionalKey(PageCursor),
  limit: Schema.optionalKey(PageSize),
  sortOrder: Schema.optionalKey(Schema.Literals(["asc", "desc"])),
  sortBy: Schema.optionalKey(Schema.Literals(["kills", "level"])),
  ...NpcLevelRange.fields,
  period: Schema.optionalKey(Period),
}).check(NpcLevelRange.check);

export type GuildTopKillersQuery = typeof GuildTopKillersQuery.Type;

export const GuildTopKillersQuery = Schema.Struct({
  limit: Schema.optionalKey(
    PageSize.annotate({ default: GUILD_TOP_KILLERS_DEFAULT_LIMIT }),
  ),
  period: Schema.optionalKey(Period),
});

export type NpcKillersPath = typeof NpcKillersPath.Type;

export const NpcKillersPath = Schema.Struct({
  npcId: Schema.String.annotate({ examples: ["999"] }),
  guildId: Schema.String,
});

export type NpcKillersQuery = typeof NpcKillersQuery.Type;

export const NPC_KILLERS_DEFAULT_LIMIT = 50;

export const NpcKillersQuery = Schema.Struct({
  limit: Schema.optionalKey(
    PageSize.annotate({ default: NPC_KILLERS_DEFAULT_LIMIT }),
  ),
  world: Schema.optionalKey(WorldParam),
  period: Schema.optionalKey(Period),
});

export type MemberKillsPath = typeof MemberKillsPath.Type;

export const MemberKillsPath = Schema.Struct({
  memberId: Schema.String.annotate({ examples: ["123"] }),
  guildId: Schema.String,
});

export type MemberKillsQuery = typeof MemberKillsQuery.Type;

export const MemberKillsQuery = Schema.Struct({
  ...NpcLevelRange.fields,
  world: Schema.optionalKey(WorldParam),
  npcTypes: Schema.optionalKey(NpcTypes),
  search: Schema.optionalKey(SearchText),
  limit: Schema.optionalKey(PageSize),
  cursor: Schema.optionalKey(PageCursor),
  period: Schema.optionalKey(Period),
}).check(NpcLevelRange.check);
