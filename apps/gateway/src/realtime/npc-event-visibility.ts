import {
  canManageOwnPartyGathering,
  hasRolePermissionInLevelRange,
  NPC_FEATURE_PERMISSIONS,
} from "@lootlog/domain/npc-permissions";
import { getNpcRoutingTier, resolveNpcType } from "@lootlog/domain/npc-routing";
import {
  NpcRoutingDataSchema,
  NpcRoutingTierSchema,
} from "@lootlog/schema/npc-routing";
import { Permission } from "@lootlog/schema/permissions";
import { NonNegativeInt } from "@lootlog/schema/primitives";
import { canViewEventHero } from "@lootlog/domain/event-hero-visibility";
import type { ServerEvent } from "@lootlog/protocol/realtime";
import { Function, Option, Predicate, Schema } from "effect";
import type { UserGuildData } from "#src/guilds/guild";
import type { SessionData } from "#src/realtime/session";

type Event = typeof ServerEvent.Type;
type NpcEvent = Extract<
  Event,
  {
    type:
      | "timer.created"
      | "timer.deleted"
      | "chat.created"
      | "chat.updated"
      | "chat.deleted"
      | "notification.sent"
      | "party-ready-room.updated";
  }
>;

const decodeEventHeroSource = Schema.decodeUnknownOption(
  Schema.Struct({
    guildId: Schema.String,
    heroNpcLvl: Schema.NullOr(NonNegativeInt),
  }),
);

const decodeReadyRoomOrganizer = Schema.decodeUnknownOption(
  Schema.Struct({
    type: Schema.Literal("UPSERT"),
    projection: Schema.Struct({
      organizerDiscordId: Schema.String,
      guildIds: Schema.Array(Schema.String),
    }),
  }),
);

const decodeNpc = Schema.decodeUnknownOption(
  Schema.Struct({
    ...NpcRoutingDataSchema.fields,
    lvl: Schema.Number,
  }),
);
const RoutingSchema = Schema.Struct({
  tier: NpcRoutingTierSchema,
  npcLevel: Schema.optionalKey(Schema.Number),
});
const decodeRouting = Schema.decodeUnknownOption(RoutingSchema);
type Routing = typeof RoutingSchema.Type;

export const isOrganizationAdministrator = (
  session: SessionData,
  organizationId: string,
): boolean => {
  const guild = session.guilds.find(
    (entry) => entry.guild.id === organizationId,
  );
  return (
    guild !== undefined &&
    (guild.guild.ownerId === session.discordId ||
      guild.roles.some((role) => role.permissions.includes(Permission.ADMIN)))
  );
};

const npcRouting = Function.compose(decodeNpc, (decoded): Routing | null => {
  if (
    Option.isNone(decoded) ||
    !Number.isFinite(decoded.value.lvl) ||
    decoded.value.lvl < 0 ||
    resolveNpcType(decoded.value) === null
  )
    return null;
  return {
    tier: getNpcRoutingTier(decoded.value),
    npcLevel: decoded.value.lvl,
  };
});

const mutationRouting = (
  decoded: ReturnType<typeof decodeRouting>,
  requiresLevel: boolean,
): Routing | null => {
  if (Option.isNone(decoded)) return null;
  const routing = decoded.value;
  if (routing.npcLevel === undefined) {
    return !requiresLevel && routing.tier === "base" ? routing : null;
  }
  return Number.isFinite(routing.npcLevel) && routing.npcLevel >= 0
    ? routing
    : null;
};

const readyRoomRouting = (
  event: Extract<NpcEvent, { type: "party-ready-room.updated" }>,
): Routing | null => {
  const payload = event.data.payload;
  if (!Predicate.isObject(payload)) return null;
  if (payload.type === "REMOVE") return { tier: "base" };
  if (payload.type !== "UPSERT" || !Predicate.isObject(payload.projection))
    return null;
  return payload.projection.npc === undefined
    ? { tier: "base" }
    : npcRouting(payload.projection.npc);
};

