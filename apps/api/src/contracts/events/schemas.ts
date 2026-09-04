/** Shared input and output schemas for the events feature. */
import * as Schema from "effect/Schema";
import {
  SafeInteger,
  JsonValue,
  NonNegativeSafeInteger,
  NonEmptyString,
  DateTimeString,
  FiniteNumber,
} from "#src/contracts/scalars";

const SpawnWindowTimestamp = DateTimeString.check(
  Schema.isMinLength(1).annotate({
    expected: "a value with a length of at least 1",
  }),
);

const ScoringClockTime = Schema.String.check(
  Schema.isPattern(new RegExp("^([01]\\d|2[0-3]):([0-5]\\d)$")).annotate({
    expected: "a string matching the RegExp ^([01]\\d|2[0-3]):([0-5]\\d)$",
  }),
);

const EventScoringState = JsonValue.annotate({
  identifier: "EventMutationResponseDto__schema0",
});
const EventOverviewScoringState = JsonValue.annotate({
  identifier: "EventOverviewResponseDto__schema0",
});
const KillHistoryBonusBreakdown = JsonValue.annotate({
  identifier: "EventKillHistoryResponseDto__schema0",
});
const MemberKillBonusBreakdown = JsonValue.annotate({
  identifier: "EventMemberKillHistoryResponseDto__schema0",
});
const KillScoringState = JsonValue.annotate({
  identifier: "KillDetailResponseDto__schema0",
});

const EventHeroSummary = Schema.Struct({
  id: Schema.String,
  npcId: Schema.Union([FiniteNumber, Schema.Null]),
  npcName: Schema.String,
  npcIcon: Schema.Union([Schema.String, Schema.Null]),
  npcLvl: Schema.Union([FiniteNumber, Schema.Null]),
});

const NumericScoringCondition = Schema.Struct({
  type: Schema.Literal("NUMERIC"),
  factor: Schema.Literals([
    "trackingDurationPercentage",
    "trackingDurationSeconds",
    "assignedMembersCount",
    "minutesSinceLeaveToKill",
    "timeOnMapSeconds",
    "afkPercentage",
    "respawnDurationSeconds",
    "respawnProgressPercentage",
  ]),
  operator: Schema.Literals([">", ">=", "<", "<=", "==", "!="]),
  value: FiniteNumber,
});

const BooleanScoringCondition = Schema.Struct({
  type: Schema.Literal("BOOLEAN"),
  factor: Schema.Literals(["eligible", "memberPresentAtKill", "wasPresent"]),
  value: Schema.Boolean,
});

const KillTimeWindowCondition = Schema.Struct({
  type: Schema.Literal("KILL_TIME_IN_WINDOW"),
  from: ScoringClockTime,
  to: ScoringClockTime,
});

const RespawnWindowCoverageCondition = Schema.Struct({
  type: Schema.Literal("RESPAWN_WINDOW_COVERAGE"),
  from: ScoringClockTime,
  to: ScoringClockTime,
  operator: Schema.Literals([">", ">=", "<", "<=", "==", "!="]),
  value: FiniteNumber,
});

const ScoringAction = Schema.Struct({
  type: Schema.Literals(["SET_BASE", "ADD_BONUS", "ZERO_BASE"]),
  points: Schema.optionalKey(
    FiniteNumber.check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: "a value greater than or equal to 0",
      }),
    ),
  ),
});

const ScoringRule = Schema.Struct({
  id: Schema.String,
  name: Schema.optionalKey(Schema.String),
  enabled: Schema.optionalKey(Schema.Boolean),
  conditions: Schema.Array(
    Schema.Union(
      [
        NumericScoringCondition,
        BooleanScoringCondition,
        KillTimeWindowCondition,
        RespawnWindowCoverageCondition,
      ],
      { mode: "oneOf" },
    ),
  ),
  action: ScoringAction,
});

const EventScoringRules = Schema.Struct({
  version: FiniteNumber.check(
    Schema.isGreaterThanOrEqualTo(1).annotate({
      expected: "a value greater than or equal to 1",
    }),
  ).check(
    Schema.isLessThanOrEqualTo(1).annotate({
      expected: "a value less than or equal to 1",
    }),
  ),
  timezone: Schema.String,
  hardCapPoints: FiniteNumber.check(
    Schema.isGreaterThanOrEqualTo(0).annotate({
      expected: "a value greater than or equal to 0",
    }),
  ),
  minTrackingPercentForBonuses: Schema.optionalKey(
    FiniteNumber.check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: "a value greater than or equal to 0",
      }),
    ).check(
      Schema.isLessThanOrEqualTo(100).annotate({
        expected: "a value less than or equal to 100",
      }),
    ),
  ),
  rules: Schema.Array(ScoringRule),
});

const EventMapDefinition = Schema.Struct({
  mapId: SafeInteger,
  mapName: Schema.String,
});

const EventHeroDefinition = Schema.Struct({
  npcId: Schema.optionalKey(SafeInteger),
  npcName: Schema.String,
  maps: Schema.Array(EventMapDefinition),
});

const EventRoleAppearance = Schema.Struct({
  position: FiniteNumber,
  color: Schema.Union([FiniteNumber, Schema.Null]),
});

