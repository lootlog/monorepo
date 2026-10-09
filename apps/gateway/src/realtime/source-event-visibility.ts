import { prepareApiKeyEventVisibility } from "#src/realtime/api-key-event-visibility";
import type { GuildLootEventNpc } from "@lootlog/protocol/rabbit/events";
import { Option, Schema } from "effect";
import {
  canViewLoot,
  type LootVisibilityNpc,
} from "@lootlog/domain/loot-visibility";
import { Permission } from "@lootlog/schema/permissions";
import { isBattleTeamPingType } from "@lootlog/schema/battle-ping";
import type { ServerEvent } from "@lootlog/protocol/realtime";
import {
  prepareNpcSourceEvent,
  type PartyGatheringEventSource,
} from "#src/realtime/npc-event-visibility";
import type { UserGuildData } from "#src/guilds/guild";
import type { SessionData } from "#src/realtime/session";

type Event = typeof ServerEvent.Type;

export const lootEventVisibilityNpcs = (
  npcs: ReadonlyArray<typeof GuildLootEventNpc.Type>,
): LootVisibilityNpc[] =>
  npcs.map((npc) => ({
    level: npc.lvl ?? null,
    type: Option.getOrNull(Schema.decodeUnknownOption(Schema.String)(npc.type)),
  }));

const canReadLootSource = (
  session: SessionData,
  guild: UserGuildData | undefined,
  npcs: readonly LootVisibilityNpc[],
  allowAdministrator: boolean,
): boolean => {
  if (!guild) return false;

  const permissions =
    guild.guild.ownerId === session.discordId
      ? [Permission.OWNER]
      : guild.roles.flatMap((role) => role.permissions);

  // Kill aggregates allow administrators; loot visibility only bypasses for owners.
  if (
    allowAdministrator &&
    permissions.some(
      (permission) =>
        permission === Permission.ADMIN || permission === Permission.OWNER,
    )
  )
    return true;

  return canViewLoot({
    permissions,
    roles: guild.roles.map((role) => ({
      id: role.id,
      levelFrom: role.lvlRangeFrom,
      levelTo: role.lvlRangeTo,
      permissions: role.permissions,
    })),
    npcs,
  });
};

export const eventOrganizationId = (event: Event): string | undefined => {
  if ("organizationId" in event.data) return event.data.organizationId;

  if ("guildId" in event.data) return event.data.guildId;

  if (event.type === "feed.entry") return event.data.guild.id;

  return undefined;
};

export const findEventGuild = (
  session: SessionData,
  organizationId: string | undefined,
): UserGuildData | undefined =>
  organizationId === undefined
    ? undefined
    : session.guilds.find((entry) => entry.guild.id === organizationId);

/** Older game clients close the socket on a global chat event they cannot decode. */
const canDecodeGlobalChatEvent = (
  session: SessionData,
  type: Event["type"],
): boolean =>
  type === "global-chat.created"
    ? session.supportsGlobalChat === true
    : session.supportsGlobalChatChannels === true;

/** A snapshot session receives each new loot once, as `loot.snapshot`. */
const canReadLootEvent = (
  session: SessionData,
  guild: UserGuildData | undefined,
  type: "loot.created" | "loot.snapshot" | "loot.share-updated",
  npcs: readonly LootVisibilityNpc[],
): boolean => {
  if (type === "loot.snapshot") {
    if (session.platform !== "web-app" || !session.supportsLootSnapshot)
      return false;
  } else if (type === "loot.created" && session.supportsLootSnapshot) {
    return false;
  }

  return canReadLootSource(session, guild, npcs, false);
};

export const prepareSourceEventVisibility = (
  event: Event,
  sourceNpcs: readonly LootVisibilityNpc[] = [],
  gatheringSource?: PartyGatheringEventSource,
) => {
  const canReadApiKey = prepareApiKeyEventVisibility(event);

  const isTeamBattlePing =
    event.type === "battle-ping.received" &&
    isBattleTeamPingType(event.data.type);

  const canReadNpc = prepareNpcSourceEvent(event, gatheringSource);

  const npcs =
    event.type === "loot.created" ||
    event.type === "loot.snapshot" ||
    event.type === "loot.share-updated"
      ? lootEventVisibilityNpcs(event.data.npcs)
      : sourceNpcs;

  return (session: SessionData, guild: UserGuildData | undefined): boolean => {
    if (!canReadApiKey(session)) return false;

    if (event.type === "notification.volunteer")
      return session.supportsNotificationVolunteer === true;

    if (
      event.type === "party-gathering.state-updated" &&
      !session.supportsPartyGatheringState
    )
      return false;

    // Older game clients close the socket on an event type they cannot decode.
    if (event.type === "battle-ping.received")
      return isTeamBattlePing
        ? session.supportsTeamBattlePings === true
        : session.supportsBattlePings === true;

    if (event.type === "air-tag.map-threat-updated")
      return session.supportsAirTagMapThreats === true;

    if (
      event.type === "npc-presence.updated" &&
      session.supportsNpcPresence !== true
    )
      return false;

    if (event.type.startsWith("global-chat."))
      return canDecodeGlobalChatEvent(session, event.type);

    if (!canReadNpc(session, guild)) return false;

    switch (event.type) {
      case "loot.created":
      case "loot.snapshot":
      case "loot.share-updated":
        return canReadLootEvent(session, guild, event.type, npcs);
      case "kills.changed":
      case "feed.entry":
        if (session.platform !== "web-app" || !session.supportsFeed)
          return false;

        return canReadLootSource(
          session,
          guild,
          npcs,
          event.type === "kills.changed" || event.data.type === "kill",
        );
      default:
        return true;
    }
  };
};

export const canReadSourceEvent = (
  session: SessionData,
  event: Event,
  sourceNpcs: readonly LootVisibilityNpc[] = [],
): boolean =>
  prepareSourceEventVisibility(event, sourceNpcs)(
    session,
    findEventGuild(session, eventOrganizationId(event)),
  );