const eventRouting = (event: NpcEvent): Routing | null => {
  const payload = event.data.payload;
  if (!Predicate.isObject(payload)) return null;
  // Never let an envelope for one Organization authorize another source.
  if (
    payload.guildId !== undefined &&
    payload.guildId !== event.data.organizationId
  )
    return null;
  if (
    payload.organizationId !== undefined &&
    payload.organizationId !== event.data.organizationId
  )
    return null;
  switch (event.type) {
    case "party-ready-room.updated":
      return readyRoomRouting(event);
    case "timer.created":
      return npcRouting(payload.npc);
    case "notification.sent":
      return payload.npc === undefined
        ? { tier: "base" }
        : npcRouting(payload.npc);
    case "chat.created":
      if (
        payload.type === "NPC" ||
        (payload.type === "PARTY_GATHERING" && payload.npc !== undefined)
      )
        return npcRouting(payload.npc);
      return { tier: "base" };
    case "timer.deleted":
    case "chat.updated":
    case "chat.deleted":
      return mutationRouting(
        decodeRouting(payload.routing),
        event.type === "timer.deleted",
      );
  }
};

const canReadFeatureEvent = (
  guild: UserGuildData,
  event: NpcEvent,
  routing: Routing,
): boolean => {
  let feature: keyof typeof NPC_FEATURE_PERMISSIONS;
  switch (event.type) {
    case "timer.created":
    case "timer.deleted":
      feature = "timers";
      break;
    case "notification.sent":
      feature = "notifications";
      break;
    default:
      feature = "chat";
  }
  if (
    !guild.roles.some((role) =>
      role.permissions.includes(NPC_FEATURE_PERMISSIONS[feature].base),
    )
  )
    return false;
  const permission = NPC_FEATURE_PERMISSIONS[feature][routing.tier];
  if (routing.npcLevel === undefined)
    return guild.roles.some((role) => role.permissions.includes(permission));
  return hasRolePermissionInLevelRange(
    guild.roles,
    permission,
    routing.npcLevel,
  );
};

const canReadEventHeroSource = (
  session: SessionData,
  organizationId: string,
  source: ReturnType<typeof decodeEventHeroSource>,
): boolean => {
  if (Option.isNone(source) || source.value.guildId !== organizationId)
    return false;
  const guild = session.guilds.find(
    (entry) => entry.guild.id === organizationId,
  );
  if (!guild) return false;
  const administrator = isOrganizationAdministrator(session, organizationId);
  const permissions = administrator
    ? [Permission.ADMIN]
    : guild.roles.flatMap((role) => role.permissions);
  return (
    (administrator || permissions.includes(Permission.LOOTLOG_EVENTS_READ)) &&
    canViewEventHero(
      { npcLvl: source.value.heroNpcLvl },
      guild.roles,
      permissions,
    )
  );
};

const isUnscopedReadyRoomUpdate = (event: Event): boolean => {
  if (event.type !== "party-ready-room.updated") return false;
  const payload = event.data.payload;
  if (!Predicate.isObject(payload)) return false;
  if (payload.type === "REMOVE") return true;
  return (
    Predicate.isObject(payload.projection) &&
    payload.projection.npc === undefined
  );
};

const canReadOwnReadyRoom = (
  session: SessionData,
  event: Extract<NpcEvent, { type: "party-ready-room.updated" }>,
  guild: UserGuildData,
): boolean => {
  const update = decodeReadyRoomOrganizer(event.data.payload);
  return (
    Option.isSome(update) &&
    update.value.projection.guildIds.includes(event.data.organizationId) &&
    canManageOwnPartyGathering(
      guild.roles,
      update.value.projection.organizerDiscordId,
      session.discordId,
    )
  );
};

export const canReadNpcSourceEvent = (
  session: SessionData,
  event: Event,
): boolean => {
  if (isUnscopedReadyRoomUpdate(event)) return true;
  switch (event.type) {
    case "member-refresh.updated":
      return isOrganizationAdministrator(session, event.data.organizationId);
    case "event.map-status-updated":
    case "event.hero-killed":
    case "event.respawn-window-opened":
    case "event.respawn-window-closed": {
      return canReadEventHeroSource(
        session,
        event.data.organizationId,
        decodeEventHeroSource(event.data.payload),
      );
    }
    case "party-ready-room.updated":
    case "timer.created":
    case "timer.deleted":
    case "chat.created":
    case "chat.updated":
    case "chat.deleted":
    case "notification.sent": {
      const guild = session.guilds.find(
        (entry) => entry.guild.id === event.data.organizationId,
      );
      const routing = eventRouting(event);
      if (!guild || !routing) return false;
      if (isOrganizationAdministrator(session, event.data.organizationId))
        return true;
      if (
        event.type === "party-ready-room.updated" &&
        canReadOwnReadyRoom(session, event, guild)
      )
        return true;
      return canReadFeatureEvent(guild, event, routing);
    }
    default:
      return true;
  }
};