const EventParticipant = Schema.Struct({
  id: FiniteNumber,
  name: Schema.String,
  avatar: Schema.Union([Schema.String, Schema.Null]),
  userId: Schema.String,
});

const EventAssignedMember = Schema.Struct({
  ...EventParticipant.fields,
  roles: Schema.Array(EventRoleAppearance),
});

const EventMapAssignment = Schema.Struct({
  id: Schema.String,
  mapId: FiniteNumber,
  mapName: Schema.String,
  locationId: Schema.Union([Schema.String, Schema.Null]),
  assignedMembers: Schema.Array(EventAssignedMember),
});

const EventRarityTotals = Schema.Struct({
  unique: FiniteNumber,
  heroic: FiniteNumber,
  legendary: FiniteNumber,
});

const EventLeaderboard = Schema.Struct({
  winner: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        memberId: FiniteNumber,
        name: Schema.String,
        avatar: Schema.Union([Schema.String, Schema.Null]),
        primaryValue: FiniteNumber,
        secondaryValue: Schema.optionalKey(
          Schema.Union([FiniteNumber, Schema.Null]),
        ),
      }),
      [Schema.Record(Schema.String, JsonValue)],
    ),
    Schema.Null,
  ]),
  candidateCount: FiniteNumber,
  tiedWinnerCount: FiniteNumber,
});

const EventHeroCoverage = Schema.Struct({
  heroNpcId: Schema.String,
  npcName: Schema.String,
  npcIcon: Schema.Union([Schema.String, Schema.Null]),
  mapCount: FiniteNumber,
  totalKills: FiniteNumber,
  coveragePercentage: FiniteNumber,
});

const ParticipationConfirmation = Schema.Struct({
  killId: Schema.String,
  killedAt: DateTimeString,
  confirmationDeadlineAt: DateTimeString,
  heroNpc: EventHeroSummary,
});

const EventMapParticipation = Schema.Struct({
  mapId: Schema.String,
  mapName: Schema.String,
  assignedAt: DateTimeString,
  unassignedAt: Schema.Union([DateTimeString, Schema.Null]),
  assignmentDurationSeconds: FiniteNumber,
  presenceTimeSeconds: FiniteNumber,
  afkTimeSeconds: FiniteNumber,
});

const PointAdjustment = Schema.Struct({
  pointsDelta: FiniteNumber,
  comment: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(500).annotate({
        expected: "a value with a length of at most 500",
      }),
    ),
  ),
});

const EventCoverageGap = Schema.Struct({
  id: Schema.String,
  mapId: Schema.String,
  heroNpcId: Schema.String,
  gapType: Schema.Literals(["UNASSIGNED", "UNCOVERED"]),
  startedAt: DateTimeString,
  endedAt: Schema.Union([DateTimeString, Schema.Null]),
  durationSeconds: Schema.Union([FiniteNumber, Schema.Null]),
});

const EventSummary = Schema.Struct({
  id: Schema.String,
  guildId: Schema.String,
  name: Schema.String,
  world: Schema.String,
  active: Schema.Boolean,
  startsAt: Schema.Union([DateTimeString, Schema.Null]),
  endsAt: Schema.Union([DateTimeString, Schema.Null]),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
  heroNpcs: Schema.Array(EventHeroSummary),
});

export type EventListItemResponse = typeof EventListItemResponse.Type;

export const EventListItemResponse = EventSummary.annotate({
  identifier: "EventListItemResponseDto",
});

export type CreateEventRequest = typeof CreateEventRequest.Type;

export const CreateEventRequest = Schema.Struct({
  name: Schema.String,
  world: Schema.String,
  startsAt: Schema.optionalKey(DateTimeString),
  endsAt: Schema.optionalKey(DateTimeString),
  basePointsPerKill: Schema.optionalKey(NonNegativeSafeInteger),
  assignmentTimeoutMinutes: Schema.optionalKey(NonNegativeSafeInteger),
  participationConfirmationMinutes: Schema.optionalKey(NonNegativeSafeInteger),
  mapAssignmentCap: Schema.optionalKey(NonNegativeSafeInteger),
  rulebookMarkdown: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(10000).annotate({
        expected: "a value with a length of at most 10000",
      }),
    ),
  ),
  scoringRules: Schema.optionalKey(EventScoringRules),
  scoringMode: Schema.optionalKey(Schema.Literals(["SIMPLE", "ADVANCED"])),
  heroNpcs: Schema.optionalKey(Schema.Array(EventHeroDefinition)),
})
  .check(
    Schema.makeFilter((data) =>
      data.startsAt === undefined ||
      data.endsAt === undefined ||
      Date.parse(data.endsAt) >= Date.parse(data.startsAt)
        ? undefined
        : { path: ["endsAt"], issue: "endsAt must not be before startsAt" },
    ),
  )
  .annotate({ identifier: "CreateEventDto" });

export type EventMutationResponse = typeof EventMutationResponse.Type;

