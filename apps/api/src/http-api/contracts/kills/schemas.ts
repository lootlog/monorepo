/** Transport schemas owned by the kills HTTP module. */
import * as Schema from "effect/Schema";
import { FiniteNumber } from "../scalars.js";

export type CreateKillDto = typeof CreateKillDto.Type;

export const CreateKillDto = Schema.Struct({
  world: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  npc: Schema.Struct({
    id: FiniteNumber,
    name: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ),
    lvl: FiniteNumber,
    prof: Schema.optionalKey(Schema.String),
    wt: FiniteNumber,
    icon: Schema.optionalKey(Schema.String),
  }),
  characterId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  accountId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
}).annotate({ identifier: "CreateKillDto" });

export type CreateKillResponseDto_Output =
  typeof CreateKillResponseDto_Output.Type;

export const CreateKillResponseDto_Output = Schema.Struct({
  updated: FiniteNumber,
  deduplicated: Schema.optionalKey(Schema.Boolean),
}).annotate({ identifier: "CreateKillResponseDto_Output" });

export type GuildKillStatsResponseDto_Output =
  typeof GuildKillStatsResponseDto_Output.Type;

export const GuildKillStatsResponseDto_Output = Schema.Struct({
  overview: Schema.Struct({
    guildUniqueKills: FiniteNumber,
    totalMemberParticipations: FiniteNumber,
    killsByType: Schema.Struct({
      COMMON: Schema.optionalKey(FiniteNumber),
      ELITE: Schema.optionalKey(FiniteNumber),
      ELITE2: Schema.optionalKey(FiniteNumber),
      ELITE3: Schema.optionalKey(FiniteNumber),
      HERO: Schema.optionalKey(FiniteNumber),
      TITAN: Schema.optionalKey(FiniteNumber),
      COLOSSUS: Schema.optionalKey(FiniteNumber),
      NPC: Schema.optionalKey(FiniteNumber),
      EVENT_HERO: Schema.optionalKey(FiniteNumber),
    }),
    participationsByType: Schema.Struct({
      COMMON: Schema.optionalKey(FiniteNumber),
      ELITE: Schema.optionalKey(FiniteNumber),
      ELITE2: Schema.optionalKey(FiniteNumber),
      ELITE3: Schema.optionalKey(FiniteNumber),
      HERO: Schema.optionalKey(FiniteNumber),
      TITAN: Schema.optionalKey(FiniteNumber),
      COLOSSUS: Schema.optionalKey(FiniteNumber),
      NPC: Schema.optionalKey(FiniteNumber),
      EVENT_HERO: Schema.optionalKey(FiniteNumber),
    }),
  }),
  memberRanking: Schema.Array(
    Schema.Struct({
      memberId: FiniteNumber,
      memberName: Schema.String,
      memberAvatar: Schema.Union([Schema.String, Schema.Null]),
      memberUserId: Schema.String,
      totalParticipations: FiniteNumber,
      participationsByType: Schema.Struct({
        COMMON: Schema.optionalKey(FiniteNumber),
        ELITE: Schema.optionalKey(FiniteNumber),
        ELITE2: Schema.optionalKey(FiniteNumber),
        ELITE3: Schema.optionalKey(FiniteNumber),
        HERO: Schema.optionalKey(FiniteNumber),
        TITAN: Schema.optionalKey(FiniteNumber),
        COLOSSUS: Schema.optionalKey(FiniteNumber),
        NPC: Schema.optionalKey(FiniteNumber),
        EVENT_HERO: Schema.optionalKey(FiniteNumber),
      }),
    }),
  ),
}).annotate({ identifier: "GuildKillStatsResponseDto_Output" });

export type UserKillStatsResponseDto_Output =
  typeof UserKillStatsResponseDto_Output.Type;

