/** Transport schemas owned by the kills HTTP module. */
import * as Schema from "effect/Schema";

export type CreateKillDto = {
  readonly world: string;
  readonly npc: {
    readonly id: number;
    readonly name: string;
    readonly lvl: number;
    readonly prof?: string;
    readonly wt: number;
    readonly icon?: string;
  };
  readonly characterId: string;
  readonly accountId: string;
};

export const CreateKillDto = Schema.Struct({
  world: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  npc: Schema.Struct({
    id: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    name: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ),
    lvl: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    prof: Schema.optionalKey(Schema.String),
    wt: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
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

export type CreateKillResponseDto_Output = {
  readonly updated: number;
  readonly deduplicated?: boolean;
};

export const CreateKillResponseDto_Output = Schema.Struct({
  updated: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  deduplicated: Schema.optionalKey(Schema.Boolean),
}).annotate({ identifier: "CreateKillResponseDto_Output" });

export type GuildKillStatsResponseDto_Output = {
  readonly overview: {
    readonly guildUniqueKills: number;
    readonly totalMemberParticipations: number;
    readonly killsByType: {
      readonly COMMON?: number;
      readonly ELITE?: number;
      readonly ELITE2?: number;
      readonly ELITE3?: number;
      readonly HERO?: number;
      readonly TITAN?: number;
      readonly COLOSSUS?: number;
      readonly NPC?: number;
      readonly EVENT_HERO?: number;
    };
    readonly participationsByType: {
      readonly COMMON?: number;
      readonly ELITE?: number;
      readonly ELITE2?: number;
      readonly ELITE3?: number;
      readonly HERO?: number;
      readonly TITAN?: number;
      readonly COLOSSUS?: number;
      readonly NPC?: number;
      readonly EVENT_HERO?: number;
    };
  };
  readonly memberRanking: ReadonlyArray<{
    readonly memberId: number;
    readonly memberName: string;
    readonly memberAvatar: string | null;
    readonly memberUserId: string;
    readonly totalParticipations: number;
    readonly participationsByType: {
      readonly COMMON?: number;
      readonly ELITE?: number;
      readonly ELITE2?: number;
      readonly ELITE3?: number;
      readonly HERO?: number;
      readonly TITAN?: number;
      readonly COLOSSUS?: number;
      readonly NPC?: number;
      readonly EVENT_HERO?: number;
    };
  }>;
};

export const GuildKillStatsResponseDto_Output = Schema.Struct({
  overview: Schema.Struct({
    guildUniqueKills: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    totalMemberParticipations: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    killsByType: Schema.Struct({
      COMMON: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      ELITE: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      ELITE2: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      ELITE3: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      HERO: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      TITAN: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      COLOSSUS: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      NPC: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      EVENT_HERO: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
    }),
    participationsByType: Schema.Struct({
      COMMON: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      ELITE: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      ELITE2: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      ELITE3: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      HERO: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      TITAN: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      COLOSSUS: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      NPC: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      EVENT_HERO: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
    }),
  }),
  memberRanking: Schema.Array(
    Schema.Struct({
      memberId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      memberName: Schema.String,
      memberAvatar: Schema.Union([Schema.String, Schema.Null]),
      memberUserId: Schema.String,
      totalParticipations: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      participationsByType: Schema.Struct({
        COMMON: Schema.optionalKey(
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
        ),
        ELITE: Schema.optionalKey(
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
        ),
        ELITE2: Schema.optionalKey(
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
        ),
        ELITE3: Schema.optionalKey(
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
        ),
        HERO: Schema.optionalKey(
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
        ),
        TITAN: Schema.optionalKey(
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
        ),
        COLOSSUS: Schema.optionalKey(
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
        ),
        NPC: Schema.optionalKey(
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
        ),
        EVENT_HERO: Schema.optionalKey(
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
        ),
      }),
    }),
  ),
}).annotate({ identifier: "GuildKillStatsResponseDto_Output" });

export type UserKillStatsResponseDto_Output = {
  readonly overview: {
    readonly totalKills: number;
    readonly killsByType: {
      readonly COMMON?: number;
      readonly ELITE?: number;
      readonly ELITE2?: number;
      readonly ELITE3?: number;
      readonly HERO?: number;
      readonly TITAN?: number;
      readonly COLOSSUS?: number;
      readonly NPC?: number;
      readonly EVENT_HERO?: number;
    };
    readonly killsByWorld: { readonly [x: string]: number };
  };
  readonly topNpcs: ReadonlyArray<{
    readonly npcId: number;
    readonly npcName: string;
    readonly npcType: string;
    readonly npcLvl: number;
    readonly npcIcon: string | null;
    readonly npcProf?: string | null;
    readonly totalKills: number;
  }>;
};

export const UserKillStatsResponseDto_Output = Schema.Struct({
  overview: Schema.Struct({
    totalKills: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    killsByType: Schema.Struct({
      COMMON: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      ELITE: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      ELITE2: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      ELITE3: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      HERO: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      TITAN: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      COLOSSUS: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      NPC: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      EVENT_HERO: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
    }),
    killsByWorld: Schema.Record(
      Schema.String,
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    ),
  }),
  topNpcs: Schema.Array(
    Schema.Struct({
      npcId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      npcName: Schema.String,
      npcType: Schema.String,
      npcLvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      npcProf: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
      totalKills: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  ),
}).annotate({ identifier: "UserKillStatsResponseDto_Output" });

export type UserNpcKillsResponseDto_Output = {
  readonly npcs: ReadonlyArray<{
    readonly npcId: number;
    readonly npcName: string;
    readonly npcType: string;
    readonly npcLvl: number;
    readonly npcProf: string | null;
    readonly npcIcon: string | null;
    readonly totalKills: number;
  }>;
  readonly pagination: {
    readonly total: number;
    readonly cursor: number;
    readonly limit: number;
    readonly hasNext: boolean;
  };
};

export const UserNpcKillsResponseDto_Output = Schema.Struct({
  npcs: Schema.Array(
    Schema.Struct({
      npcId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      npcName: Schema.String,
      npcType: Schema.String,
      npcLvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      npcProf: Schema.Union([Schema.String, Schema.Null]),
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      totalKills: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  ),
  pagination: Schema.Struct({
    total: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    cursor: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    limit: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    hasNext: Schema.Boolean,
  }),
}).annotate({ identifier: "UserNpcKillsResponseDto_Output" });

export type NpcType =
  | "COMMON"
  | "ELITE"
  | "ELITE2"
  | "ELITE3"
  | "HERO"
  | "EVENT_HERO"
  | "TITAN"
  | "COLOSSUS"
  | "NPC";

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

export type KillsControllerGetGuildTopNpcsParams = {
  readonly limit: number;
  readonly npcType?: NpcType;
  readonly world: string;
  readonly search: string;
  readonly minLvl: string;
  readonly maxLvl: string;
  readonly period: string;
};

export const KillsControllerGetGuildTopNpcsParams = Schema.Struct({
  limit: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  npcType: Schema.optionalKey(NpcType),
  world: Schema.String,
  search: Schema.String,
  minLvl: Schema.String,
  maxLvl: Schema.String,
  period: Schema.String,
});

export type GuildTopNpcsResponseDto_Output = {
  readonly topNpcs: ReadonlyArray<{
    readonly npcId: number;
    readonly npcName: string;
    readonly npcType: string;
    readonly npcLvl: number;
    readonly npcIcon: string | null;
    readonly uniqueKills: number;
  }>;
};

export const GuildTopNpcsResponseDto_Output = Schema.Struct({
  topNpcs: Schema.Array(
    Schema.Struct({
      npcId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      npcName: Schema.String,
      npcType: Schema.String,
      npcLvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      uniqueKills: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  ),
}).annotate({ identifier: "GuildTopNpcsResponseDto_Output" });

export type GuildTopKillersByTypeResponseDto_Output = {
  readonly TITAN?: ReadonlyArray<{
    readonly memberId: number;
    readonly memberName: string;
    readonly memberAvatar: string | null;
    readonly memberUserId: string;
    readonly totalParticipations: number;
  }>;
  readonly HERO?: ReadonlyArray<{
    readonly memberId: number;
    readonly memberName: string;
    readonly memberAvatar: string | null;
    readonly memberUserId: string;
    readonly totalParticipations: number;
  }>;
  readonly EVENT_HERO?: ReadonlyArray<{
    readonly memberId: number;
    readonly memberName: string;
    readonly memberAvatar: string | null;
    readonly memberUserId: string;
    readonly totalParticipations: number;
  }>;
};

export const GuildTopKillersByTypeResponseDto_Output = Schema.Struct({
  TITAN: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        memberId: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        memberName: Schema.String,
        memberAvatar: Schema.Union([Schema.String, Schema.Null]),
        memberUserId: Schema.String,
        totalParticipations: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      }),
    ),
  ),
  HERO: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        memberId: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        memberName: Schema.String,
        memberAvatar: Schema.Union([Schema.String, Schema.Null]),
        memberUserId: Schema.String,
        totalParticipations: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      }),
    ),
  ),
  EVENT_HERO: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        memberId: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        memberName: Schema.String,
        memberAvatar: Schema.Union([Schema.String, Schema.Null]),
        memberUserId: Schema.String,
        totalParticipations: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      }),
    ),
  ),
}).annotate({ identifier: "GuildTopKillersByTypeResponseDto_Output" });

