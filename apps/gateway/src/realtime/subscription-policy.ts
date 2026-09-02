import { Permission } from "@lootlog/schema/permissions";
import type {
  SubscriptionScope,
  RealtimeLogicalTopic,
} from "@lootlog/protocol/realtime";
import type { SessionData } from "#src/realtime/session";

type Topic = typeof RealtimeLogicalTopic.Type;
type Scope = typeof SubscriptionScope.Type;

const TOPIC_PERMISSION: Partial<Record<Topic, Permission>> = {
  "organization.activity": Permission.LOOTLOG_ACCESS,
  "organization.chat": Permission.LOOTLOG_CHAT_READ,
  "organization.loots": Permission.LOOTLOG_LOOTS_READ,
  "organization.members": Permission.LOOTLOG_MEMBERS_READ,
  "organization.notifications": Permission.LOOTLOG_NOTIFICATIONS_READ,
  "organization.presence": Permission.LOOTLOG_ONLINE_PLAYERS_READ,
  "organization.reservations": Permission.LOOTLOG_RESERVATIONS_READ,
  "organization.timers": Permission.LOOTLOG_TIMERS_READ,
  "event.coordination": Permission.LOOTLOG_EVENTS_READ,
  "map.air-tags": Permission.LOOTLOG_ONLINE_PLAYERS_READ,
  "map.pings": Permission.LOOTLOG_ONLINE_PLAYERS_READ,
};

const hasPermission = (
  session: SessionData,
  organizationId: string,
  permission: Permission,
): boolean => {
  const guild = session.guilds.find(
    (entry) => entry.guild.id === organizationId,
  );
  if (!guild) return false;
  return (
    guild.guild.ownerId === session.discordId ||
    guild.roles.some(
      (role) =>
        role.permissions.includes(Permission.ADMIN) ||
        role.permissions.includes(permission),
    )
  );
};

export const canSubscribe = (session: SessionData, scope: Scope): boolean => {
  if (!session.joined) return false;
  const organizationId = scope.organizationId;
  if (!organizationId) return scope.topic === "party.ready-room";
  const permission = TOPIC_PERMISSION[scope.topic];
  if (!permission)
    return hasPermission(session, organizationId, Permission.LOOTLOG_ACCESS);
  return hasPermission(session, organizationId, permission);
};

export const canReadPreciseLocation = (
  session: SessionData,
  organizationId: string,
): boolean =>
  hasPermission(
    session,
    organizationId,
    Permission.LOOTLOG_PRESENCE_LOCATION_READ,
  );

export const organizationIds = (session: SessionData): string[] =>
  session.guilds.map((entry) => entry.guild.id);

export const defaultScopes = (session: SessionData): Scope[] => {
  const scopes: Scope[] = [];
  for (const organizationId of organizationIds(session)) {
    for (const topic of Object.keys(TOPIC_PERMISSION) as Topic[]) {
      if (topic === "map.air-tags") continue;
      const scope = { topic, organizationId } satisfies Scope;
      if (canSubscribe(session, scope)) scopes.push(scope);
    }
  }
  scopes.push({ topic: "party.ready-room" });
  return scopes;
};
