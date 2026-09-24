import {
  canManageOwnPartyGathering,
  canReadNpcFeatureSource,
  type NpcFeature,
} from "@lootlog/domain/npc-permissions";
import {
  getNpcRoutingTier,
  isRoutableNpcSource,
} from "@lootlog/domain/npc-routing";
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

const isOrganizationAdministrator = (
  session: SessionData,
  guild: UserGuildData | undefined,
): boolean => {
  return (
    guild !== undefined &&
    (guild.guild.ownerId === session.discordId ||
      guild.roles.some((role) => role.permissions.includes(Permission.ADMIN)))
  );
};

const npcRouting = Function.compose(decodeNpc, (decoded): Routing | null => {
  if (Option.isNone(decoded) || !isRoutableNpcSource(decoded.value))
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

/**
 * NPC feature visibility for the realtime socket. The rule itself lives in
 * `@lootlog/domain`, shared with the REST reads' `canReadChatNpcSource`; this
 * only maps the event type onto a feature.
 *
 * Owner/ADMIN bypass and the party-gathering organizer bypass are applied by
 * `prepareNpcSourceEvent` before this is asked. An undecodable routing
 * envelope never reaches here: `npcRouting` returns null and the push is
 * denied.
 */
const canReadFeatureEvent = (
  guild: UserGuildData,
  event: NpcEvent,
  routing: Routing,
): boolean => {
  let feature: NpcFeature;

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

  return canReadNpcFeatureSource(guild.roles, feature, routing);
};

const canReadEventHeroSource = (
  session: SessionData,
  guild: UserGuildData | undefined,
  organizationId: string,
  source: ReturnType<typeof decodeEventHeroSource>,
): boolean => {
  if (Option.isNone(source) || source.value.guildId !== organizationId)
    return false;

  if (!guild) return false;
  const administrator = isOrganizationAdministrator(session, guild);

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

export const prepareNpcSourceEvent = (
  event: Event,
): ((session: SessionData, guild: UserGuildData | undefined) => boolean) => {
  if (isUnscopedReadyRoomUpdate(event)) return () => true;

  switch (event.type) {
    case "member-refresh.updated":
      return (session, guild) => isOrganizationAdministrator(session, guild);
    case "event.map-status-updated":
    case "event.hero-killed":
    case "event.respawn-window-opened":
    case "event.respawn-window-closed": {
      const source = decodeEventHeroSource(event.data.payload);

      return (session, guild) =>
        canReadEventHeroSource(
          session,
          guild,
          event.data.organizationId,
          source,
        );
    }

    case "party-ready-room.updated":
    case "timer.created":
    case "timer.deleted":
    case "chat.created":
    case "chat.updated":
    case "chat.deleted":
    case "notification.sent": {
      const routing = eventRouting(event);

      const organizer =
        event.type === "party-ready-room.updated"
          ? decodeReadyRoomOrganizer(event.data.payload)
          : Option.none();

      return (session, guild) => {
        if (!guild || !routing) return false;

        if (isOrganizationAdministrator(session, guild)) return true;

        if (
          Option.isSome(organizer) &&
          organizer.value.projection.guildIds.includes(
            event.data.organizationId,
          ) &&
          canManageOwnPartyGathering(
            guild.roles,
            organizer.value.projection.organizerDiscordId,
            session.discordId,
          )
        )
          return true;

        return canReadFeatureEvent(guild, event, routing);
      };
    }

    default:
      return () => true;
  }
};