export type NpcKillersResponseDto_Output = {
  readonly npc:
    | ({
        readonly npcId: number;
        readonly npcName: string;
        readonly npcType: string;
        readonly npcLvl: number;
        readonly npcProf: string | null;
        readonly npcIcon: string | null;
        readonly uniqueGuildKills: number;
        readonly totalMemberParticipations: number;
      } & { readonly [x: string]: Schema.Json })
    | null;
  readonly killers: ReadonlyArray<{
    readonly memberId: number;
    readonly memberName: string;
    readonly memberAvatar: string | null;
    readonly memberUserId: string;
    readonly participationCount: number;
  }>;
};

export const NpcKillersResponseDto_Output = Schema.Struct({
  npc: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        npcId: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        npcName: Schema.String,
        npcType: Schema.String,
        npcLvl: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        npcProf: Schema.Union([Schema.String, Schema.Null]),
        npcIcon: Schema.Union([Schema.String, Schema.Null]),
        uniqueGuildKills: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        totalMemberParticipations: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
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
      memberId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      memberName: Schema.String,
      memberAvatar: Schema.Union([Schema.String, Schema.Null]),
      memberUserId: Schema.String,
      participationCount: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  ),
}).annotate({ identifier: "NpcKillersResponseDto_Output" });

export type MemberKillsResponseDto_Output = {
  readonly member:
    | ({
        readonly memberId: number;
        readonly memberName: string;
        readonly memberAvatar: string | null;
        readonly memberUserId: string;
      } & { readonly [x: string]: Schema.Json })
    | null;
  readonly overview:
    | ({
        readonly totalParticipations: number;
        readonly participationsByType: { readonly [x: string]: number };
      } & { readonly [x: string]: Schema.Json })
    | null;
  readonly npcs: ReadonlyArray<{
    readonly npcId: number;
    readonly npcName: string;
    readonly npcType: string;
    readonly npcLvl: number;
    readonly npcProf: string | null;
    readonly npcIcon: string | null;
    readonly totalKills: number;
  }>;
  readonly pagination:
    | ({
        readonly total: number;
        readonly cursor: number;
        readonly limit: number;
        readonly hasNext: boolean;
      } & { readonly [x: string]: Schema.Json })
    | null;
};

