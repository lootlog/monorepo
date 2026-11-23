import {
  createAccessPolicySnapshot,
  diffAccessPolicies,
} from "@lootlog/protocol/realtime/access-policy";
import {
  REALTIME_SERVER_CLOSE_CODES,
  type ServerEvent,
} from "@lootlog/protocol/realtime";
import { Capability } from "@lootlog/schema/permissions";
import { Effect } from "effect";
import { getScopeKey } from "#src/realtime/realtime-audiences";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket, SessionData } from "#src/realtime/session";
import {
  canSubscribe,
  defaultScopes,
  organizationIds,
  PRESENCE_PERMISSIONS,
  publishesPresenceTo,
  type PermissionViewer,
} from "#src/realtime/subscription-policy";

type Event = ServerEvent;

export const scopedGuilds = (
  session: SessionData,
  guilds: SessionData["guilds"],
): SessionData["guilds"] => {
  const access = session.apiKeyAccess;

  return access
    ? guilds.filter(({ guild }) => access.organizationIds.includes(guild.id))
    : guilds;
};

const HERO_SIGHTING_CAPABILITIES: ReadonlySet<Capability> = new Set([
  Capability.LOOTLOG_HERO_SIGHTINGS_READ,
  Capability.LOOTLOG_HERO_SIGHTINGS_WRITE,
]);

export const sessionAccessPolicy = (session: PermissionViewer) => {
  const organizations = createAccessPolicySnapshot(
    session.guilds,
    session.discordId,
  ).organizations.map((organization) => {
    const hidden = (capability: Capability) =>
      (PRESENCE_PERMISSIONS.has(capability) &&
        !publishesPresenceTo(session, organization.organizationId)) ||
      (HERO_SIGHTING_CAPABILITIES.has(capability) &&
        session.heroSightingCapabilities !== true);

    return {
      ...organization,
      permissions: organization.permissions.filter(
        (permission) => !hidden(permission),
      ),
      grants: organization.grants.filter(
        ({ permission }) => !hidden(permission),
      ),
    };
  });

  return {
    organizations,
    version: new Bun.CryptoHasher("sha256")
      .update(JSON.stringify(organizations))
      .digest("hex"),
  };
};

type AccessAnnouncement = {
  readonly resubscribed: boolean;
  readonly warnings: ReadonlyArray<Effect.Effect<void>>;
};

export const announceAccess = (
  hub: Pick<RealtimeHub, "replaceSubscriptions" | "sendEvent">,
  socket: GatewaySocket,
  accessPolicy: ReturnType<typeof sessionAccessPolicy>,
  changes: ReturnType<typeof diffAccessPolicies>,
): AccessAnnouncement => {
  socket.data.airTagScopes = socket.data.airTagScopes.filter((scope) =>
    canSubscribe(socket.data, scope.subscription),
  );
  const scopes = defaultScopes(socket.data);
  const scopeKeys = new Set(scopes.map(getScopeKey));

  for (const scope of socket.data.subscriptions.values()) {
    if (
      canSubscribe(socket.data, scope) &&
      !scopeKeys.has(getScopeKey(scope))
    ) {
      scopes.push(scope);
      scopeKeys.add(getScopeKey(scope));
    }
  }

  try {
    hub.replaceSubscriptions(socket, scopes);
  } catch (cause) {
    socket.data.subscriptions.clear();
    socket.data.airTagScopes = [];
    socket.close(1008, "subscription reconciliation failed");

    return {
      resubscribed: false,
      warnings: [
        Effect.logWarning("Subscription reconciliation failed", cause),
      ],
    };
  }

  const event = {
    v: 1,
    type: "permissions.updated",
    data: {
      accessPolicy,
      changes,
      organizationIds: organizationIds(socket.data),
      subscriptionScopes: scopes,
    },
  } satisfies Event;

  try {
    hub.sendEvent(socket, event);
  } catch (cause) {
    socket.close(
      REALTIME_SERVER_CLOSE_CODES.tryAgainLater,
      "permission update delivery failed",
    );

    return {
      resubscribed: true,
      warnings: [Effect.logWarning("Permission update delivery failed", cause)],
    };
  }

  return { resubscribed: true, warnings: [] };
};