export const UserKillStatsResponseDto_Output = Schema.Struct({
  overview: Schema.Struct({
    totalKills: FiniteNumber,
    killsByType: Schema.Struct({
      COMMON: Schema.optionalKey(FiniteNumber),
      ELITE: Schema.optionalKey(FiniteNumber),
      ELITE2: Schema.optionalKey(FiniteNumber),
      ELITE3: Schema.optionalKey(FiniteNumber),
      HERO: Schema.optionalKey(FiniteNumber),
      TITAN: Schema.optionalKey(FiniteNumber),
      COLOSSUS: Schema.optionalKey(FiniteNumber),
      NPC: Schema.optionalKey(FiniteNumber),
      EVENT_HERO: Schema.optionalKey(FiniteNumber),
    }),
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

export type UserNpcKillsResponseDto_Output =
  typeof UserNpcKillsResponseDto_Output.Type;

export const UserNpcKillsResponseDto_Output = Schema.Struct({
  npcs: Schema.Array(
    Schema.Struct({
      npcId: FiniteNumber,
      npcName: Schema.String,
      npcType: Schema.String,
      npcLvl: FiniteNumber,
      npcProf: Schema.Union([Schema.String, Schema.Null]),
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      totalKills: FiniteNumber,
    }),
  ),
  pagination: Schema.Struct({
    total: FiniteNumber,
    cursor: FiniteNumber,
    limit: FiniteNumber,
    hasNext: Schema.Boolean,
  }),
}).annotate({ identifier: "UserNpcKillsResponseDto_Output" });

export type NpcType = typeof NpcType.Type;

export const NpcType = Schema.Literals([
  "COMMON",
  "ELITE",
  "ELITE2",
  "ELITE3",
  "HERO",
  "EVENT_HERO",
  "TITAN",
  "COLOSSUS",
  "NPC",
]).annotate({ identifier: "NpcType" });

export type KillsControllerGetGuildTopNpcsParams =
  typeof KillsControllerGetGuildTopNpcsParams.Type;

export const KillsControllerGetGuildTopNpcsParams = Schema.Struct({
  limit: FiniteNumber,
  npcType: Schema.optionalKey(NpcType),
  world: Schema.String,
  search: Schema.String,
  minLvl: Schema.String,
  maxLvl: Schema.String,
  period: Schema.String,
});

export type GuildTopNpcsResponseDto_Output =
  typeof GuildTopNpcsResponseDto_Output.Type;

export const GuildTopNpcsResponseDto_Output = Schema.Struct({
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

export type GuildTopKillersByTypeResponseDto_Output =
  typeof GuildTopKillersByTypeResponseDto_Output.Type;

export const GuildTopKillersByTypeResponseDto_Output = Schema.Struct({
  TITAN: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        memberId: FiniteNumber,
        memberName: Schema.String,
        memberAvatar: Schema.Union([Schema.String, Schema.Null]),
        memberUserId: Schema.String,
        totalParticipations: FiniteNumber,
      }),
    ),
  ),
  HERO: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        memberId: FiniteNumber,
        memberName: Schema.String,
        memberAvatar: Schema.Union([Schema.String, Schema.Null]),
        memberUserId: Schema.String,
        totalParticipations: FiniteNumber,
      }),
    ),
  ),
  EVENT_HERO: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        memberId: FiniteNumber,
        memberName: Schema.String,
        memberAvatar: Schema.Union([Schema.String, Schema.Null]),
        memberUserId: Schema.String,
        totalParticipations: FiniteNumber,
      }),
    ),
  ),
}).annotate({ identifier: "GuildTopKillersByTypeResponseDto_Output" });

export type NpcKillersResponseDto_Output =
  typeof NpcKillersResponseDto_Output.Type;

export const NpcKillersResponseDto_Output = Schema.Struct({
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
      [
        Schema.Record(
          Schema.String,
          Schema.Json.annotate({ expected: "JSON value" }),
        ),
      ],
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

export type MemberKillsResponseDto_Output =
  typeof MemberKillsResponseDto_Output.Type;

export const MemberKillsResponseDto_Output = Schema.Struct({
  member: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        memberId: FiniteNumber,
        memberName: Schema.String,
        memberAvatar: Schema.Union([Schema.String, Schema.Null]),
        memberUserId: Schema.String,
      }),
      [
        Schema.Record(
          Schema.String,
          Schema.Json.annotate({ expected: "JSON value" }),
        ),
      ],
    ),
    Schema.Null,
  ]),
  overview: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        totalParticipations: FiniteNumber,
        participationsByType: Schema.Record(Schema.String, FiniteNumber),
      }),
      [
        Schema.Record(
          Schema.String,
          Schema.Json.annotate({ expected: "JSON value" }),
        ),
      ],
    ),
    Schema.Null,
  ]),
  npcs: Schema.Array(
    Schema.Struct({
      npcId: FiniteNumber,
      npcName: Schema.String,
      npcType: Schema.String,
      npcLvl: FiniteNumber,
      npcProf: Schema.Union([Schema.String, Schema.Null]),
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      totalKills: FiniteNumber,
    }),
  ),
  pagination: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        total: FiniteNumber,
        cursor: FiniteNumber,
        limit: FiniteNumber,
        hasNext: Schema.Boolean,
      }),
      [
        Schema.Record(
          Schema.String,
          Schema.Json.annotate({ expected: "JSON value" }),
        ),
      ],
    ),
    Schema.Null,
  ]),
}).annotate({ identifier: "MemberKillsResponseDto_Output" });