export const MemberKillsResponseDto_Output = Schema.Struct({
  member: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        memberId: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
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
        totalParticipations: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        participationsByType: Schema.Record(
          Schema.String,
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
        ),
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
      npcId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      npcName: Schema.String,
      npcType: Schema.String,
      npcLvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      npcProf: Schema.Union([Schema.String, Schema.Null]),
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      totalKills: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  ),
  pagination: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        total: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        cursor: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        limit: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
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

export type KillsControllerCreateKillRequestJson = CreateKillDto;

export const KillsControllerCreateKillRequestJson = CreateKillDto;

export type KillsControllerCreateKill201 = CreateKillResponseDto_Output;

export const KillsControllerCreateKill201 = CreateKillResponseDto_Output;

export type KillsControllerGetGuildKillStatsPathParams = {
  readonly guildId: Schema.Json;
};

export const KillsControllerGetGuildKillStatsPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type KillsControllerGetGuildKillStatsQuery = {
  readonly npcTypes?: ReadonlyArray<
    | "COMMON"
    | "ELITE"
    | "ELITE2"
    | "ELITE3"
    | "HERO"
    | "EVENT_HERO"
    | "TITAN"
    | "COLOSSUS"
    | "NPC"
  >;
  readonly minLvl?: number;
  readonly maxLvl?: number;
  readonly world?: string;
  readonly period?: "all" | "24h" | "3d" | "7d" | "14d" | "30d";
};

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
  GuildKillStatsResponseDto_Output;

export const KillsControllerGetGuildKillStats200 =
  GuildKillStatsResponseDto_Output;

export type KillsControllerGetUserKillStatsQuery = {
  readonly npcTypes?: ReadonlyArray<
    | "COMMON"
    | "ELITE"
    | "ELITE2"
    | "ELITE3"
    | "HERO"
    | "EVENT_HERO"
    | "TITAN"
    | "COLOSSUS"
    | "NPC"
  >;
  readonly npcType?:
    | "COMMON"
    | "ELITE"
    | "ELITE2"
    | "ELITE3"
    | "HERO"
    | "EVENT_HERO"
    | "TITAN"
    | "COLOSSUS"
    | "NPC";
  readonly world?: string;
  readonly topNpcsLimit?: number;
  readonly period?: "all" | "24h" | "3d" | "7d" | "14d" | "30d";
};

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
  UserKillStatsResponseDto_Output;

export const KillsControllerGetUserKillStats200 =
  UserKillStatsResponseDto_Output;

export type KillsControllerGetUserNpcKillsQuery = {
  readonly npcTypes?: ReadonlyArray<
    | "COMMON"
    | "ELITE"
    | "ELITE2"
    | "ELITE3"
    | "HERO"
    | "EVENT_HERO"
    | "TITAN"
    | "COLOSSUS"
    | "NPC"
  >;
  readonly world?: string;
  readonly search?: string;
  readonly cursor?: number;
  readonly limit?: number;
  readonly sortOrder?: "asc" | "desc";
  readonly sortBy?: "kills" | "level";
  readonly minLvl?: number;
  readonly maxLvl?: number;
  readonly period?: "all" | "24h" | "3d" | "7d" | "14d" | "30d";
};

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

export type KillsControllerGetUserNpcKills200 = UserNpcKillsResponseDto_Output;

export const KillsControllerGetUserNpcKills200 = UserNpcKillsResponseDto_Output;

export type KillsControllerGetGuildTopNpcsPathParams = {
  readonly guildId: Schema.Json;
};

export const KillsControllerGetGuildTopNpcsPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type KillsControllerGetGuildTopNpcsQuery = {
  readonly limit: number;
  readonly npcType?: NpcType;
  readonly world: string;
  readonly search: string;
  readonly minLvl: string;
  readonly maxLvl: string;
  readonly period: string;
};

export const KillsControllerGetGuildTopNpcsQuery = Schema.Struct({
  limit: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  npcType: Schema.optionalKey(NpcType),
  world: Schema.String,
  search: Schema.String,
  minLvl: Schema.String,
  maxLvl: Schema.String,
  period: Schema.String,
});

export type KillsControllerGetGuildTopNpcs200 = GuildTopNpcsResponseDto_Output;

export const KillsControllerGetGuildTopNpcs200 = GuildTopNpcsResponseDto_Output;

export type KillsControllerGetGuildTopKillersByTypePathParams = {
  readonly guildId: Schema.Json;
};

export const KillsControllerGetGuildTopKillersByTypePathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type KillsControllerGetGuildTopKillersByTypeQuery = {
  readonly limit: number;
  readonly period: string;
};

export const KillsControllerGetGuildTopKillersByTypeQuery = Schema.Struct({
  limit: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  period: Schema.String,
});

export type KillsControllerGetGuildTopKillersByType200 =
  GuildTopKillersByTypeResponseDto_Output;

export const KillsControllerGetGuildTopKillersByType200 =
  GuildTopKillersByTypeResponseDto_Output;

export type KillsControllerGetNpcKillersPathParams = {
  readonly npcId: string;
  readonly guildId: Schema.Json;
};

export const KillsControllerGetNpcKillersPathParams = Schema.Struct({
  npcId: Schema.String.annotate({ examples: ["999"] }),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type KillsControllerGetNpcKillersQuery = {
  readonly limit?: number;
  readonly world?: string;
  readonly period?: "all" | "24h" | "3d" | "7d" | "14d" | "30d";
};

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

export type KillsControllerGetNpcKillers200 = NpcKillersResponseDto_Output;

export const KillsControllerGetNpcKillers200 = NpcKillersResponseDto_Output;

export type KillsControllerGetMemberKillsPathParams = {
  readonly memberId: string;
  readonly guildId: Schema.Json;
};

export const KillsControllerGetMemberKillsPathParams = Schema.Struct({
  memberId: Schema.String.annotate({ examples: ["123"] }),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type KillsControllerGetMemberKillsQuery = {
  readonly minLvl?: number;
  readonly maxLvl?: number;
  readonly world?: string;
  readonly npcTypes?: ReadonlyArray<
    | "COMMON"
    | "ELITE"
    | "ELITE2"
    | "ELITE3"
    | "HERO"
    | "EVENT_HERO"
    | "TITAN"
    | "COLOSSUS"
    | "NPC"
  >;
  readonly search?: string;
  readonly limit?: number;
  readonly cursor?: number;
  readonly period?: "all" | "24h" | "3d" | "7d" | "14d" | "30d";
};

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

export type KillsControllerGetMemberKills200 = MemberKillsResponseDto_Output;

export const KillsControllerGetMemberKills200 = MemberKillsResponseDto_Output;
