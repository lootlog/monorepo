import {
  InternalMemberIdentityResponse,
  InternalUserPermissionsQuery,
} from "@lootlog/schema/internal-guilds";
import { UserGuildPermissionsDtoSchema } from "@lootlog/schema/permissions";
import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";
import {
  RpcForbiddenError,
  RpcNotFoundError,
  RpcUnauthorizedError,
  RpcUnavailableError,
} from "./errors.js";

const MemberActor = {
  userId: Schema.String,
  discordId: Schema.String,
};

const MemberGuildActor = {
  ...MemberActor,
  guildId: Schema.String,
};

const MemberReadError = Schema.Union([
  RpcUnauthorizedError,
  RpcForbiddenError,
  RpcNotFoundError,
  RpcUnavailableError,
]);

export const RpcGuildLookup = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  vanityUrl: Schema.optionalKey(Schema.NullOr(Schema.String)),
  ownerId: Schema.String,
});

export type RpcGuildLookup = typeof RpcGuildLookup.Type;

export const RpcAccessibleGuild = Schema.Struct({
  id: Schema.String,
  hasLootlogAccess: Schema.Boolean,
  isAccessDataStale: Schema.Boolean,
});

export type RpcAccessibleGuild = typeof RpcAccessibleGuild.Type;

export const RpcEventSummary = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  world: Schema.String,
  active: Schema.Boolean,
  startsAt: Schema.NullOr(Schema.String),
  endsAt: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  heroNpcs: Schema.Array(
    Schema.Struct({
      npcId: Schema.NullOr(Schema.Finite),
      npcName: Schema.String,
      npcLvl: Schema.NullOr(Schema.Finite),
    }),
  ),
});

export const RpcEventRankingEntry = Schema.Struct({
  heroNpcName: Schema.String,
  totalPoints: Schema.Finite,
  totalKills: Schema.Finite,
  member: Schema.Struct({ id: Schema.Finite, name: Schema.String }),
});

export const RpcEventTimer = Schema.Struct({
  npcId: Schema.Finite,
  minSpawnTime: Schema.String,
  maxSpawnTime: Schema.String,
});

const RpcEventWrappedLeader = Schema.Struct({
  winner: Schema.NullOr(
    Schema.Struct({
      member: Schema.Struct({ name: Schema.String }),
      primaryValue: Schema.Finite,
    }),
  ),
});

export const RpcEventWrapped = Schema.Struct({
  overview: Schema.Struct({
    totalKills: Schema.Finite,
    participantCount: Schema.Finite,
    totalPoints: Schema.Finite,
    coveragePercentage: Schema.Finite,
    totalLoots: Schema.Finite,
  }),
  leaders: Schema.Struct({
    topHunter: RpcEventWrappedLeader,
    topScorer: RpcEventWrappedLeader,
    longestDuty: RpcEventWrappedLeader,
  }),
});

export const RpcGuildTimer = Schema.Struct({
  timerKey: Schema.String,
  world: Schema.String,
  minSpawnTime: Schema.String,
  maxSpawnTime: Schema.String,
  wasReset: Schema.Boolean,
  npc: Schema.Struct({
    name: Schema.String,
    lvl: Schema.Finite,
    type: Schema.String,
    location: Schema.String,
    icon: Schema.NullOr(Schema.String),
  }),
  member: Schema.optionalKey(Schema.Struct({ name: Schema.String })),
  deletedAt: Schema.optionalKey(Schema.NullOr(Schema.String)),
  entranceClosesAt: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

const RpcRankedMember = Schema.Struct({
  name: Schema.String,
  userId: Schema.String,
});

export const RpcGuildKillStats = Schema.Struct({
  overview: Schema.Struct({ guildUniqueKills: Schema.Finite }),
  memberRanking: Schema.Array(
    Schema.Struct({
      member: RpcRankedMember,
      totalParticipations: Schema.Finite,
      participationsByType: Schema.Record(Schema.String, Schema.Finite),
    }),
  ),
});

export const RpcTopKilledNpcs = Schema.Struct({
  topNpcs: Schema.Array(
    Schema.Struct({
      npcId: Schema.Finite,
      npcName: Schema.String,
      npcType: Schema.String,
      npcLvl: Schema.Finite,
    }),
  ),
});

export const RpcNpcKillers = Schema.Struct({
  npc: Schema.NullOr(
    Schema.Struct({
      npcName: Schema.String,
      npcType: Schema.String,
      npcLvl: Schema.Finite,
      npcIcon: Schema.NullOr(Schema.String),
      uniqueGuildKills: Schema.Finite,
      totalMemberParticipations: Schema.Finite,
    }),
  ),
  killers: Schema.Array(
    Schema.Struct({
      member: RpcRankedMember,
      participationCount: Schema.Finite,
    }),
  ),
});

export const RpcGuildLoot = Schema.Struct({
  createdAt: Schema.String,
  world: Schema.String,
  items: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      rarity: Schema.NullOr(Schema.String),
    }),
  ),
  players: Schema.Array(Schema.Struct({ name: Schema.String })),
  npcs: Schema.Array(
    Schema.Struct({
      id: Schema.Finite,
      name: Schema.String,
      type: Schema.NullOr(Schema.String),
      wt: Schema.NullOr(Schema.Finite),
      lvl: Schema.NullOr(Schema.Finite),
    }),
  ),
});

