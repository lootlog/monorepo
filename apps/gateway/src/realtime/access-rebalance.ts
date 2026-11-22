import { diffAccessPolicies } from "@lootlog/protocol/realtime/access-policy";
import { Effect, Exit, Schedule } from "effect";
import type { GuildStore, GuildStoreFailure } from "#src/guilds/guild-store";
import type { ActivityPublisher } from "#src/rabbit/activity-publisher";
import type { PresenceStore } from "#src/realtime/presence-store";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import {
  announceAccess,
  scopedGuilds,
  sessionAccessPolicy,
} from "#src/realtime/session-access";
import type { SessionData } from "#src/realtime/session";

const permissionRebalanceRetry = Schedule.max([
  Schedule.exponential("250 millis"),
  Schedule.recurs(3),
]);

const PERMISSION_REBALANCE_DEADLINE = "30 seconds";

export class AccessRebalancer {
  constructor(
    private readonly guilds: Pick<GuildStore, "getUserGuilds" | "invalidate">,
    private readonly hub: Pick<
      RealtimeHub,
      | "sendEvent"
      | "replaceSubscriptions"
      | "getLocalSocketsForUser"
      | "publishPermissionRebalance"
      | "reconnectUser"
    >,
    private readonly activity: Pick<ActivityPublisher, "publish">,
    private readonly presence: Pick<PresenceStore, "reconcileAccess">,
  ) {}

  rebalanceUser(
    discordId: string,
    userId: string,
  ): Effect.Effect<void, GuildStoreFailure> {
    return Effect.gen({ self: this }, function* () {
      if (
        !this.hub
          .getLocalSocketsForUser(userId)
          .some((socket) => socket.data.discordId === discordId)
      )
        return;

      const updatedGuilds = yield* this.guilds.getUserGuilds(
        { discordId, userId },
        { freshness: "required" },
      );

      yield* this.commitAccess(discordId, userId, (session) =>
        scopedGuilds(session, updatedGuilds),
      );
    });
  }

  rebalanceAcrossInstances(
    discordId: string,
    userId: string,
    removedOrganizationId?: string,
  ): Effect.Effect<void, unknown> {
    return Effect.gen({ self: this }, function* () {
      const cleanup =
        removedOrganizationId === undefined
          ? Effect.void
          : this.commitAccess(discordId, userId, (session) =>
              session.guilds.filter(
                ({ guild }) => guild.id !== removedOrganizationId,
              ),
            );

      const federate = Effect.gen({ self: this }, function* () {
        const invalidated = yield* Effect.exit(
          this.guilds.invalidate({ discordId, userId }),
        );

        const [published] = yield* Effect.all(
          [
            Effect.exit(this.hub.publishPermissionRebalance(discordId, userId)),
            this.enforceRebalance(discordId, userId),
          ],
          { concurrency: 2 },
        );

        const outcomes: ReadonlyArray<Exit.Exit<void, unknown>> = [
          invalidated,
          published,
        ];

        return outcomes;
      });

      const [, results] = yield* Effect.all([cleanup, federate], {
        concurrency: 2,
      });

      for (const result of results) {
        if (Exit.isFailure(result))
          return yield* Effect.failCause(result.cause);
      }
    });
  }

  enforceRebalance(discordId: string, userId: string): Effect.Effect<void> {
    return this.rebalanceUser(discordId, userId).pipe(
      Effect.retry({
        schedule: permissionRebalanceRetry,
        while: (error) => error.retryable,
      }),
      Effect.timeout(PERMISSION_REBALANCE_DEADLINE),
      Effect.catch((error) =>
        Effect.logError(
          "Permission rebalance unavailable; reconnecting affected sockets",
          error,
        ).pipe(
          Effect.andThen(
            Effect.sync(() => this.hub.reconnectUser(discordId, userId)),
          ),
        ),
      ),
    );
  }

  private commitAccess(
    discordId: string,
    userId: string,
    nextGuilds: (session: SessionData) => SessionData["guilds"],
  ): Effect.Effect<void> {
    const { activity, hub, presence } = this;

    return Effect.suspend(() => {
      const sideEffects: Array<Effect.Effect<void>> = [];

      for (const socket of hub.getLocalSocketsForUser(userId)) {
        if (socket.data.discordId !== discordId) continue;
        const allowedGuilds = nextGuilds(socket.data);
        const previousPolicy = sessionAccessPolicy(socket.data);

        const accessPolicy = sessionAccessPolicy({
          ...socket.data,
          guilds: allowedGuilds,
        });

        const changes = diffAccessPolicies(previousPolicy, accessPolicy);
        socket.data.guilds = allowedGuilds;

        if (changes.length === 0) continue;
        const updatedIds = new Set(allowedGuilds.map(({ guild }) => guild.id));

        const removedIds = previousPolicy.organizations
          .map(({ organizationId }) => organizationId)
          .filter((id) => !updatedIds.has(id));

        const announced = announceAccess(hub, socket, accessPolicy, changes);
        sideEffects.push(...announced.warnings);

        if (!announced.resubscribed) continue;

        if (!socket.data.apiKeyAccess) {
          if (removedIds.length > 0) {
            sideEffects.push(
              Effect.suspend(() =>
                activity.publish("DISCONNECT_EVENT", socket.data, removedIds),
              ).pipe(
                Effect.catchCause((cause) =>
                  Effect.logWarning(
                    "Permission disconnect activity failed",
                    cause,
                  ),
                ),
              ),
            );
          }

          sideEffects.push(
            Effect.suspend(() => presence.reconcileAccess(socket)).pipe(
              Effect.catchCause((cause) =>
                Effect.logWarning(
                  "Permission presence reconciliation failed",
                  cause,
                ),
              ),
            ),
          );
        }

        if (allowedGuilds.length === 0) {
          if (socket.data.apiKeyAccess) socket.data.apiKeyLeaseExpiresAt = 0;
          socket.close(1008, "organization access removed");
        }
      }

      return Effect.all(sideEffects, { concurrency: 8, discard: true });
    });
  }
}
