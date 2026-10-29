import { Permission } from "@lootlog/schema/permissions";
import type {
  SubscriptionScope,
  RealtimeLogicalTopic,
} from "@lootlog/protocol/realtime";
import type { SessionData } from "#src/realtime/session";

type Topic = typeof RealtimeLogicalTopic.Type;

type Scope = typeof SubscriptionScope.Type;

/**
 * The identity and Organization grants that every permission check reads. A
 * game session also brings the Organizations it publishes its presence to.
 */
export type PermissionViewer = Pick<SessionData, "discordId" | "guilds"> &
  Partial<Pick<SessionData, "platform" | "presence">>;

/** Permissions that reveal where other players are. */
export const PRESENCE_PERMISSIONS: ReadonlySet<Permission> = new Set([
  Permission.LOOTLOG_ONLINE_PLAYERS_READ,
  Permission.LOOTLOG_PRESENCE_LOCATION_READ,
]);

/**
 * A character in game sees other players of a Lootlog only while it is
 * visible there itself, so nobody can watch a Lootlog incognito.
 */
export const publishesPresenceTo = (
  viewer: PermissionViewer,
  organizationId: string,
): boolean =>
  viewer.platform !== "game" ||
  (viewer.presence?.organizationIds.includes(organizationId) ?? false);

const TOPIC_PERMISSION = new Map<Topic, Permission>([
  ["organization.activity", Permission.LOOTLOG_ACCESS],
  ["organization.chat", Permission.LOOTLOG_CHAT_READ],
  ["organization.loots", Permission.LOOTLOG_LOOTS_READ],
  ["organization.members", Permission.ADMIN],
  ["organization.notifications", Permission.LOOTLOG_NOTIFICATIONS_READ],
  ["organization.presence", Permission.LOOTLOG_ONLINE_PLAYERS_READ],
  ["organization.reservations", Permission.LOOTLOG_RESERVATIONS_READ],
  ["organization.timers", Permission.LOOTLOG_TIMERS_READ],
  ["event.coordination", Permission.LOOTLOG_EVENTS_READ],
  ["map.air-tags", Permission.LOOTLOG_ONLINE_PLAYERS_READ],
  ["map.pings", Permission.LOOTLOG_ONLINE_PLAYERS_READ],
]);

interface PermissionIndex {
  readonly discordId: string;
  /** `true` grants every permission: the owner and ADMIN roles. */
  readonly organizations: ReadonlyMap<string, ReadonlySet<Permission> | true>;
}

// Delivery checks every socket of an audience for each event. Sessions
// replace their grants array on every access change, so the array identity
// keys a precomputed lookup that cannot outlive the grants it describes.
const permissionIndexes = new WeakMap<
  PermissionViewer["guilds"],
  PermissionIndex
>();

const indexPermissions = (session: PermissionViewer): PermissionIndex => {
  const cached = permissionIndexes.get(session.guilds);

  if (cached?.discordId === session.discordId) return cached;
  const organizations = new Map<string, ReadonlySet<Permission> | true>();

  for (const { guild, roles } of session.guilds) {
    if (organizations.has(guild.id)) continue;
    const permissions = new Set(roles.flatMap((role) => role.permissions));

    organizations.set(
      guild.id,
      guild.ownerId === session.discordId || permissions.has(Permission.ADMIN)
        ? true
        : permissions,
    );
  }

  const index = { discordId: session.discordId, organizations };
  permissionIndexes.set(session.guilds, index);

  return index;
};

export const hasPermission = (
  session: PermissionViewer,
  organizationId: string,
  permission: Permission,
): boolean => {
  const granted = indexPermissions(session).organizations.get(organizationId);

  if (!granted) return false;

  if (
    PRESENCE_PERMISSIONS.has(permission) &&
    !publishesPresenceTo(session, organizationId)
  )
    return false;

  return granted === true || granted.has(permission);
};

export const canSubscribe = (session: SessionData, scope: Scope): boolean => {
  if (!session.joined) return false;
  const organizationId = scope.organizationId;

  if (!organizationId) {
    if (session.apiKeyAccess) return false;

    // Any Member of any Organization reads the global chat; only clients
    // that know channels follow one world's channel, and never all at once.
    if (scope.topic === "global.chat")
      return session.supportsGlobalChat === true && session.guilds.length > 0;

    if (scope.topic === "global.chat.world")
      return (
        session.guilds.length > 0 &&
        scope.world !== undefined &&
        session.supportsGlobalChatChannels === true
      );

    return scope.topic === "party.ready-room";
  }

  if (
    session.apiKeyAccess &&
    !session.apiKeyAccess.organizationIds.includes(organizationId)
  )
    return false;
  const permission = TOPIC_PERMISSION.get(scope.topic);

  if (!permission)
    return hasPermission(session, organizationId, Permission.LOOTLOG_ACCESS);

  return hasPermission(session, organizationId, permission);
};

export const canReadPreciseLocation = (
  session: PermissionViewer,
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
    for (const topic of TOPIC_PERMISSION.keys()) {
      if (topic === "map.air-tags") continue;
      const scope = { topic, organizationId } satisfies Scope;

      if (canSubscribe(session, scope)) scopes.push(scope);
    }
  }

  if (!session.apiKeyAccess) scopes.push({ topic: "party.ready-room" });

  return scopes;
};
