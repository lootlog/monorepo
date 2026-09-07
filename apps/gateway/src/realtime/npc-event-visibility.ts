import {
  hasRolePermissionInLevelRange,
  NPC_FEATURE_PERMISSIONS,
} from "@lootlog/domain/npc-permissions";
import { getNpcRoutingTier, resolveNpcType } from "@lootlog/domain/npc-routing";
import {
  NpcRoutingDataSchema,
  NpcRoutingTierSchema,
} from "@lootlog/schema/npc-routing";
import { Permission } from "@lootlog/schema/permissions";
import type { ServerEvent } from "@lootlog/protocol/realtime";
import { Option, Predicate, Schema } from "effect";
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
      | "notification.sent";
  }
>;

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

const npcRouting = (npc: unknown): Routing | null => {
  const decoded = decodeNpc(npc);
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
};

const mutationRouting = (
  value: unknown,
  requiresLevel: boolean,
): Routing | null => {
  const decoded = decodeRouting(value);
  if (Option.isNone(decoded)) return null;
  const routing = decoded.value;
  if (routing.npcLevel === undefined) {
    return !requiresLevel && routing.tier === "base" ? routing : null;
  }
  return Number.isFinite(routing.npcLevel) && routing.npcLevel >= 0
    ? routing
    : null;
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
      return mutationRouting(payload.routing, event.type === "timer.deleted");
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

export const canReadNpcSourceEvent = (
  session: SessionData,
  event: Event,
): boolean => {
  switch (event.type) {
    case "member-refresh.updated":
      return isOrganizationAdministrator(session, event.data.organizationId);
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
      return canReadFeatureEvent(guild, event, routing);
    }
    default:
      return true;
  }
};