export const EventMutationResponse = Schema.Struct({
  id: Schema.String,
  guildId: Schema.String,
  name: Schema.String,
  world: Schema.String,
  active: Schema.Boolean,
  startsAt: Schema.Union([DateTimeString, Schema.Null]),
  endsAt: Schema.Union([DateTimeString, Schema.Null]),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
  basePointsPerKill: Schema.optionalKey(
    Schema.Union([FiniteNumber, Schema.Null]),
  ),
  assignmentTimeoutMinutes: Schema.optionalKey(
    Schema.Union([FiniteNumber, Schema.Null]),
  ),
  participationConfirmationMinutes: Schema.optionalKey(
    Schema.Union([FiniteNumber, Schema.Null]),
  ),
  mapAssignmentCap: Schema.optionalKey(
    Schema.Union([FiniteNumber, Schema.Null]),
  ),
  rulebookMarkdown: Schema.optionalKey(
    Schema.Union([Schema.String, Schema.Null]),
  ),
  scoringMode: Schema.Literals(["SIMPLE", "ADVANCED"]),
  scoringRules: EventScoringState,
  heroNpcs: Schema.Array(
    Schema.Struct({
      ...EventHeroSummary.fields,
      maps: Schema.Array(EventMapAssignment),
    }),
  ),
}).annotate({ identifier: "EventMutationResponseDto" });

export type EventOverviewResponse = typeof EventOverviewResponse.Type;

export const EventOverviewResponse = Schema.Struct({
  id: Schema.String,
  guildId: Schema.String,
  name: Schema.String,
  world: Schema.String,
  active: Schema.Boolean,
  startsAt: Schema.Union([DateTimeString, Schema.Null]),
  endsAt: Schema.Union([DateTimeString, Schema.Null]),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
  basePointsPerKill: Schema.optionalKey(
    Schema.Union([FiniteNumber, Schema.Null]),
  ),
  assignmentTimeoutMinutes: Schema.optionalKey(
    Schema.Union([FiniteNumber, Schema.Null]),
  ),
  participationConfirmationMinutes: Schema.optionalKey(
    Schema.Union([FiniteNumber, Schema.Null]),
  ),
  mapAssignmentCap: Schema.optionalKey(
    Schema.Union([FiniteNumber, Schema.Null]),
  ),
  rulebookMarkdown: Schema.optionalKey(
    Schema.Union([Schema.String, Schema.Null]),
  ),
  scoringMode: Schema.Literals(["SIMPLE", "ADVANCED"]),
  scoringRules: EventOverviewScoringState,
  heroNpcs: Schema.Array(EventHeroSummary),
}).annotate({ identifier: "EventOverviewResponseDto" });

export type UpdateEventRequest = typeof UpdateEventRequest.Type;

export const UpdateEventRequest = Schema.Struct({
  name: Schema.optionalKey(Schema.String),
  startsAt: Schema.optionalKey(DateTimeString),
  endsAt: Schema.optionalKey(DateTimeString),
  heroNpcs: Schema.optionalKey(Schema.Array(EventHeroDefinition)),
  basePointsPerKill: Schema.optionalKey(NonNegativeSafeInteger),
  assignmentTimeoutMinutes: Schema.optionalKey(NonNegativeSafeInteger),
  participationConfirmationMinutes: Schema.optionalKey(NonNegativeSafeInteger),
  mapAssignmentCap: Schema.optionalKey(NonNegativeSafeInteger),
  rulebookMarkdown: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(10000).annotate({
        expected: "a value with a length of at most 10000",
      }),
    ),
  ),
  scoringRules: Schema.optionalKey(EventScoringRules),
  scoringMode: Schema.optionalKey(Schema.Literals(["SIMPLE", "ADVANCED"])),
}).annotate({ identifier: "UpdateEventDto" });

export type EventWrappedResponse = typeof EventWrappedResponse.Type;

export const EventWrappedResponse = Schema.Struct({
  generatedAt: DateTimeString,
  event: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    world: Schema.String,
    startsAt: Schema.Union([DateTimeString, Schema.Null]),
    endsAt: Schema.Union([DateTimeString, Schema.Null]),
    heroCount: FiniteNumber,
    mapCount: FiniteNumber,
    spawnCount: FiniteNumber,
  }),
  overview: Schema.Struct({
    totalKills: FiniteNumber,
    participantCount: FiniteNumber,
    totalPoints: FiniteNumber,
    totalTrackedSeconds: FiniteNumber,
    totalAfkSeconds: FiniteNumber,
    coveragePercentage: FiniteNumber,
    avgMapsPerSpawnWindow: FiniteNumber,
    busiestHour: Schema.Union([FiniteNumber, Schema.Null]),
    busiestHourKills: FiniteNumber,
    totalLoots: FiniteNumber,
    rarityTotals: EventRarityTotals,
  }),
  leaders: Schema.Struct({
    topHunter: EventLeaderboard,
    topScorer: EventLeaderboard,
    longestDuty: EventLeaderboard,
    topAfk: EventLeaderboard,
    mostFlexible: EventLeaderboard,
    topEfficiency: EventLeaderboard,
  }),
  coverage: Schema.Struct({
    totalWindowCount: FiniteNumber,
    totalWindowSeconds: FiniteNumber,
    totalCoverageSeconds: FiniteNumber,
    totalUncoveredSeconds: FiniteNumber,
    totalUnassignedSeconds: FiniteNumber,
    coveragePercentage: FiniteNumber,
    avgMapsPerSpawnWindow: FiniteNumber,
    bestHeroCoverage: Schema.Union([
      Schema.StructWithRest(EventHeroCoverage, [
        Schema.Record(Schema.String, JsonValue),
      ]),
      Schema.Null,
    ]),
    roughestHeroCoverage: Schema.Union([
      Schema.StructWithRest(EventHeroCoverage, [
        Schema.Record(Schema.String, JsonValue),
      ]),
      Schema.Null,
    ]),
  }),
  heroes: Schema.Array(
    Schema.Struct({
      heroNpcId: Schema.String,
      npcId: Schema.Union([FiniteNumber, Schema.Null]),
      npcName: Schema.String,
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      mapCount: FiniteNumber,
      totalKills: FiniteNumber,
      totalPoints: FiniteNumber,
      coveragePercentage: FiniteNumber,
      rarityTotals: EventRarityTotals,
      topHunter: EventLeaderboard,
    }),
  ),
  loot: Schema.Struct({
    totalLoots: FiniteNumber,
    rarityTotals: EventRarityTotals,
    heroBreakdown: Schema.Array(
      Schema.Struct({
        heroNpcId: Schema.String,
        npcName: Schema.String,
        npcIcon: Schema.Union([Schema.String, Schema.Null]),
        totalLoots: FiniteNumber,
        rarityTotals: EventRarityTotals,
      }),
    ),
  }),
}).annotate({ identifier: "EventWrappedApiResponseDto_Output" });

