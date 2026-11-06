import { createHash } from "node:crypto";
import {
  createAccessPolicySnapshot,
  diffAccessPolicies,
} from "@lootlog/protocol/realtime/access-policy";
import {
  REALTIME_SERVER_CLOSE_CODES,
  type ServerEvent,
} from "@lootlog/protocol/realtime";
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

type Event = typeof ServerEvent.Type;

export const scopedGuilds = (
  session: SessionData,
  guilds: SessionData["guilds"],
): SessionData["guilds"] => {
  const access = session.apiKeyAccess;

  return access
    ? guilds.filter(({ guild }) => access.organizationIds.includes(guild.id))
    : guilds;
};

export const sessionAccessPolicy = (session: PermissionViewer) => {
  const organizations = createAccessPolicySnapshot(
    session.guilds,
    session.discordId,
  ).organizations.map((organization) =>
    publishesPresenceTo(session, organization.organizationId)
      ? organization
      : {
          ...organization,
          permissions: organization.permissions.filter(
            (permission) => !PRESENCE_PERMISSIONS.has(permission),
          ),
        },
  );

  return {
    organizations,
    version: createHash("sha256")
      .update(JSON.stringify(organizations))
      .digest("hex"),
  };
};

/** Whether a socket kept its subscriptions, and what to log about the change. */
type AccessAnnouncement = {
  readonly resubscribed: boolean;
  readonly warnings: ReadonlyArray<Effect.Effect<void>>;
};

/** Moves one socket to its changed access policy and tells its client. */
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