export type KillsControllerCreateKillRequestJson =
  typeof KillsControllerCreateKillRequestJson.Type;

export const KillsControllerCreateKillRequestJson = CreateKillDto;

export type KillsControllerCreateKill201 =
  typeof KillsControllerCreateKill201.Type;

export const KillsControllerCreateKill201 = CreateKillResponseDto_Output;

export type KillsControllerGetGuildKillStatsPathParams =
  typeof KillsControllerGetGuildKillStatsPathParams.Type;

export const KillsControllerGetGuildKillStatsPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type KillsControllerGetGuildKillStatsQuery =
  typeof KillsControllerGetGuildKillStatsQuery.Type;

export const KillsControllerGetGuildKillStatsQuery = Schema.Struct({
  npcTypes: Schema.optionalKey(
    Schema.Array(
      Schema.Literals([
        "COMMON",
        "ELITE",
        "ELITE2",
        "ELITE3",
        "HERO",
        "EVENT_HERO",
        "TITAN",
        "COLOSSUS",
        "NPC",
      ]),
    ),
  ),
  minLvl: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(500).annotate({
          expected: "a value less than or equal to 500",
        }),
      ),
  ),
  maxLvl: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(500).annotate({
          expected: "a value less than or equal to 500",
        }),
      ),
  ),
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

export type KillsControllerGetGuildKillStats200 =
  typeof KillsControllerGetGuildKillStats200.Type;

export const KillsControllerGetGuildKillStats200 =
  GuildKillStatsResponseDto_Output;

export type KillsControllerGetUserKillStatsQuery =
  typeof KillsControllerGetUserKillStatsQuery.Type;

export const KillsControllerGetUserKillStatsQuery = Schema.Struct({
  npcTypes: Schema.optionalKey(
    Schema.Array(
      Schema.Literals([
        "COMMON",
        "ELITE",
        "ELITE2",
        "ELITE3",
        "HERO",
        "EVENT_HERO",
        "TITAN",
        "COLOSSUS",
        "NPC",
      ]),
    ),
  ),
  npcType: Schema.optionalKey(
    Schema.Literals([
      "COMMON",
      "ELITE",
      "ELITE2",
      "ELITE3",
      "HERO",
      "EVENT_HERO",
      "TITAN",
      "COLOSSUS",
      "NPC",
    ]),
  ),
  world: Schema.optionalKey(Schema.String),
  topNpcsLimit: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  period: Schema.optionalKey(
    Schema.Literals(["all", "24h", "3d", "7d", "14d", "30d"]),
  ),
});

export type KillsControllerGetUserKillStats200 =
  typeof KillsControllerGetUserKillStats200.Type;

export const KillsControllerGetUserKillStats200 =
  UserKillStatsResponseDto_Output;

export type KillsControllerGetUserNpcKillsQuery =
  typeof KillsControllerGetUserNpcKillsQuery.Type;

export const KillsControllerGetUserNpcKillsQuery = Schema.Struct({
  npcTypes: Schema.optionalKey(
    Schema.Array(
      Schema.Literals([
        "COMMON",
        "ELITE",
        "ELITE2",
        "ELITE3",
        "HERO",
        "EVENT_HERO",
        "TITAN",
        "COLOSSUS",
        "NPC",
      ]),
    ),
  ),
  world: Schema.optionalKey(Schema.String),
  search: Schema.optionalKey(Schema.String),
  cursor: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  limit: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(100).annotate({
          expected: "a value less than or equal to 100",
        }),
      ),
  ),
  sortOrder: Schema.optionalKey(Schema.Literals(["asc", "desc"])),
  sortBy: Schema.optionalKey(Schema.Literals(["kills", "level"])),
  minLvl: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(500).annotate({
          expected: "a value less than or equal to 500",
        }),
      ),
  ),
  maxLvl: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(500).annotate({
          expected: "a value less than or equal to 500",
        }),
      ),
  ),
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