export type EventMapsResponse = typeof EventMapsResponse.Type;

export const EventMapsResponse = Schema.Struct({
  id: Schema.String,
  heroNpcs: Schema.Array(
    Schema.Struct({
      ...EventHeroSummary.fields,
      locations: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          name: Schema.String,
          order: FiniteNumber,
          maps: Schema.Array(EventMapAssignment),
        }),
      ),
      maps: Schema.Array(EventMapAssignment),
    }),
  ),
}).annotate({ identifier: "EventMapsResponseDto_Output" });

export type AssignEventMemberRequest = typeof AssignEventMemberRequest.Type;

export const AssignEventMemberRequest = Schema.Struct({
  memberId: SafeInteger,
}).annotate({ identifier: "AssignMemberDto" });

export type CreateEventHeroRequest = typeof CreateEventHeroRequest.Type;

export const CreateEventHeroRequest = Schema.Struct({
  npcId: Schema.optionalKey(SafeInteger),
  npcName: Schema.String,
  maps: Schema.optionalKey(Schema.Array(EventMapDefinition)),
}).annotate({ identifier: "CreateHeroDto" });

export type UpdateEventHeroRequest = typeof UpdateEventHeroRequest.Type;

export const UpdateEventHeroRequest = Schema.Struct({
  npcName: Schema.String,
  npcId: Schema.optionalKey(FiniteNumber),
}).annotate({ identifier: "UpdateHeroDto" });

export type CreateEventMapRequest = typeof CreateEventMapRequest.Type;

export const CreateEventMapRequest = EventMapDefinition.annotate({
  identifier: "CreateMapDto",
});

export type EventMapResponse = typeof EventMapResponse.Type;

export const EventMapResponse = EventMapAssignment.annotate({
  identifier: "EventMapResponseDto_Output",
});

export type CreateEventLocationRequest = typeof CreateEventLocationRequest.Type;

export const CreateEventLocationRequest = Schema.Struct({
  name: NonEmptyString.check(
    Schema.isMaxLength(50).annotate({
      expected: "a value with a length of at most 50",
    }),
  ),
}).annotate({ identifier: "CreateLocationDto" });

export type UpdateEventLocationRequest = typeof UpdateEventLocationRequest.Type;

export const UpdateEventLocationRequest = Schema.Struct({
  name: Schema.optionalKey(
    NonEmptyString.check(
      Schema.isMaxLength(50).annotate({
        expected: "a value with a length of at most 50",
      }),
    ),
  ),
}).annotate({ identifier: "UpdateLocationDto" });

export type ReorderEventLocationsRequest =
  typeof ReorderEventLocationsRequest.Type;

export const ReorderEventLocationsRequest = Schema.Struct({
  locationIds: Schema.Array(Schema.String),
}).annotate({ identifier: "ReorderLocationsDto" });

export type AssignEventMapLocationRequest =
  typeof AssignEventMapLocationRequest.Type;

export const AssignEventMapLocationRequest = Schema.Struct({
  locationId: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
}).annotate({ identifier: "AssignMapLocationDto" });

export type PendingParticipationConfirmationsResponse =
  typeof PendingParticipationConfirmationsResponse.Type;

export const PendingParticipationConfirmationsResponse = Schema.Struct({
  items: Schema.Array(ParticipationConfirmation),
  expiredItems: Schema.Array(ParticipationConfirmation),
}).annotate({ identifier: "PendingParticipationConfirmationsResponseDto" });

export type AcknowledgeExpiredParticipationConfirmationsRequest =
  typeof AcknowledgeExpiredParticipationConfirmationsRequest.Type;

export const AcknowledgeExpiredParticipationConfirmationsRequest =
  Schema.Struct({
    killIds: Schema.Array(Schema.String).check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ),
  }).annotate({
    identifier: "AcknowledgeExpiredParticipationConfirmationsDto",
  });

