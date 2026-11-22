import { apiKeyEndpointPolicyLayer } from "@lootlog/protocol/http/api-key-http";
import {
  apiKeyAllowsOrganization,
  readForwardAuthIdentity,
} from "@lootlog/schema/api-key-policy";
import { BearerSecurityPassthrough } from "@lootlog/protocol/http/bearer-security";
import { OnlineRepository } from "#src/online/online-repository";
import {
  serviceApiRoutes,
  serviceHttpServer,
} from "@lootlog/instrumentation/service";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import {
  Context,
  Effect,
  Fiber,
  Layer,
  Option,
  Schema,
  Semaphore,
} from "effect";
import { HttpServerRequest } from "effect/http";
import {
  AuthenticationRequiredError,
  DependencyUnavailableError,
  PermissionDeniedError,
  ResourceNotFoundError,
  applicationErrorHttpResponse,
} from "@lootlog/protocol/http/errors";
import { SchemaErrorResponseLive } from "@lootlog/protocol/http/schema-error-response";
import { HttpApiBuilder } from "effect/http-api";
import { SqlClient } from "effect/sql";
import {
  ActivityNotFound,
  ActivityRepository,
  type ActivityRecord,
  type MemberActivityStatsRecord,
} from "#src/activities/activity-repository";
import { ActivityConfig } from "#src/config/activity-config";
import { ActivityApi } from "#src/http-api/activity-api";
import type {
  ReadyzControllerCheck200,
  ReadyzControllerCheck503,
} from "#src/http-api/contracts/health/schemas";
import type {
  ActivitiesControllerFindByGuildQuery,
  ActivitiesControllerFindOne200,
  ActivitiesControllerGetMemberActivityStats200,
} from "#src/http-api/contracts/guilds/schemas";
import { Permissions } from "#src/activities/activity-permissions";

export interface ActivityReadinessValue {
  readonly check: Effect.Effect<
    ReadyzControllerCheck200 | ReadyzControllerCheck503
  >;
}

export class ActivityReadiness extends Context.Service<
  ActivityReadiness,
  ActivityReadinessValue
>()("@lootlog/activity/ActivityReadiness") {
  static readonly layer = Layer.effect(
    ActivityReadiness,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      const scope = yield* Effect.scope;
      const semaphore = yield* Semaphore.make(1);

      const probe = sql`SELECT 1`.pipe(
        semaphore.withPermitsIfAvailable(1),
        Effect.map(Option.isSome),
      );

      const check = Effect.acquireUseRelease(
        Effect.forkIn(probe, scope),
        (fiber) => Fiber.join(fiber).pipe(Effect.timeout("3 seconds")),
        (fiber) =>
          Fiber.interrupt(fiber).pipe(
            Effect.forkIn(scope, { startImmediately: true }),
            Effect.asVoid,
          ),
      ).pipe(
        Effect.orElseSucceed(() => false),
        Effect.map((up) =>
          up
            ? {
                status: "ok" as const,
                info: { database: { status: "up" as const } },
                error: null,
                details: { database: { status: "up" as const } },
              }
            : {
                status: "error" as const,
                info: null,
                error: { database: { status: "down" as const } },
                details: { database: { status: "down" as const } },
              },
        ),
      );

      return ActivityReadiness.of({ check });
    }),
  );
}

const authorize = Effect.fn("Activity.authorize")(function* (
  guildIdentifier: string,
  required: PermissionValue,
) {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const permissions = yield* Permissions;
  const identity = readForwardAuthIdentity(request.headers);

  if (!identity) return yield* new AuthenticationRequiredError();

  const [guildId, capabilitiesFor] = yield* Effect.all(
    [
      permissions.resolveGuildId(guildIdentifier),
      permissions.getUserCapabilities(identity.discordId, identity.userId),
    ],
    { concurrency: "unbounded" },
  ).pipe(
    Effect.mapError(
      () => new DependencyUnavailableError("Authorization service unavailable"),
    ),
  );

  const insufficientPermissions = new PermissionDeniedError(
    "Insufficient permissions",
  );

  if (!guildId) return yield* insufficientPermissions;

  if (!apiKeyAllowsOrganization(identity.apiKey, guildId))
    return yield* insufficientPermissions;

  const capabilities = capabilitiesFor(guildId);

  if (!createAccessPolicy({ capabilities }).allows(required)) {
    return yield* insufficientPermissions;
  }

  return guildId;
});

const respond = <A, R>(effect: Effect.Effect<A, unknown, R>) =>
  Effect.catch(effect, (error) =>
    applicationErrorHttpResponse(
      Schema.is(ActivityNotFound)(error)
        ? new ResourceNotFoundError("Activity not found")
        : error,
    ),
  );

const activityQuery = (
  query: ActivitiesControllerFindByGuildQuery,
  guildId: string,
) => ({
  ...query,
  type: query.type ? [...query.type] : undefined,
  source: query.source ? [...query.source] : undefined,
  limit: query.limit ?? 50,
  guildId,
});

const activityResponse = ({
  details,
  actorSnapshot,
  ...activity
}: ActivityRecord): ActivitiesControllerFindOne200 => ({
  id: activity.id,
  userId: activity.userId,
  guildId: activity.guildId,
  discordId: activity.discordId,
  type: activity.type,
  source: activity.source,
  createdAt: activity.createdAt.toISOString(),
  world: activity.world,
  ...(details && { details }),
  ...(actorSnapshot && {
    actorSnapshot: {
      id: actorSnapshot.id,
      accountId: actorSnapshot.accountId,
      characterId: actorSnapshot.characterId,
      name: actorSnapshot.name,
      clanName: actorSnapshot.clanName,
      clanId: actorSnapshot.clanId,
      icon: actorSnapshot.icon,
      lvl: actorSnapshot.lvl,
      prof: actorSnapshot.prof,
      source: actorSnapshot.source,
      createdAt: actorSnapshot.createdAt.toISOString(),
    },
  }),
});