export type KillsControllerGetUserNpcKills200 =
  typeof KillsControllerGetUserNpcKills200.Type;

export const KillsControllerGetUserNpcKills200 = UserNpcKillsResponseDto_Output;

export type KillsControllerGetGuildTopNpcsPathParams =
  typeof KillsControllerGetGuildTopNpcsPathParams.Type;

export const KillsControllerGetGuildTopNpcsPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type KillsControllerGetGuildTopNpcsQuery =
  typeof KillsControllerGetGuildTopNpcsQuery.Type;

export const KillsControllerGetGuildTopNpcsQuery = Schema.Struct({
  limit: FiniteNumber,
  npcType: Schema.optionalKey(NpcType),
  world: Schema.String,
  search: Schema.String,
  minLvl: Schema.String,
  maxLvl: Schema.String,
  period: Schema.String,
});

export type KillsControllerGetGuildTopNpcs200 =
  typeof KillsControllerGetGuildTopNpcs200.Type;

export const KillsControllerGetGuildTopNpcs200 = GuildTopNpcsResponseDto_Output;

export type KillsControllerGetGuildTopKillersByTypePathParams =
  typeof KillsControllerGetGuildTopKillersByTypePathParams.Type;

export const KillsControllerGetGuildTopKillersByTypePathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type KillsControllerGetGuildTopKillersByTypeQuery =
  typeof KillsControllerGetGuildTopKillersByTypeQuery.Type;

export const KillsControllerGetGuildTopKillersByTypeQuery = Schema.Struct({
  limit: FiniteNumber,
  period: Schema.String,
});

export type KillsControllerGetGuildTopKillersByType200 =
  typeof KillsControllerGetGuildTopKillersByType200.Type;

export const KillsControllerGetGuildTopKillersByType200 =
  GuildTopKillersByTypeResponseDto_Output;

export type KillsControllerGetNpcKillersPathParams =
  typeof KillsControllerGetNpcKillersPathParams.Type;

export const KillsControllerGetNpcKillersPathParams = Schema.Struct({
  npcId: Schema.String.annotate({ examples: ["999"] }),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type KillsControllerGetNpcKillersQuery =
  typeof KillsControllerGetNpcKillersQuery.Type;

export const KillsControllerGetNpcKillersQuery = Schema.Struct({
  limit: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(100).annotate({
          expected: "a value less than or equal to 100",
        }),
      ),
  ),
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(
    Schema.Literals(["all", "24h", "3d", "7d", "14d", "30d"]),
  ),
});

export type KillsControllerGetNpcKillers200 =
  typeof KillsControllerGetNpcKillers200.Type;

export const KillsControllerGetNpcKillers200 = NpcKillersResponseDto_Output;

export type KillsControllerGetMemberKillsPathParams =
  typeof KillsControllerGetMemberKillsPathParams.Type;

export const KillsControllerGetMemberKillsPathParams = Schema.Struct({
  memberId: Schema.String.annotate({ examples: ["123"] }),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type KillsControllerGetMemberKillsQuery =
  typeof KillsControllerGetMemberKillsQuery.Type;

export const KillsControllerGetMemberKillsQuery = Schema.Struct({
  minLvl: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(500).annotate({
          expected: "a value less than or equal to 500",
        }),
      ),
  ),
  maxLvl: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(500).annotate({
          expected: "a value less than or equal to 500",
        }),
      ),
  ),
  world: Schema.optionalKey(Schema.String),
  npcTypes: Schema.optionalKey(
    Schema.Array(
      Schema.Literals([
        "COMMON",
        "ELITE",
        "ELITE2",
        "ELITE3",
        "HERO",
        "EVENT_HERO",
        "TITAN",
        "COLOSSUS",
        "NPC",
      ]),
    ),
  ),
  search: Schema.optionalKey(Schema.String),
  limit: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(100).annotate({
          expected: "a value less than or equal to 100",
        }),
      ),
  ),
  cursor: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  period: Schema.optionalKey(
    Schema.Literals(["all", "24h", "3d", "7d", "14d", "30d"]),
  ),
});

export type KillsControllerGetMemberKills200 =
  typeof KillsControllerGetMemberKills200.Type;

export const KillsControllerGetMemberKills200 = MemberKillsResponseDto_Output;