export type AcknowledgeExpiredParticipationConfirmationsResponse =
  typeof AcknowledgeExpiredParticipationConfirmationsResponse.Type;

export const AcknowledgeExpiredParticipationConfirmationsResponse =
  Schema.Struct({
    acknowledgedCount: NonNegativeSafeInteger,
  }).annotate({
    identifier:
      "AcknowledgeExpiredParticipationConfirmationsResponseDto_Output",
  });

export type ConfirmParticipationForKillResponse =
  typeof ConfirmParticipationForKillResponse.Type;

export const ConfirmParticipationForKillResponse = Schema.Struct({
  success: Schema.Boolean,
  confirmedNow: Schema.Boolean,
}).annotate({ identifier: "ConfirmParticipationForKillResponseDto_Output" });

export type EventRankingEntryResponse = typeof EventRankingEntryResponse.Type;

export const EventRankingEntryResponse = Schema.Struct({
  id: Schema.String,
  eventId: Schema.String,
  memberId: FiniteNumber,
  heroNpcName: Schema.String,
  totalPoints: FiniteNumber,
  totalKills: FiniteNumber,
  totalTimeSeconds: FiniteNumber,
  avgAfkPercentage: FiniteNumber,
  pointsModified: Schema.Boolean,
  updatedAt: DateTimeString,
  member: Schema.Struct({
    id: FiniteNumber,
    name: Schema.String,
    roles: Schema.Array(EventRoleAppearance),
  }),
  editHistory: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      rankingId: Schema.String,
      previousPoints: FiniteNumber,
      newPoints: FiniteNumber,
      deltaPoints: FiniteNumber,
      editType: Schema.Literals(["KILL_POINT", "RANKING"]),
      editedByUserId: Schema.String,
      editedByName: Schema.Union([Schema.String, Schema.Null]),
      comment: Schema.Union([Schema.String, Schema.Null]),
      editedAt: DateTimeString,
    }),
  ),
}).annotate({ identifier: "EventRankingEntryResponseDto" });

export type UpdateRankingPointsRequest = typeof UpdateRankingPointsRequest.Type;

export const UpdateRankingPointsRequest = PointAdjustment.annotate({
  identifier: "UpdateRankingPointsDto",
});

export type EventTimerResponse = typeof EventTimerResponse.Type;

export const EventTimerResponse = Schema.Struct({
  npcId: FiniteNumber,
  world: Schema.String,
  minSpawnTime: DateTimeString,
  maxSpawnTime: DateTimeString,
  npc: Schema.Struct({
    name: Schema.String,
    icon: Schema.Union([Schema.String, Schema.Null]),
  }),
}).annotate({ identifier: "EventTimerResponseDto" });

export type EventHeroStatsResponse = typeof EventHeroStatsResponse.Type;

export const EventHeroStatsResponse = Schema.Struct({
  heroId: Schema.String,
  npcId: Schema.Union([FiniteNumber, Schema.Null]),
  npcName: Schema.String,
  npcLvl: Schema.Union([FiniteNumber, Schema.Null]),
  npcProf: Schema.Union([Schema.String, Schema.Null]),
  killCount: FiniteNumber,
}).annotate({ identifier: "EventHeroStatsResponseDto" });

const KillParticipation = Schema.Struct({
  id: Schema.String,
  memberId: FiniteNumber,
  points: FiniteNumber,
  basePoints: FiniteNumber,
  manualAdjustmentPoints: Schema.optionalKey(
    Schema.Union([FiniteNumber, Schema.Null]),
  ),
  trackingDurationSeconds: Schema.Union([FiniteNumber, Schema.Null]),
  trackingDurationPercentage: Schema.Union([FiniteNumber, Schema.Null]),
  timeOnMapSeconds: FiniteNumber,
  afkPercentage: FiniteNumber,
  wasPresent: Schema.Boolean,
  bonusBreakdown: Schema.optionalKey(KillHistoryBonusBreakdown),
  member: EventParticipant,
  mapData: Schema.optionalKey(Schema.Array(EventMapParticipation)),
});

export type EventKillHistoryResponse = typeof EventKillHistoryResponse.Type;

export const EventKillHistoryResponse = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      heroNpcId: Schema.String,
      killedAt: DateTimeString,
      minSpawnTimeAtKill: DateTimeString,
      maxSpawnTimeAtKill: DateTimeString,
      isManualClose: Schema.Boolean,
      heroNpc: EventHeroSummary,
      points: Schema.Array(KillParticipation),
    }),
  ),
  nextCursor: Schema.Union([Schema.String, Schema.Null]),
}).annotate({ identifier: "EventKillHistoryResponseDto" });

export type EventMemberKillHistoryResponse =
  typeof EventMemberKillHistoryResponse.Type;

export const EventMemberKillHistoryResponse = Schema.Struct({
  member: EventParticipant,
  data: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      heroNpcId: Schema.String,
      killedAt: DateTimeString,
      minSpawnTimeAtKill: DateTimeString,
      maxSpawnTimeAtKill: DateTimeString,
      isManualClose: Schema.Boolean,
      heroNpc: EventHeroSummary,
      memberPoint: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            ...KillParticipation.fields,
            bonusBreakdown: Schema.optionalKey(MemberKillBonusBreakdown),
          }),
          [Schema.Record(Schema.String, JsonValue)],
        ),
        Schema.Null,
      ]),
    }),
  ),
  nextCursor: Schema.Union([Schema.String, Schema.Null]),
}).annotate({ identifier: "EventMemberKillHistoryResponseDto" });

