import { Capability } from "@lootlog/schema/permissions";
import type {
  SubscriptionScope,
  RealtimeLogicalTopic,
} from "@lootlog/protocol/realtime";
import type { SessionData } from "#src/realtime/session";

type Topic = RealtimeLogicalTopic;

type Scope = SubscriptionScope;

export type PermissionViewer = Pick<SessionData, "discordId" | "guilds"> &
  Partial<
    Pick<SessionData, "platform" | "presence" | "heroSightingCapabilities">
  >;

export const PRESENCE_PERMISSIONS: ReadonlySet<Capability> = new Set([
  Capability.LOOTLOG_ONLINE_PLAYERS_READ,
  Capability.LOOTLOG_PRESENCE_LOCATION_READ,
]);

export const publishesPresenceTo = (
  viewer: PermissionViewer,
  organizationId: string,
): boolean =>
  viewer.platform !== "game" ||
  (viewer.presence?.organizationIds.includes(organizationId) ?? false);

const TOPIC_PERMISSIONS = new Map<Topic, readonly Capability[]>([
  ["organization.activity", [Capability.LOOTLOG_ACCESS]],
  ["organization.chat", [Capability.LOOTLOG_CHAT_READ]],
  ["organization.loots", [Capability.LOOTLOG_LOOTS_READ]],
  ["organization.members", [Capability.ADMIN]],
  ["organization.notifications", [Capability.LOOTLOG_NOTIFICATIONS_READ]],
  ["organization.presence", [Capability.LOOTLOG_ONLINE_PLAYERS_READ]],
  ["organization.reservations", [Capability.LOOTLOG_RESERVATIONS_READ]],
  [
    "organization.timers",
    [Capability.LOOTLOG_TIMERS_READ, Capability.LOOTLOG_HERO_SIGHTINGS_READ],
  ],
  ["event.coordination", [Capability.LOOTLOG_EVENTS_READ]],
  ["map.air-tags", [Capability.LOOTLOG_ONLINE_PLAYERS_READ]],
  ["map.pings", [Capability.LOOTLOG_ONLINE_PLAYERS_READ]],
]);

interface PermissionIndex {
  readonly discordId: string;
  readonly organizations: ReadonlyMap<string, ReadonlySet<Capability> | true>;
}

const permissionIndexes = new WeakMap<
  PermissionViewer["guilds"],
  PermissionIndex
>();

const indexPermissions = (session: PermissionViewer): PermissionIndex => {
  const cached = permissionIndexes.get(session.guilds);

  if (cached?.discordId === session.discordId) return cached;
  const organizations = new Map<string, ReadonlySet<Capability> | true>();

  for (const { guild, roles } of session.guilds) {
    if (organizations.has(guild.id)) continue;
    const permissions = new Set(roles.flatMap((role) => role.permissions));

    organizations.set(
      guild.id,
      guild.ownerId === session.discordId || permissions.has(Capability.ADMIN)
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
  permission: Capability,
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

    if (scope.topic === "global.chat")
      return session.platform === "game" && session.guilds.length > 0;

    if (scope.topic === "global.character-auras")
      return session.platform === "game" && session.characterAuras === true;

    if (scope.topic === "global.chat.world")
      return (
        session.platform === "game" &&
        session.guilds.length > 0 &&
        scope.world !== undefined
      );

    return scope.topic === "party.ready-room";
  }

  if (
    session.apiKeyAccess &&
    !session.apiKeyAccess.organizationIds.includes(organizationId)
  )
    return false;

  const permissions = TOPIC_PERMISSIONS.get(scope.topic) ?? [
    Capability.LOOTLOG_ACCESS,
  ];

  return permissions.some((permission) =>
    hasPermission(session, organizationId, permission),
  );
};

export const canReadPreciseLocation = (
  session: PermissionViewer,
  organizationId: string,
): boolean =>
  hasPermission(
    session,
    organizationId,
    Capability.LOOTLOG_PRESENCE_LOCATION_READ,
  );

export const organizationIds = (session: SessionData): string[] =>
  session.guilds.map((entry) => entry.guild.id);

export const defaultScopes = (session: SessionData): Scope[] => {
  const scopes: Scope[] = [];

  for (const organizationId of organizationIds(session)) {
    for (const topic of TOPIC_PERMISSIONS.keys()) {
      if (topic === "map.air-tags") continue;
      const scope = { topic, organizationId } satisfies Scope;

      if (canSubscribe(session, scope)) scopes.push(scope);
    }
  }

  if (!session.apiKeyAccess) scopes.push({ topic: "party.ready-room" });

  const auras = { topic: "global.character-auras" } satisfies Scope;

  if (canSubscribe(session, auras)) scopes.push(auras);

  return scopes;
};
