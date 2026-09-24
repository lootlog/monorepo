import { prepareApiKeyEventVisibility } from "#src/realtime/api-key-event-visibility";
import type { GuildLootEventNpc } from "@lootlog/protocol/rabbit/events";
import { Option, Schema } from "effect";
import {
  canViewLoot,
  type LootVisibilityNpc,
} from "@lootlog/domain/loot-visibility";
import { Permission } from "@lootlog/schema/permissions";
import type { ServerEvent } from "@lootlog/protocol/realtime";
import { prepareNpcSourceEvent } from "#src/realtime/npc-event-visibility";
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

export const prepareSourceEventVisibility = (
  event: Event,
  sourceNpcs: readonly LootVisibilityNpc[] = [],
) => {
  const canReadApiKey = prepareApiKeyEventVisibility(event);
  const canReadNpc = prepareNpcSourceEvent(event);

  const npcs =
    event.type === "loot.created" || event.type === "loot.share-updated"
      ? lootEventVisibilityNpcs(event.data.npcs)
      : sourceNpcs;

  return (session: SessionData, guild: UserGuildData | undefined): boolean => {
    if (!canReadApiKey(session)) return false;

    if (event.type === "notification.volunteer")
      return session.supportsNotificationVolunteer === true;

    if (!canReadNpc(session, guild)) return false;

    switch (event.type) {
      case "loot.created":
      case "loot.share-updated":
        return canReadLootSource(session, guild, npcs, false);
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
