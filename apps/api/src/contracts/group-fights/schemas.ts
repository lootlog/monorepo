import {
  isQualifyingGroupFightMap,
  isGroupFightMap,
} from "@lootlog/domain/group-fight-maps";
import {
  countGroupFightTeamSizes,
  isGroupFightComposition,
} from "@lootlog/domain/group-fights";
/** Shared input and output schemas for the group fights ("ustawki") feature. */
import * as Schema from "effect/Schema";
import {
  DateTimeString,
  FiniteNumber,
  NonEmptyString,
  NonNegativeSafeInteger,
  PageSize,
  SafeInteger,
} from "@lootlog/schema/http-scalars";
import {
  GroupFightOutcomeSchema,
  GroupFightParticipantResultSchema,
  GroupFightPeriodSchema,
  GroupFightQualificationSourceSchema,
  GroupFightRejectionReasonSchema,
  GroupFightSideResultSchema,
  GroupFightTeamSchema,
  GROUP_FIGHT_FULL_TEAM_SIZE,
} from "@lootlog/schema/group-fights";

const boundedString = (maxLength: number) =>
  Schema.String.check(
    Schema.isMaxLength(maxLength).annotate({
      expected: `a value with a length of at most ${maxLength}`,
    }),
  );

const boundedNonEmptyString = (maxLength: number) =>
  NonEmptyString.check(
    Schema.isMaxLength(maxLength).annotate({
      expected: `a value with a length of at most ${maxLength}`,
    }),
  );

export const GroupFightTeam = GroupFightTeamSchema.annotate({
  identifier: "GroupFightTeam",
});

export const GroupFightPeriod = GroupFightPeriodSchema.annotate({
  identifier: "GroupFightPeriod",
});

export type GroupFightParticipantInput = typeof GroupFightParticipantInput.Type;

export const GroupFightParticipantInput = Schema.Struct({
  characterId: boundedNonEmptyString(64),
  accountId: Schema.optionalKey(
    Schema.Union([boundedNonEmptyString(64), Schema.Null]),
  ),
  name: boundedNonEmptyString(255),
  lvl: NonNegativeSafeInteger,
  prof: boundedString(16),
  icon: boundedString(2048),
  team: GroupFightTeam,
  joinedAt: DateTimeString,
  fled: Schema.Boolean,
}).annotate({ identifier: "GroupFightParticipantDto" });

export type CreateGroupFightRequest = typeof CreateGroupFightRequest.Type;

