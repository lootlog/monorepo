import {
  AdminOrganizationDetails,
  AdminOrganizationMembersPage,
  AdminOrganizationMembersSearch,
  AdminOrganizationsOverview,
  AdminOrganizationsPage,
  AdminOrganizationsSearch,
  AdminUserOrganization,
  OrganizationAuditPage,
  SuspensionReason,
} from "@lootlog/schema/admin-organizations";
import {
  AdminUserEntitlement,
  OrganizationEntitlementChange,
  UserEntitlementChange,
  UserLimits,
} from "@lootlog/schema/plans";
import {
  NonNegativeSafeInteger,
  NpcTypes,
  PageSize,
  Period,
} from "@lootlog/schema/http-scalars";
import {
  CharacterAuraGrantHolders,
  CharacterAuraGrants,
  PersonalCharacterAuraIdSchema,
} from "@lootlog/schema/character-aura";
import {
  InternalMemberIdentityResponse,
  InternalUserPermissionsQuery,
} from "@lootlog/schema/internal-guilds";
import { ItemRaritySchema } from "@lootlog/schema/item-rarity";
import { UserGuildPermissionsDtoSchema } from "@lootlog/schema/permissions";
import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";
import { CallerAuth, RpcCallers } from "./callers.js";
import {
  RpcBadRequestError,
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
  }).annotate(RpcCallers, ["activity", "gateway"]),
  Rpc.make("getGuildByIdOrVanityUrl", {
    payload: {
      idOrVanityUrl: Schema.String,
    },
    success: RpcGuildLookup,
    error: Schema.Union([RpcNotFoundError, RpcUnavailableError]),
  }).annotate(RpcCallers, ["activity"]),
  Rpc.make("getMemberIdentity", {
    payload: {
      guildId: Schema.String,
      discordId: Schema.String,
    },
    success: InternalMemberIdentityResponse,
    error: Schema.Union([RpcNotFoundError, RpcUnavailableError]),
  }).annotate(RpcCallers, ["discord-bot"]),
  Rpc.make("getUserLimits", {
    payload: { userId: Schema.NonEmptyString },
    success: UserLimits,
    error: RpcUnavailableError,
  }).annotate(RpcCallers, ["auth"]),
  Rpc.make("getUserAccessibleGuilds", {
    payload: MemberActor,
    success: Schema.Array(RpcAccessibleGuild),
    error: Schema.Union([RpcUnauthorizedError, RpcUnavailableError]),
  }).annotate(RpcCallers, ["auth"]),
  Rpc.make("listGuildEvents", {
    payload: MemberGuildActor,
    success: Schema.Array(RpcEventSummary),
    error: MemberReadError,
  }).annotate(RpcCallers, ["discord-bot"]),
  Rpc.make("getEventRanking", {
    payload: {
      ...MemberGuildActor,
      eventId: Schema.String,
    },
    success: Schema.Array(RpcEventRankingEntry),
    error: MemberReadError,
  }).annotate(RpcCallers, ["discord-bot"]),
  Rpc.make("getEventTimers", {
    payload: {
      ...MemberGuildActor,
      eventId: Schema.String,
      world: Schema.String,
    },
    success: Schema.Array(RpcEventTimer),
    error: MemberReadError,
  }).annotate(RpcCallers, ["discord-bot"]),
  Rpc.make("getEventWrapped", {
    payload: {
      ...MemberGuildActor,
      eventId: Schema.String,
    },
    success: RpcEventWrapped,
    error: MemberReadError,
  }).annotate(RpcCallers, ["discord-bot"]),
  Rpc.make("listGuildTimers", {
    payload: {
      ...MemberGuildActor,
      world: Schema.optional(Schema.String),
    },
    success: Schema.Array(RpcGuildTimer),
    error: MemberReadError,
  }).annotate(RpcCallers, ["discord-bot"]),
  Rpc.make("getGuildKillStats", {
    payload: {
      ...MemberGuildActor,
      period: Schema.optional(Period),
      npcTypes: Schema.optional(NpcTypes),
    },
    success: RpcGuildKillStats,
    error: MemberReadError,
  }).annotate(RpcCallers, ["discord-bot"]),
  Rpc.make("getGuildTopKilledNpcs", {
    payload: {
      ...MemberGuildActor,
      limit: Schema.Finite,
      search: Schema.optional(Schema.String),
      period: Schema.optional(Period),
    },
    success: RpcTopKilledNpcs,
    error: MemberReadError,
  }).annotate(RpcCallers, ["discord-bot"]),
  Rpc.make("getNpcKillers", {
    payload: {
      ...MemberGuildActor,
      npcId: Schema.Finite,
      limit: Schema.Finite,
      period: Schema.optional(Period),
    },
    success: RpcNpcKillers,
    error: MemberReadError,
  }).annotate(RpcCallers, ["discord-bot"]),
  Rpc.make("listGuildLoots", {
    payload: {
      ...MemberGuildActor,
      limit: Schema.Finite,
      players: Schema.optional(Schema.Array(Schema.String)),
      npcs: Schema.optional(Schema.Array(Schema.String)),
      rarities: Schema.optional(Schema.Array(ItemRaritySchema)),
      itemNames: Schema.optional(Schema.Array(Schema.String)),
    },
    success: RpcGuildLootPage,
    error: MemberReadError,
  }).annotate(RpcCallers, ["discord-bot"]),
  Rpc.make("listUserReservations", {
    payload: {
      ...MemberActor,
      status: Schema.optional(Schema.Literals(["upcoming", "past"])),
    },
    success: RpcReservationPage,
    error: MemberReadError,
  }).annotate(RpcCallers, ["discord-bot"]),
  Rpc.make("listGuildReservationSpots", {
    payload: MemberGuildActor,
    success: Schema.Array(RpcReservationSpot),
    error: MemberReadError,
  }).annotate(RpcCallers, ["discord-bot"]),
  Rpc.make("getGuildStatsCard", {
    payload: { guildId: Schema.String },
    success: Schema.Uint8Array,
    error: Schema.Union([RpcNotFoundError, RpcUnavailableError]),
  }).annotate(RpcCallers, ["discord-bot"]),
).middleware(CallerAuth) {}

