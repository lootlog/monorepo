import { diffAccessPolicies } from "@lootlog/protocol/realtime/access-policy";
import type {
  ClientCommand,
  ServerEvent,
  SubscriptionScope,
} from "@lootlog/protocol/realtime";
import { Effect, Exit } from "effect";
import type { AirTagService } from "#src/realtime/air-tag-service";
import type { CommandAdmission } from "#src/realtime/command-admission";
import type { CommandRoutes } from "#src/realtime/command-routes";
import { getGlobalChatStats } from "#src/realtime/gateway-metrics";
import type { NpcPresenceService } from "#src/realtime/npc-presence-service";
import type { PresenceStore } from "#src/realtime/presence-store";
import {
  isGlobalChatTopic,
  type RealtimeHub,
} from "#src/realtime/realtime-hub";
import {
  JoinCapacityExceeded,
  OrganizationAccessDenied,
  RealtimeDependencyError,
  SessionNotJoined,
  SubscriptionLimitExceeded,
} from "#src/realtime/realtime-errors";
import {
  announceAccess,
  sessionAccessPolicy,
} from "#src/realtime/session-access";
import {
  joinSession,
  type SessionJoinDependencies,
} from "#src/realtime/session-join";
import type { GatewaySocket } from "#src/realtime/session";
import { canReadSourceEvent } from "#src/realtime/source-event-visibility";
import { canSubscribe } from "#src/realtime/subscription-policy";

type Command = typeof ClientCommand.Type;

type Scope = typeof SubscriptionScope.Type;

type Event = typeof ServerEvent.Type;

export type SessionCommand =
  | "session.join"
  | "presence.heartbeat"
  | "connection.ping"
  | "presence.publish"
  | "presence.fetch"
  | "subscription.subscribe"
  | "subscription.unsubscribe";

export interface SessionRouteDependencies extends Pick<
  SessionJoinDependencies,
  "guilds" | "proofVerifier" | "publishAccountVerified" | "activity"
> {
  readonly presence: Pick<
    PresenceStore,
    "heartbeat" | "publish" | "snapshot" | "reconcileAccess"
  >;
  readonly hub: Pick<
    RealtimeHub,
    | "globalChatCounts"
    | "sendEvent"
    | "replaceSubscriptions"
    | "setPresence"
    | "subscribe"
    | "unsubscribe"
  >;
  readonly sessionFeatures: {
    readonly npcPresence: Pick<NpcPresenceService, "refresh" | "withdraw">;
    readonly airTags: Pick<AirTagService, "registerInterest">;
  };
  readonly joinAdmission: Pick<CommandAdmission, "tryAcquire">;
}

const recordPresenceActivity = (
  activity: SessionRouteDependencies["activity"],
  socket: GatewaySocket,
): Effect.Effect<void> => {
  if (socket.data.platform !== "game" || socket.data.apiKeyAccess)
    return Effect.void;
  const published = socket.data.presence?.organizationIds ?? [];

  const hidden = (socket.data.activityOrganizationIds ?? []).filter(
    (id) => !published.includes(id),
  );

  return Effect.all(
    [
      activity.publish("DISCONNECT_EVENT", socket.data, hidden),
      activity.publish("CONNECT_EVENT", socket.data, published),
    ],
    { discard: true },
  );
};

const publishPresence = (
  { activity, hub, presence }: SessionRouteDependencies,
  socket: GatewaySocket,
  data: Extract<Command, { type: "presence.publish" }>["data"],
) =>
  Effect.suspend(() => {
    const previousPolicy = sessionAccessPolicy(socket.data);

    const previouslyPublished = new Set(
      socket.data.presence?.organizationIds ?? [],
    );

    return presence.publish(socket, data).pipe(
      Effect.onExit((exit) =>
        Effect.suspend(() => {
          const current = socket.data.presence;

          if (Exit.isFailure(exit) && current) {
            const kept = current.organizationIds.filter((id) =>
              previouslyPublished.has(id),
            );

            hub.setPresence(
              socket,
              kept.length === 0
                ? undefined
                : { ...current, organizationIds: kept },
            );
          }

          const accessPolicy = sessionAccessPolicy(socket.data);
          const changes = diffAccessPolicies(previousPolicy, accessPolicy);

          const warnings =
            changes.length === 0
              ? []
              : announceAccess(hub, socket, accessPolicy, changes).warnings;

          return Effect.all(
            [...warnings, recordPresenceActivity(activity, socket)],
            { discard: true },
          );
        }),
      ),
    );
  });