export type EventKillDetailResponse = typeof EventKillDetailResponse.Type;

export const EventKillDetailResponse = Schema.Struct({
  kill: Schema.Struct({
    id: Schema.String,
    heroNpcId: Schema.String,
    killedAt: DateTimeString,
    minSpawnTimeAtKill: DateTimeString,
    maxSpawnTimeAtKill: DateTimeString,
    timerCreatedById: Schema.Union([FiniteNumber, Schema.Null]),
    isManualClose: Schema.Boolean,
    respawnDurationSeconds: Schema.Union([FiniteNumber, Schema.Null]),
    windowDurationSeconds: Schema.Union([FiniteNumber, Schema.Null]),
    resolvedAfterMaxSpawnTimeMs: Schema.Union([FiniteNumber, Schema.Null]),
    heroNpc: Schema.Struct({
      ...EventHeroSummary.fields,
      event: Schema.Struct({
        id: Schema.String,
        name: Schema.String,
        world: Schema.String,
      }),
    }),
    timerCreatedBy: Schema.Union([
      Schema.StructWithRest(EventParticipant, [
        Schema.Record(Schema.String, JsonValue),
      ]),
      Schema.Null,
    ]),
    points: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        memberId: FiniteNumber,
        points: FiniteNumber,
        basePoints: FiniteNumber,
        manualAdjustmentPoints: Schema.optionalKey(
          Schema.Union([FiniteNumber, Schema.Null]),
        ),
        trackingDurationSeconds: Schema.Union([FiniteNumber, Schema.Null]),
        trackingDurationPercentage: Schema.Union([FiniteNumber, Schema.Null]),
        timeOnMapSeconds: FiniteNumber,
        afkPercentage: FiniteNumber,
        wasPresent: Schema.Boolean,
        bonusBreakdown: Schema.optionalKey(KillScoringState),
        member: Schema.Struct({
          ...EventParticipant.fields,
          roles: Schema.Array(
            Schema.Struct({
              position: Schema.Union([FiniteNumber, Schema.Null]),
              color: Schema.Union([FiniteNumber, Schema.Null]),
            }),
          ),
        }),
        mapData: Schema.optionalKey(
          Schema.Array(
            Schema.Struct({
              mapId: Schema.String,
              mapName: Schema.String,
              assignedAt: DateTimeString,
              unassignedAt: Schema.Union([DateTimeString, Schema.Null]),
              assignmentDurationSeconds: FiniteNumber,
              presenceTimeSeconds: FiniteNumber,
              afkTimeSeconds: FiniteNumber,
            }),
          ),
        ),
      }),
    ),
  }),
  eventConfig: Schema.Struct({
    scoringMode: Schema.Literals(["SIMPLE", "ADVANCED"]),
    scoringRules: KillScoringState,
  }),
}).annotate({ identifier: "KillDetailResponseDto" });

export type UpdateKillPointRequest = typeof UpdateKillPointRequest.Type;

export const UpdateKillPointRequest = PointAdjustment.annotate({
  identifier: "UpdateKillPointDto",
});

export type EventCoordinationResponse = typeof EventCoordinationResponse.Type;

export const EventCoordinationResponse = Schema.Struct({
  assignmentTimeoutMinutes: FiniteNumber,
  generatedAt: DateTimeString,
  eventId: Schema.String,
  world: Schema.String,
  summary: Schema.Struct({
    criticalCount: FiniteNumber,
    warningCount: FiniteNumber,
    coveredMaps: FiniteNumber,
    totalMaps: FiniteNumber,
    nextSpawnAt: Schema.Union([DateTimeString, Schema.Null]),
  }),
  heroes: Schema.Array(
    Schema.Struct({
      heroId: Schema.String,
      npcId: Schema.Union([FiniteNumber, Schema.Null]),
      npcName: Schema.String,
      npcIcon: Schema.Union([Schema.String, Schema.Null]),
      npcLvl: Schema.Union([FiniteNumber, Schema.Null]),
      timer: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            npcId: FiniteNumber,
            world: Schema.String,
            minSpawnTime: DateTimeString,
            maxSpawnTime: DateTimeString,
            status: Schema.Literals(["OPEN", "WAITING", "OVERDUE", "NONE"]),
            overdueMs: Schema.Union([FiniteNumber, Schema.Null]),
          }),
          [Schema.Record(Schema.String, JsonValue)],
        ),
        Schema.Null,
      ]),
      coverage: Schema.Struct({
        totalMaps: FiniteNumber,
        assignedMaps: FiniteNumber,
        coveredMaps: FiniteNumber,
        unassignedMaps: FiniteNumber,
        uncoveredMaps: FiniteNumber,
        activeGapCount: FiniteNumber,
      }),
      activeGaps: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          mapId: Schema.String,
          numericMapId: FiniteNumber,
          mapName: Schema.String,
          gapType: Schema.Literals(["UNASSIGNED", "UNCOVERED"]),
          startedAt: DateTimeString,
          durationSeconds: FiniteNumber,
        }),
      ),
      priority: Schema.Literals(["CRITICAL", "WARNING", "OK", "IDLE"]),
      recommendedAction: Schema.Literals([
        "CLOSE_WINDOW",
        "ASSIGN_MAPS",
        "JOIN_MAP",
        "WAIT",
        "NONE",
      ]),
    }),
  ),
}).annotate({ identifier: "EventCoordinationResponseDto" });

