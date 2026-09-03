import { EVENT_SCORING_MODES } from "@lootlog/domain/scoring";
import { Schema } from "effect";
import {
  isoDatetimeCodec,
  jsonValueSchema,
  nullableIsoDatetimeCodec,
} from "#src/shared/schema/response-codecs";

export const EventHeroNpcResponse = Schema.Struct({
  id: Schema.String,
  npcId: Schema.NullOr(Schema.Number),
  npcName: Schema.String,
  npcIcon: Schema.NullOr(Schema.String),
  npcLvl: Schema.NullOr(Schema.Number),
});

const EventMemberRoleResponse = Schema.Struct({
  position: Schema.Number,
  color: Schema.NullOr(Schema.Number),
});

const EventAssignedMemberResponse = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  avatar: Schema.NullOr(Schema.String),
  userId: Schema.String,
  roles: Schema.Array(EventMemberRoleResponse),
});

const EventMapResponse = Schema.Struct({
  id: Schema.String,
  mapId: Schema.Number,
  mapName: Schema.String,
  locationId: Schema.NullOr(Schema.String),
  assignedMembers: Schema.Array(EventAssignedMemberResponse),
});

const EventLocationResponse = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  order: Schema.Number,
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
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
  heroNpcs: Schema.Array(EventHeroNpcResponse),
});

export const EventOverviewResponse = Schema.Struct({
  ...EventListItemResponse.fields,
  basePointsPerKill: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  assignmentTimeoutMinutes: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  participationConfirmationMinutes: Schema.optionalKey(
    Schema.NullOr(Schema.Number),
  ),
  mapAssignmentCap: Schema.optionalKey(Schema.NullOr(Schema.Number)),
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
  id: Schema.Number,
  name: Schema.String,
  roles: Schema.Array(EventMemberRoleResponse),
});

const RankingEditHistoryEntryResponse = Schema.Struct({
  id: Schema.String,
  rankingId: Schema.String,
  previousPoints: Schema.Number,
  newPoints: Schema.Number,
  deltaPoints: Schema.Number,
  editType: Schema.Literals(["KILL_POINT", "RANKING"]),
  editedByUserId: Schema.String,
  editedByName: Schema.NullOr(Schema.String),
  comment: Schema.NullOr(Schema.String),
  editedAt: isoDatetimeCodec,
});

const EventRankingEntryResponse = Schema.Struct({
  id: Schema.String,
  eventId: Schema.String,
  memberId: Schema.Number,
  heroNpcName: Schema.String,
  totalPoints: Schema.Number,
  totalKills: Schema.Number,
  totalTimeSeconds: Schema.Number,
  avgAfkPercentage: Schema.Number,
  pointsModified: Schema.Boolean,
  updatedAt: isoDatetimeCodec,
  member: EventRankingMemberResponse,
  editHistory: Schema.Array(RankingEditHistoryEntryResponse),
});

export const EventRankingResponse = Schema.Array(EventRankingEntryResponse);

const PendingParticipationConfirmationResponse = Schema.Struct({
  killId: Schema.String,
  killedAt: isoDatetimeCodec,
  confirmationDeadlineAt: isoDatetimeCodec,
  heroNpc: EventHeroNpcResponse,
});

export const PendingParticipationConfirmationsResponse = Schema.Struct({
  items: Schema.Array(PendingParticipationConfirmationResponse),
  expiredItems: Schema.Array(PendingParticipationConfirmationResponse),
});

const EventTimerResponse = Schema.Struct({
  npcId: Schema.Number,
  world: Schema.String,
  minSpawnTime: isoDatetimeCodec,
  maxSpawnTime: isoDatetimeCodec,
  npc: Schema.Struct({
    name: Schema.String,
    icon: Schema.NullOr(Schema.String),
  }),
});

export const EventTimersResponse = Schema.Array(EventTimerResponse);