const requireJoined = (
  socket: GatewaySocket,
): Effect.Effect<void, SessionNotJoined> =>
  socket.data.joined ? Effect.void : Effect.fail(new SessionNotJoined());

export const sessionRoutes = (
  dependencies: SessionRouteDependencies,
): Pick<CommandRoutes, SessionCommand> => {
  const { hub, joinAdmission, presence, sessionFeatures } = dependencies;

  const join: SessionJoinDependencies = {
    guilds: dependencies.guilds,
    proofVerifier: dependencies.proofVerifier,
    publishAccountVerified: dependencies.publishAccountVerified,
    presence,
    hub,
    activity: dependencies.activity,
    npcPresence: sessionFeatures.npcPresence,
  };

  return {
    "session.join": {
      joined: false,
      apiKey: true,
      traced: true,
      run: (socket, data) =>
        Effect.suspend(() => {
          const admission = joinAdmission.tryAcquire();

          if (admission.admitted === false)
            return Effect.fail(
              new JoinCapacityExceeded({
                retryAfterMs: admission.retryAfterMs,
              }),
            );

          return joinSession(join, socket, data).pipe(
            Effect.ensuring(Effect.sync(admission.release)),
          );
        }),
    },
    "presence.heartbeat": {
      joined: true,
      run: (socket, { sessionId }) =>
        presence.heartbeat(socket, sessionId).pipe(
          Effect.tap(() =>
            socket.data.npcPresence
              ? Effect.forkDetach(sessionFeatures.npcPresence.refresh(socket))
              : Effect.void,
          ),
          Effect.map((lastSeen) => ({ lastSeen })),
        ),
    },
    "connection.ping": {
      joined: false,
      apiKey: true,
      run: () => Effect.succeed({}),
    },
    "presence.publish": {
      joined: true,
      traced: true,
      run: (socket, data) => publishPresence(dependencies, socket, data),
    },
    "presence.fetch": {
      joined: false,
      apiKey: true,
      run: (socket, data) => {
        const scope = {
          topic: "organization.presence",
          organizationId: data.organizationId,
        } satisfies Scope;

        if (!canSubscribe(socket.data, scope))
          return Effect.fail(new OrganizationAccessDenied());

        return requireJoined(socket).pipe(
          Effect.andThen(
            presence.snapshot(socket.data, data.organizationId, data.world),
          ),
          Effect.tap((snapshot) =>
            Effect.sync(() => {
              if (data.delivery === "response") return;

              hub.sendEvent(socket, {
                v: 1,
                type: "presence.snapshot",
                sequence: snapshot.revision,
                data: snapshot,
              });
            }),
          ),
        );
      },
    },
    "subscription.subscribe": {
      joined: false,
      apiKey: true,
      run: (socket, scope) => {
        if (!canSubscribe(socket.data, scope))
          return Effect.fail(new OrganizationAccessDenied());

        return requireJoined(socket).pipe(
          Effect.andThen(
            Effect.try({
              try: () => {
                hub.subscribe(socket, scope);

                return { scope };
              },
              catch: (cause) =>
                cause instanceof SubscriptionLimitExceeded
                  ? cause
                  : new RealtimeDependencyError({
                      operation: "subscribe",
                      cause,
                    }),
            }),
          ),
          Effect.tap(() =>
            scope.topic === "map.air-tags"
              ? sessionFeatures.airTags.registerInterest(scope)
              : Effect.void,
          ),
          Effect.tap(() =>
            Effect.sync(() => {
              const counts = hub.globalChatCounts;

              if (!counts || !isGlobalChatTopic(scope.topic)) return;

              const event: Event = {
                v: 1,
                type: "global-chat.stats",
                data: getGlobalChatStats(counts, scope.world),
              };

              if (canReadSourceEvent(socket.data, event))
                hub.sendEvent(socket, event);
            }),
          ),
        );
      },
    },
    "subscription.unsubscribe": {
      joined: true,
      apiKey: true,
      run: (socket, scope) =>
        Effect.sync(() => {
          hub.unsubscribe(socket, scope);

          return { scope };
        }),
    },
  };
};