const memberActivityStatsResponse = (
  stats: MemberActivityStatsRecord,
): ActivitiesControllerGetMemberActivityStats200[number] => ({
  guildId: stats.guildId,
  discordId: stats.discordId,
  source: stats.source,
  lastSeenAt: stats.lastSeenAt?.toISOString() ?? null,
  visitCount: stats.visitCount,
  activeSessionCount: stats.activeSessionCount,
  createdAt: stats.createdAt.toISOString(),
  updatedAt: stats.updatedAt.toISOString(),
});

const ActivityHandlers = Layer.mergeAll(
  HttpApiBuilder.group(ActivityApi, "users", (handlers) =>
    handlers.handle("UsersActivityControllerGetOnline", ({ query }) =>
      respond(
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest;
          const identity = readForwardAuthIdentity(request.headers);

          if (!identity) return yield* new AuthenticationRequiredError();
          const repository = yield* OnlineRepository;

          return yield* repository.find(identity.userId, query);
        }),
      ),
    ),
  ),
  HttpApiBuilder.group(ActivityApi, "health", (handlers) =>
    handlers
      .handle("HealthzControllerCheck", () =>
        Effect.succeed({
          status: "ok",
          info: { process: { status: "up" } },
          error: null,
          details: { process: { status: "up" } },
        }),
      )
      .handle("ReadyzControllerCheck", () =>
        Effect.gen(function* () {
          const readiness = yield* ActivityReadiness;
          const result = yield* readiness.check;

          return result.status === "ok" ? result : yield* Effect.fail(result);
        }),
      ),
  ),
  HttpApiBuilder.group(ActivityApi, "guilds", (handlers) =>
    handlers
      .handle("ActivitiesControllerFindByGuild", ({ params, query }) =>
        respond(
          Effect.gen(function* () {
            const guildId = yield* authorize(params.guildId, Permission.ADMIN);
            const repository = yield* ActivityRepository;

            const page = yield* repository.findMany(
              activityQuery(query, guildId),
            );

            return {
              data: page.data.map(activityResponse),
              ...(page.nextCursor && { nextCursor: page.nextCursor }),
              hasMore: page.hasMore,
            };
          }),
        ),
      )
      .handle("ActivitiesControllerSuggestActorNames", ({ params, query }) =>
        respond(
          Effect.gen(function* () {
            const guildId = yield* authorize(params.guildId, Permission.ADMIN);
            const repository = yield* ActivityRepository;

            const suggestions = yield* repository.suggestActorNames(
              guildId,
              query.search,
              query.limit ?? 10,
            );

            return { suggestions };
          }),
        ),
      )
      .handle("ActivitiesControllerSuggestWorlds", ({ params, query }) =>
        respond(
          Effect.gen(function* () {
            const guildId = yield* authorize(params.guildId, Permission.ADMIN);
            const repository = yield* ActivityRepository;

            const worlds = yield* repository.suggestWorlds(
              guildId,
              query.search,
              query.limit ?? 20,
            );

            return { worlds };
          }),
        ),
      )
      .handle("ActivitiesControllerSuggestClanNames", ({ params, query }) =>
        respond(
          Effect.gen(function* () {
            const guildId = yield* authorize(params.guildId, Permission.ADMIN);
            const repository = yield* ActivityRepository;

            const suggestions = yield* repository.suggestClanNames(
              guildId,
              query.search,
              query.limit ?? 10,
            );

            return { suggestions };
          }),
        ),
      )
      .handle("ActivitiesControllerGetMemberActivityStats", ({ params }) =>
        respond(
          Effect.gen(function* () {
            const guildId = yield* authorize(params.guildId, Permission.ADMIN);
            const repository = yield* ActivityRepository;

            const stats = yield* repository.memberStats(guildId);

            return stats.map(memberActivityStatsResponse);
          }),
        ),
      )
      .handle("ActivitiesControllerFindOne", ({ params }) =>
        respond(
          Effect.gen(function* () {
            const guildId = yield* authorize(params.guildId, Permission.ADMIN);
            const repository = yield* ActivityRepository;

            return activityResponse(
              yield* repository.findOne(params.id, guildId),
            );
          }),
        ),
      )
      .handle("ActivitiesControllerDeleteActivity", ({ params }) =>
        respond(
          Effect.gen(function* () {
            const guildId = yield* authorize(params.guildId, Permission.OWNER);
            const repository = yield* ActivityRepository;

            return {
              count: yield* repository.deleteOne(params.id, guildId),
            };
          }),
        ),
      ),
  ),
).pipe(
  Layer.provide(
    Layer.merge(
      BearerSecurityPassthrough,
      apiKeyEndpointPolicyLayer("activity"),
    ),
  ),
);

export const ActivityRoutes = serviceApiRoutes(ActivityApi, {
  documentation: new URL("../../openapi.yaml", import.meta.url),
}).pipe(
  Layer.provide(ActivityHandlers),
  Layer.provide(SchemaErrorResponseLive),
);

export const ActivityHttpServer = Layer.unwrap(
  Effect.map(ActivityConfig, ({ port }) =>
    serviceHttpServer({ routes: ActivityRoutes, port }),
  ),
).pipe(Layer.provide(ActivityConfig.layer));
