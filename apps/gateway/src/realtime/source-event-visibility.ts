import type { GuildLootEventNpc } from "@lootlog/protocol/rabbit/events";
import { Option, Schema } from "effect";
import {
  canViewLoot,
  type LootVisibilityNpc,
} from "@lootlog/domain/loot-visibility";
import { Permission } from "@lootlog/schema/permissions";
import type { ServerEvent } from "@lootlog/protocol/realtime";
import { canReadNpcSourceEvent } from "#src/realtime/npc-event-visibility";
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
  organizationId: string,
  npcs: readonly LootVisibilityNpc[],
  allowAdministrator: boolean,
): boolean => {
  const guild = session.guilds.find(
    (entry) => entry.guild.id === organizationId,
  );
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

export const canReadSourceEvent = (
  session: SessionData,
  event: Event,
  sourceNpcs: readonly LootVisibilityNpc[] = [],
): boolean => {
  if (event.type === "notification.volunteer")
    return session.supportsNotificationVolunteer === true;
  if (!canReadNpcSourceEvent(session, event)) return false;
  switch (event.type) {
    case "loot.created":
    case "loot.share-updated":
      return canReadLootSource(
        session,
        event.data.guildId,
        lootEventVisibilityNpcs(event.data.npcs),
        false,
      );
    case "kills.changed":
    case "feed.entry":
      if (session.platform !== "web-app" || !session.supportsFeed) return false;
      return canReadLootSource(
        session,
        event.type === "feed.entry" ? event.data.guild.id : event.data.guildId,
        sourceNpcs,
        event.type === "kills.changed" || event.data.type === "kill",
      );
    default:
      return true;
  }
};