const OperatorUser = {
  userId: Schema.NonEmptyString,
};

const UserByOperator = {
  ...OperatorUser,
  operatorUserId: Schema.NonEmptyString,
};

const OrganizationTarget = {
  guildId: Schema.NonEmptyString,
};

const OrganizationByOperator = {
  ...OrganizationTarget,
  operatorUserId: Schema.NonEmptyString,
  operatorName: Schema.String,
};

const OperatorReadError = Schema.Union([RpcNotFoundError, RpcUnavailableError]);

export class ApiOperatorRpcGroup extends RpcGroup.make(
  Rpc.make("listCharacterAuraGrantHolders", {
    success: CharacterAuraGrantHolders,
    error: RpcUnavailableError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("getCharacterAuraGrants", {
    payload: OperatorUser,
    success: CharacterAuraGrants,
    error: RpcUnavailableError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("grantPersonalCharacterAura", {
    payload: { ...UserByOperator, auraId: PersonalCharacterAuraIdSchema },
    error: RpcUnavailableError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("revokePersonalCharacterAuras", {
    payload: OperatorUser,
    error: RpcUnavailableError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("getUserEntitlement", {
    payload: OperatorUser,
    success: AdminUserEntitlement,
    error: RpcUnavailableError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("setUserEntitlement", {
    payload: { ...UserByOperator, change: UserEntitlementChange },
    error: RpcUnavailableError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("getOrganizationsOverview", {
    success: AdminOrganizationsOverview,
    error: RpcUnavailableError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("searchOrganizations", {
    payload: AdminOrganizationsSearch,
    success: AdminOrganizationsPage,
    error: RpcUnavailableError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("getOrganization", {
    payload: OrganizationTarget,
    success: AdminOrganizationDetails,
    error: OperatorReadError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("listOrganizationMembers", {
    payload: AdminOrganizationMembersSearch,
    success: AdminOrganizationMembersPage,
    error: OperatorReadError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("listUserOrganizations", {
    payload: { discordId: Schema.NonEmptyString },
    success: Schema.Array(AdminUserOrganization),
    error: RpcUnavailableError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("listOrganizationAudit", {
    payload: { limit: PageSize, offset: NonNegativeSafeInteger },
    success: OrganizationAuditPage,
    error: RpcUnavailableError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("setOrganizationEntitlement", {
    payload: {
      ...OrganizationByOperator,
      change: OrganizationEntitlementChange,
    },
    error: OperatorReadError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("clearOrganizationVanityUrl", {
    payload: OrganizationByOperator,
    error: OperatorReadError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("refreshOrganizationDiscordSync", {
    payload: OrganizationByOperator,
    error: Schema.Union([
      RpcNotFoundError,
      RpcBadRequestError,
      RpcUnavailableError,
    ]),
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("suspendOrganization", {
    payload: { ...OrganizationByOperator, reason: SuspensionReason },
    error: OperatorReadError,
  }).annotate(RpcCallers, ["admin"]),
  Rpc.make("resumeOrganization", {
    payload: OrganizationByOperator,
    error: OperatorReadError,
  }).annotate(RpcCallers, ["admin"]),
).middleware(CallerAuth) {}

export const ApiServedRpcGroup = ApiRpcGroup.merge(ApiOperatorRpcGroup);
