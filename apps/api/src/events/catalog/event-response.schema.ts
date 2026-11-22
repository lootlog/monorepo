import { IsoDateTime } from "@lootlog/schema/primitives";
import { EVENT_SCORING_MODES } from "@lootlog/domain/scoring";
import { Schema } from "effect";
import { MemberSummary } from "#src/contracts/shared";
import {
  jsonValueSchema,
  nullableIsoDatetimeCodec,
} from "#src/shared/schema/response-codecs";

const EventHeroNpcResponse = Schema.Struct({
  id: Schema.String,
  npcId: Schema.NullOr(Schema.Finite),
  npcName: Schema.String,
  npcIcon: Schema.NullOr(Schema.String),
  npcLvl: Schema.NullOr(Schema.Finite),
});

const EventMemberRoleResponse = Schema.Struct({
  position: Schema.Finite,
  color: Schema.NullOr(Schema.Finite),
});

const EventAssignedMemberResponse = Schema.Struct({
  ...MemberSummary.fields,
  roles: Schema.Array(EventMemberRoleResponse),
});

const EventMapResponse = Schema.Struct({
  id: Schema.String,
  mapId: Schema.Finite,
  mapName: Schema.String,
  locationId: Schema.NullOr(Schema.String),
  assignedMembers: Schema.Array(EventAssignedMemberResponse),
});

const EventLocationResponse = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  order: Schema.Finite,
  maps: Schema.Array(EventMapResponse),
});

export const EventListItemResponse = Schema.Struct({
  id: Schema.String,
  guildId: Schema.String,
  name: Schema.String,
  world: Schema.String,
  active: Schema.Boolean,
  startsAt: nullableIsoDatetimeCodec,
  endsAt: nullableIsoDatetimeCodec,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
  heroNpcs: Schema.Array(EventHeroNpcResponse),
});

export const EventOverviewResponse = Schema.Struct({
  ...EventListItemResponse.fields,
  basePointsPerKill: Schema.optionalKey(Schema.NullOr(Schema.Finite)),
  assignmentTimeoutMinutes: Schema.optionalKey(Schema.NullOr(Schema.Finite)),
  participationConfirmationMinutes: Schema.optionalKey(
    Schema.NullOr(Schema.Finite),
  ),
  mapAssignmentCap: Schema.optionalKey(Schema.NullOr(Schema.Finite)),
  rulebookMarkdown: Schema.optionalKey(Schema.NullOr(Schema.String)),
  scoringMode: Schema.Literals(EVENT_SCORING_MODES),
  scoringRules: Schema.NullOr(jsonValueSchema),
});

const EventMutationHeroResponse = Schema.Struct({
  ...EventHeroNpcResponse.fields,
  maps: Schema.Array(EventMapResponse),
});

const EventMapsHeroResponse = Schema.Struct({
  ...EventHeroNpcResponse.fields,
  locations: Schema.Array(EventLocationResponse),
  maps: Schema.Array(EventMapResponse),
});

export const EventMutationResponse = Schema.Struct({
  ...EventOverviewResponse.fields,
  heroNpcs: Schema.Array(EventMutationHeroResponse),
});

export const EventMapsResponse = Schema.Struct({
  id: Schema.String,
  heroNpcs: Schema.Array(EventMapsHeroResponse),
});

export const EventsListResponse = Schema.Array(EventListItemResponse);

const EventRankingMemberResponse = Schema.Struct({
  ...MemberSummary.fields,
  roles: Schema.Array(EventMemberRoleResponse),
});

const RankingEditHistoryEntryResponse = Schema.Struct({
  id: Schema.String,
  rankingId: Schema.String,
  previousPoints: Schema.Finite,
  newPoints: Schema.Finite,
  deltaPoints: Schema.Finite,
  editType: Schema.Literals(["KILL_POINT", "RANKING"]),
  editedByUserId: Schema.String,
  editedByName: Schema.NullOr(Schema.String),
  comment: Schema.NullOr(Schema.String),
  editedAt: IsoDateTime,
});

const EventRankingEntryResponse = Schema.Struct({
  id: Schema.String,
  eventId: Schema.String,
  memberId: Schema.Finite,
  heroNpcName: Schema.String,
  totalPoints: Schema.Finite,
  totalKills: Schema.Finite,
  totalTimeSeconds: Schema.Finite,
  avgAfkPercentage: Schema.Finite,
  pointsModified: Schema.Boolean,
  updatedAt: IsoDateTime,
  member: EventRankingMemberResponse,
  editHistory: Schema.Array(RankingEditHistoryEntryResponse),
});

export const EventRankingResponse = Schema.Array(EventRankingEntryResponse);

const PendingParticipationConfirmationResponse = Schema.Struct({
  killId: Schema.String,
  killedAt: IsoDateTime,
  confirmationDeadlineAt: IsoDateTime,
  heroNpc: EventHeroNpcResponse,
});

export const PendingParticipationConfirmationsResponse = Schema.Struct({
  items: Schema.Array(PendingParticipationConfirmationResponse),
  expiredItems: Schema.Array(PendingParticipationConfirmationResponse),
});

const EventTimerResponse = Schema.Struct({
  npcId: Schema.Finite,
  world: Schema.String,
  minSpawnTime: IsoDateTime,
  maxSpawnTime: IsoDateTime,
  npc: Schema.Struct({
    name: Schema.String,
    icon: Schema.NullOr(Schema.String),
  }),
});

export const EventTimersResponse = Schema.Array(EventTimerResponse);