export const RpcGuildLootPage = Schema.Struct({
  items: Schema.Array(RpcGuildLoot),
});

export const RpcReservation = Schema.Struct({
  spotName: Schema.String,
  startsAt: Schema.String,
  endsAt: Schema.String,
  author: Schema.Struct({ displayName: Schema.String }),
  sourceOrganization: Schema.Struct({
    name: Schema.String,
    isCurrent: Schema.Boolean,
  }),
});

export const RpcReservationPage = Schema.Struct({
  items: Schema.Array(RpcReservation),
});

export const RpcReservationSpot = Schema.Struct({
  name: Schema.String,
  level: Schema.Finite,
  currentReservation: Schema.NullOr(RpcReservation),
  nextReservation: Schema.NullOr(RpcReservation),
});

export class ApiRpcGroup extends RpcGroup.make(
  Rpc.make("getUserGuildPermissions", {
    payload: InternalUserPermissionsQuery,
    success: Schema.Array(UserGuildPermissionsDtoSchema),
    error: RpcUnavailableError,
  }),
  Rpc.make("getGuildByIdOrVanityUrl", {
    payload: {
      idOrVanityUrl: Schema.String,
    },
    success: RpcGuildLookup,
    error: Schema.Union([RpcNotFoundError, RpcUnavailableError]),
  }),
  Rpc.make("getMemberIdentity", {
    payload: {
      guildId: Schema.String,
      discordId: Schema.String,
    },
    success: InternalMemberIdentityResponse,
    error: Schema.Union([RpcNotFoundError, RpcUnavailableError]),
  }),
  Rpc.make("getUserAccessibleGuilds", {
    payload: MemberActor,
    success: Schema.Array(RpcAccessibleGuild),
    error: Schema.Union([RpcUnauthorizedError, RpcUnavailableError]),
  }),
  Rpc.make("listGuildEvents", {
    payload: MemberGuildActor,
    success: Schema.Array(RpcEventSummary),
    error: MemberReadError,
  }),
  Rpc.make("getEventRanking", {
    payload: {
      ...MemberGuildActor,
      eventId: Schema.String,
    },
    success: Schema.Array(RpcEventRankingEntry),
    error: MemberReadError,
  }),
  Rpc.make("getEventTimers", {
    payload: {
      ...MemberGuildActor,
      eventId: Schema.String,
      world: Schema.String,
    },
    success: Schema.Array(RpcEventTimer),
    error: MemberReadError,
  }),
  Rpc.make("getEventWrapped", {
    payload: {
      ...MemberGuildActor,
      eventId: Schema.String,
    },
    success: RpcEventWrapped,
    error: MemberReadError,
  }),
  Rpc.make("listGuildTimers", {
    payload: {
      ...MemberGuildActor,
      world: Schema.optional(Schema.String),
    },
    success: Schema.Array(RpcGuildTimer),
    error: MemberReadError,
  }),
  Rpc.make("getGuildKillStats", {
    payload: {
      ...MemberGuildActor,
      period: Schema.optional(Schema.String),
      npcTypes: Schema.optional(Schema.Array(Schema.String)),
    },
    success: RpcGuildKillStats,
    error: MemberReadError,
  }),
  Rpc.make("getGuildTopKilledNpcs", {
    payload: {
      ...MemberGuildActor,
      limit: Schema.Finite,
      search: Schema.optional(Schema.String),
      period: Schema.optional(Schema.String),
    },
    success: RpcTopKilledNpcs,
    error: MemberReadError,
  }),
  Rpc.make("getNpcKillers", {
    payload: {
      ...MemberGuildActor,
      npcId: Schema.Finite,
      limit: Schema.Finite,
      period: Schema.optional(Schema.String),
    },
    success: RpcNpcKillers,
    error: MemberReadError,
  }),
  Rpc.make("listGuildLoots", {
    payload: {
      ...MemberGuildActor,
      limit: Schema.Finite,
      players: Schema.optional(Schema.Array(Schema.String)),
      npcs: Schema.optional(Schema.Array(Schema.String)),
      rarities: Schema.optional(Schema.Array(Schema.String)),
      itemNames: Schema.optional(Schema.Array(Schema.String)),
    },
    success: RpcGuildLootPage,
    error: MemberReadError,
  }),
  Rpc.make("listUserReservations", {
    payload: {
      ...MemberActor,
      status: Schema.optional(Schema.String),
    },
    success: RpcReservationPage,
    error: MemberReadError,
  }),
  Rpc.make("listGuildReservationSpots", {
    payload: MemberGuildActor,
    success: Schema.Array(RpcReservationSpot),
    error: MemberReadError,
  }),
) {}