export type KillTimelineMapResponse = typeof KillTimelineMapResponse.Type;

export const KillTimelineMapResponse = Schema.Struct({
  mapId: Schema.String,
  mapName: Schema.String,
  numericMapId: FiniteNumber,
  assignments: Schema.Array(
    Schema.Struct({
      memberId: FiniteNumber,
      memberName: Schema.String,
      memberAvatar: Schema.Union([Schema.String, Schema.Null]),
      memberUserId: Schema.String,
      assignedAt: DateTimeString,
      unassignedAt: Schema.Union([DateTimeString, Schema.Null]),
    }),
  ),
  gaps: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      gapType: Schema.Literals(["UNASSIGNED", "UNCOVERED"]),
      startedAt: DateTimeString,
      endedAt: Schema.Union([DateTimeString, Schema.Null]),
      durationSeconds: Schema.Union([FiniteNumber, Schema.Null]),
    }),
  ),
}).annotate({ identifier: "KillTimelineMapResponseDto" });

export type HeroCoverageGapResponse = typeof HeroCoverageGapResponse.Type;

export const HeroCoverageGapResponse = Schema.Struct({
  id: Schema.String,
  mapId: Schema.String,
  heroNpcId: Schema.String,
  gapType: Schema.Literals(["UNASSIGNED", "UNCOVERED"]),
  startedAt: DateTimeString,
  endedAt: Schema.Union([DateTimeString, Schema.Null]),
  durationSeconds: Schema.Union([FiniteNumber, Schema.Null]),
  map: Schema.Struct({
    mapName: Schema.String,
    mapId: FiniteNumber,
  }),
}).annotate({ identifier: "HeroCoverageGapResponseDto" });

export type CoverageGapResponse = typeof CoverageGapResponse.Type;

export const CoverageGapResponse = EventCoverageGap.annotate({
  identifier: "CoverageGapResponseDto",
});

export type ActiveCoverageGapResponse = typeof ActiveCoverageGapResponse.Type;

export const ActiveCoverageGapResponse = Schema.Union([
  Schema.StructWithRest(EventCoverageGap, [
    Schema.Record(Schema.String, JsonValue),
  ]),
  Schema.Null,
]).annotate({ identifier: "NullableCoverageGapResponseDto" });

export type HeroPresenceStatsResponse = typeof HeroPresenceStatsResponse.Type;

export const HeroPresenceStatsResponse = Schema.Struct({
  totalCoverageSeconds: FiniteNumber,
  totalEventSeconds: FiniteNumber,
  presencePercentage: FiniteNumber,
  memberStats: Schema.Array(
    Schema.Struct({
      memberId: FiniteNumber,
      memberName: Schema.String,
      memberAvatar: Schema.Union([Schema.String, Schema.Null]),
      totalTimeSeconds: FiniteNumber,
      afkTimeSeconds: FiniteNumber,
      afkPercentage: FiniteNumber,
    }),
  ),
}).annotate({ identifier: "HeroPresenceStatsResponseDto" });

export type HeroRespawnConfigResponse = typeof HeroRespawnConfigResponse.Type;

export const HeroRespawnConfigResponse = Schema.Struct({
  hasTimer: Schema.Boolean,
  windowStatus: Schema.Literals(["OPEN", "WAITING", "OVERDUE", "NONE"]),
  minSpawnTime: Schema.Union([DateTimeString, Schema.Null]),
  maxSpawnTime: Schema.Union([DateTimeString, Schema.Null]),
  overdueMs: Schema.Union([FiniteNumber, Schema.Null]),
}).annotate({ identifier: "HeroRespawnConfigResponseDto" });

export type CloseRespawnWindowRequest = typeof CloseRespawnWindowRequest.Type;

export const CloseRespawnWindowRequest = Schema.Struct({
  createNewWindow: Schema.optionalKey(Schema.Boolean),
  newMinSpawnTime: Schema.optionalKey(DateTimeString),
  newMaxSpawnTime: Schema.optionalKey(DateTimeString),
})
  .check(
    Schema.makeFilter((data) =>
      !data.createNewWindow ||
      (data.newMinSpawnTime !== undefined && data.newMaxSpawnTime !== undefined)
        ? undefined
        : "newMinSpawnTime and newMaxSpawnTime are required when createNewWindow is true",
    ),
  )
  .annotate({ identifier: "CloseRespawnWindowDto" });

export type OpenRespawnWindowRequest = typeof OpenRespawnWindowRequest.Type;