export const CreateGroupFightRequest = Schema.Struct({
  world: boundedNonEmptyString(64),
  accountId: boundedNonEmptyString(64),
  characterId: boundedNonEmptyString(64),
  submissionKey: boundedNonEmptyString(128),
  map: Schema.Struct({
    id: NonNegativeSafeInteger,
    pvp: Schema.Literal(2),
    name: boundedNonEmptyString(255),
  }),
  qualification: Schema.Struct({
    source: GroupFightQualificationSourceSchema,
    npc: Schema.optionalKey(
      Schema.Struct({
        id: SafeInteger,
        name: boundedString(255),
        wt: SafeInteger,
      }),
    ),
  }),
  startedAt: DateTimeString,
  endedAt: DateTimeString,
  myTeam: GroupFightTeam,
  winningTeam: Schema.Union([GroupFightTeam, Schema.Null]),
  participants: Schema.Array(GroupFightParticipantInput)
    .check(
      Schema.isMinLength(3).annotate({
        expected: "a value with a length of at least 3",
      }),
    )
    .check(
      Schema.isMaxLength(GROUP_FIGHT_FULL_TEAM_SIZE * 2).annotate({
        expected: `a value with a length of at most ${GROUP_FIGHT_FULL_TEAM_SIZE * 2}`,
      }),
    ),
  battleId: Schema.optionalKey(
    Schema.Union([boundedNonEmptyString(128), Schema.Null]),
  ),
})
  .check(
    Schema.makeFilter((data) =>
      Date.parse(data.endedAt) >= Date.parse(data.startedAt)
        ? undefined
        : {
            path: ["endedAt"],
            issue: "endedAt must not be before startedAt",
          },
    ),
  )
  .check(
    Schema.makeFilter((data) => {
      if (!isGroupFightComposition(countGroupFightTeamSizes(data.participants)))
        return "Each team must have one to ten players and at least one team must have two";
      if (data.participants.some((p) => !/^[1-9]\d*$/.test(p.characterId)))
        return "Only player characters may participate";
      if (
        new Set(data.participants.map((p) => p.characterId)).size !==
        data.participants.length
      )
        return "Participants must be unique";
      const self = data.participants.find(
        (p) => p.characterId === data.characterId,
      );
      if (
        !self ||
        self.team !== data.myTeam ||
        self.accountId !== data.accountId
      )
        return "Submitting character must participate on myTeam";
      if (
        data.participants.some(
          (p) => Date.parse(p.joinedAt) > Date.parse(data.endedAt),
        )
      )
        return "Participant cannot join after fight ends";
      if (
        data.qualification.source === "CATALOG" &&
        !isGroupFightMap(data.map.name)
      )
        return "Map is not in the catalog";
      if (
        data.qualification.source === "NPC_OBSERVED" &&
        !isQualifyingGroupFightMap({
          name: null,
          pvp: data.map.pvp,
          observedNpcWeight: data.qualification.npc?.wt,
        })
      )
        return "Observed NPC must be elite II or titan";
      return undefined;
    }),
  )
  .annotate({ identifier: "CreateGroupFightDto" });

export type CreateGroupFightResponse = typeof CreateGroupFightResponse.Type;

export const CreateGroupFightResponse = Schema.Struct({
  submittedGuilds: Schema.Array(
    Schema.Struct({
      guildId: Schema.String,
      groupFightId: FiniteNumber,
      deduplicated: Schema.Boolean,
    }),
  ),
  rejectedGuilds: Schema.Array(
    Schema.Struct({
      guildId: Schema.String,
      reason: GroupFightRejectionReasonSchema,
    }),
  ),
}).annotate({ identifier: "CreateGroupFightResponseDto_Output" });

export type GroupFightOrganizationPath = typeof GroupFightOrganizationPath.Type;

export const GroupFightOrganizationPath = Schema.Struct({
  guildId: NonEmptyString,
});

export type GroupFightPath = typeof GroupFightPath.Type;

export const GroupFightPath = Schema.Struct({
  guildId: NonEmptyString,
  fightId: NonEmptyString,
});

export type GuildGroupFightRankingQuery =
  typeof GuildGroupFightRankingQuery.Type;

export const GuildGroupFightRankingQuery = Schema.Struct({
  world: Schema.optionalKey(Schema.String),
  period: Schema.optionalKey(GroupFightPeriod),
  npcType: Schema.optionalKey(Schema.Literals(["ELITE2", "TITAN"])),
  mapId: Schema.optionalKey(SafeInteger),
});

const GroupFightMemberReference = Schema.Struct({
  memberId: FiniteNumber,
  memberUserId: Schema.String,
  memberName: Schema.String,
  memberAvatar: Schema.Union([Schema.String, Schema.Null]),
});

export type GuildGroupFightRankingResponse =
  typeof GuildGroupFightRankingResponse.Type;

