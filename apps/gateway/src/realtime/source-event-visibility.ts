import { prepareApiKeyEventVisibility } from "#src/realtime/api-key-event-visibility";
import type { GuildLootEventNpc } from "@lootlog/protocol/loot-events";
import { Option, Schema } from "effect";
import {
  canViewLoot,
  type LootVisibilityNpc,
} from "@lootlog/domain/loot-visibility";
import { Permission } from "@lootlog/schema/permissions";
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

/** Game clients receive their own features' events; web and API key sessions do not. */
const isGameSession = (session: SessionData): boolean =>
  session.platform === "game";

/** The Web app reads each new loot once, as `loot.snapshot`; others read `loot.created`. */
const readsLootSnapshots = (session: SessionData): boolean =>
  session.platform === "web-app" && !session.apiKeyAccess;

const canReadLootEvent = (
  session: SessionData,
  guild: UserGuildData | undefined,
  type: "loot.created" | "loot.snapshot" | "loot.share-updated",
  npcs: readonly LootVisibilityNpc[],
): boolean => {
  if (type === "loot.snapshot" && !readsLootSnapshots(session)) return false;

  if (type === "loot.created" && readsLootSnapshots(session)) return false;

  return canReadLootSource(session, guild, npcs, false);
};

/** Game client events whose routing scope or payload already decides who reads them. */
const GAME_CLIENT_EVENTS: ReadonlySet<Event["type"]> = new Set([
  "battle-ping.received",
  "loot-split.received",
  "loot-split.auto-accepted",
  "air-tag.map-threat-updated",
  "global-chat.created",
  "global-chat.deleted",
  "global-chat.pinned",
  "global-chat.stats",
]);

/** Game client events that are also filtered by the Organization's NPC access. */
const GAME_CLIENT_NPC_EVENTS: ReadonlySet<Event["type"]> = new Set([
  "party-gathering.state-updated",
  "npc-presence.updated",
]);

export const prepareSourceEventVisibility = (
  event: Event,
  sourceNpcs: readonly LootVisibilityNpc[] = [],
  gatheringSource?: PartyGatheringEventSource,
) => {
  const canReadApiKey = prepareApiKeyEventVisibility(event);

  const canReadNpc = prepareNpcSourceEvent(event, gatheringSource);

  const npcs =
    event.type === "loot.created" ||
    event.type === "loot.snapshot" ||
    event.type === "loot.share-updated"
      ? lootEventVisibilityNpcs(event.data.npcs)
      : sourceNpcs;

  return (session: SessionData, guild: UserGuildData | undefined): boolean => {
    if (!canReadApiKey(session)) return false;

    if (GAME_CLIENT_EVENTS.has(event.type)) return isGameSession(session);

    if (GAME_CLIENT_NPC_EVENTS.has(event.type) && !isGameSession(session))
      return false;

    // API keys never read it; `canReadApiKey` already refused them.
    if (event.type === "notification.volunteer") return true;

    // A bundle loaded before the event existed would reject it and disconnect.
    if (event.type === "kill-stats.changed") return session.killStats === true;

    if (!canReadNpc(session, guild)) return false;

    switch (event.type) {
      case "loot.created":
      case "loot.snapshot":
      case "loot.share-updated":
        return canReadLootEvent(session, guild, event.type, npcs);
      case "kills.changed":
      case "feed.entry":
        if (session.platform !== "web-app") return false;

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