export const OpenRespawnWindowRequest = Schema.Struct({
  minSpawnTime: SpawnWindowTimestamp,
  maxSpawnTime: SpawnWindowTimestamp,
})
  .check(
    Schema.makeFilter((data) =>
      Date.parse(data.maxSpawnTime) >= Date.parse(data.minSpawnTime)
        ? undefined
        : {
            path: ["maxSpawnTime"],
            issue: "maxSpawnTime must not be before minSpawnTime",
          },
    ),
  )
  .annotate({ identifier: "OpenRespawnWindowDto" });

export type PinnedEventResponse = typeof PinnedEventResponse.Type;

export const PinnedEventResponse = Schema.Struct({
  pinnedAt: DateTimeString,
  event: EventSummary,
}).annotate({ identifier: "PinnedEventResponseDto" });

export type EventOrganizationPath = typeof EventOrganizationPath.Type;

export const EventOrganizationPath = Schema.Struct({ guildId: Schema.String });

export type EventListQuery = typeof EventListQuery.Type;

export const EventListQuery = Schema.Struct({
  world: Schema.optionalKey(Schema.String),
  activeOnly: Schema.optionalKey(Schema.String),
});

export type EventListResponse = typeof EventListResponse.Type;

export const EventListResponse = Schema.Array(EventListItemResponse);

export type EventPath = typeof EventPath.Type;

export const EventPath = Schema.Struct({
  eventId: Schema.String,
  guildId: Schema.String,
});

export type EventMapPath = typeof EventMapPath.Type;

export const EventMapPath = Schema.Struct({
  eventId: Schema.String,
  mapId: Schema.String,
  guildId: Schema.String,
});

export type UnassignEventMemberQuery = typeof UnassignEventMemberQuery.Type;

export const UnassignEventMemberQuery = Schema.Struct({
  memberId: Schema.optionalKey(Schema.String),
});

export type EventHeroPath = typeof EventHeroPath.Type;

export const EventHeroPath = Schema.Struct({
  eventId: Schema.String,
  heroId: Schema.String,
  guildId: Schema.String,
});

export type EventHeroMapPath = typeof EventHeroMapPath.Type;

export const EventHeroMapPath = Schema.Struct({
  eventId: Schema.String,
  heroId: Schema.String,
  mapId: Schema.String,
  guildId: Schema.String,
});

export type EventLocationPath = typeof EventLocationPath.Type;

export const EventLocationPath = Schema.Struct({
  eventId: Schema.String,
  heroId: Schema.String,
  locationId: Schema.String,
  guildId: Schema.String,
});

export type EventKillPath = typeof EventKillPath.Type;

export const EventKillPath = Schema.Struct({
  eventId: Schema.String,
  killId: Schema.String,
  guildId: Schema.String,
});

export type EventRankingResponse = typeof EventRankingResponse.Type;

export const EventRankingResponse = Schema.Array(EventRankingEntryResponse);

export type EventRankingPath = typeof EventRankingPath.Type;

export const EventRankingPath = Schema.Struct({
  eventId: Schema.String,
  rankingId: Schema.String,
  guildId: Schema.String,
});

export type EventTimersQuery = typeof EventTimersQuery.Type;

export const EventTimersQuery = Schema.Struct({ world: Schema.String });

export type EventTimersResponse = typeof EventTimersResponse.Type;

export const EventTimersResponse = Schema.Array(EventTimerResponse);

export type EventHeroStatsListResponse = typeof EventHeroStatsListResponse.Type;

export const EventHeroStatsListResponse = Schema.Array(EventHeroStatsResponse);

export type EventKillHistoryQuery = typeof EventKillHistoryQuery.Type;

export const EventKillHistoryQuery = Schema.Struct({
  limit: Schema.optionalKey(Schema.String),
  cursor: Schema.optionalKey(Schema.String),
  heroId: Schema.optionalKey(Schema.String),
});

export type EventMemberPath = typeof EventMemberPath.Type;

export const EventMemberPath = Schema.Struct({
  eventId: Schema.String,
  memberId: Schema.String,
  guildId: Schema.String,
});

export type HeroKillHistoryQuery = typeof HeroKillHistoryQuery.Type;

export const HeroKillHistoryQuery = Schema.Struct({
  limit: Schema.optionalKey(Schema.String),
  cursor: Schema.optionalKey(Schema.String),
});

export type EventHeroKillPath = typeof EventHeroKillPath.Type;

export const EventHeroKillPath = Schema.Struct({
  eventId: Schema.String,
  heroId: Schema.String,
  killId: Schema.String,
  guildId: Schema.String,
});

export type EventKillPointPath = typeof EventKillPointPath.Type;

export const EventKillPointPath = Schema.Struct({
  eventId: Schema.String,
  killId: Schema.String,
  killPointId: Schema.String,
  guildId: Schema.String,
});

export type EventKillTimelineResponse = typeof EventKillTimelineResponse.Type;

export const EventKillTimelineResponse = Schema.Array(KillTimelineMapResponse);

export type HeroCoverageGapsResponse = typeof HeroCoverageGapsResponse.Type;

export const HeroCoverageGapsResponse = Schema.Array(HeroCoverageGapResponse);

export type CoverageGapsResponse = typeof CoverageGapsResponse.Type;

export const CoverageGapsResponse = Schema.Array(CoverageGapResponse);

export type PinnedEventsResponse = typeof PinnedEventsResponse.Type;

export const PinnedEventsResponse = Schema.Array(PinnedEventResponse);