export const GuildGroupFightRankingResponse = Schema.Struct({
  maps: Schema.Array(
    Schema.Struct({
      mapId: FiniteNumber,
      mapName: Schema.String,
      npcType: Schema.Literals(["ELITE2", "TITAN"]),
      npcNames: Schema.Array(Schema.String),
      totalFights: FiniteNumber,
      wins: FiniteNumber,
      losses: FiniteNumber,
      draws: FiniteNumber,
      totalDurationSeconds: FiniteNumber,
    }),
  ),
  summary: Schema.Struct({
    totalFights: FiniteNumber,
    wins: FiniteNumber,
    losses: FiniteNumber,
    draws: FiniteNumber,
    fullTeamFights: FiniteNumber,
    totalDurationSeconds: FiniteNumber,
  }),
  ranking: Schema.Array(
    Schema.Struct({
      ...GroupFightMemberReference.fields,
      fights: FiniteNumber,
      wins: FiniteNumber,
      losses: FiniteNumber,
      draws: FiniteNumber,
      flees: FiniteNumber,
      winRate: FiniteNumber,
      totalSeconds: FiniteNumber,
      lastFightAt: Schema.Union([DateTimeString, Schema.Null]),
      characters: Schema.Array(
        Schema.Struct({
          characterId: Schema.String,
          name: Schema.String,
          prof: Schema.String,
          lvl: FiniteNumber,
          icon: Schema.String,
          world: Schema.String,
          fights: FiniteNumber,
          wins: FiniteNumber,
          losses: FiniteNumber,
          draws: FiniteNumber,
          flees: FiniteNumber,
          totalSeconds: FiniteNumber,
        }),
      ),
    }),
  ),
}).annotate({ identifier: "GuildGroupFightRankingResponseDto_Output" });

export type GuildGroupFightsQuery = typeof GuildGroupFightsQuery.Type;

export const GuildGroupFightsQuery = Schema.Struct({
  ...GuildGroupFightRankingQuery.fields,
  cursor: Schema.optionalKey(NonNegativeSafeInteger),
  limit: Schema.optionalKey(PageSize),
});

const GroupFightSummaryFields = {
  id: FiniteNumber,
  world: Schema.String,
  mapId: Schema.Union([FiniteNumber, Schema.Null]),
  mapName: Schema.String,
  startedAt: DateTimeString,
  endedAt: DateTimeString,
  durationSeconds: FiniteNumber,
  teamOneSize: FiniteNumber,
  teamTwoSize: FiniteNumber,
  outcome: GroupFightOutcomeSchema,
  winningTeam: Schema.Union([GroupFightTeam, Schema.Null]),
  ourTeam: GroupFightTeam,
  result: GroupFightSideResultSchema,
  hasFlee: Schema.Boolean,
  memberCount: FiniteNumber,
  battleIds: Schema.Array(Schema.String),
} as const;

export type GroupFightSummaryResponse = typeof GroupFightSummaryResponse.Type;

export const GroupFightSummaryResponse = Schema.Struct(
  GroupFightSummaryFields,
).annotate({ identifier: "GroupFightSummaryResponseDto_Output" });

export type GuildGroupFightsResponse = typeof GuildGroupFightsResponse.Type;

export const GuildGroupFightsResponse = Schema.Struct({
  fights: Schema.Array(GroupFightSummaryResponse),
  pagination: Schema.Struct({
    total: FiniteNumber,
    cursor: FiniteNumber,
    limit: FiniteNumber,
    hasNext: Schema.Boolean,
  }),
}).annotate({ identifier: "GuildGroupFightsResponseDto_Output" });

export type GroupFightParticipantResponse =
  typeof GroupFightParticipantResponse.Type;

export const GroupFightParticipantResponse = Schema.Struct({
  characterId: Schema.String,
  accountId: Schema.Union([Schema.String, Schema.Null]),
  name: Schema.String,
  prof: Schema.String,
  lvl: FiniteNumber,
  icon: Schema.String,
  team: GroupFightTeam,
  result: GroupFightParticipantResultSchema,
  participationSeconds: FiniteNumber,
  fled: Schema.Boolean,
  member: Schema.Union([GroupFightMemberReference, Schema.Null]),
}).annotate({ identifier: "GroupFightParticipantResponseDto_Output" });

export type GroupFightDetailResponse = typeof GroupFightDetailResponse.Type;

export const GroupFightDetailResponse = Schema.Struct({
  ...GroupFightSummaryFields,
  participants: Schema.Array(GroupFightParticipantResponse),
}).annotate({ identifier: "GroupFightDetailResponseDto_Output" });
