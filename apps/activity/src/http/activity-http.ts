import { apiKeyEndpointPolicyLayer } from "@lootlog/schema/api-key-http";
import {
  apiKeyAllowsOrganization,
  readApiKeyAccess,
} from "@lootlog/schema/api-key-policy";
import { OnlineRepository } from "#src/online/online-repository";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { BunHttpServer } from "@effect/platform-bun";
import {
  httpServerMetrics,
  httpServerRouteMetrics,
} from "@lootlog/instrumentation";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import {
  Context,
  Effect,
  Fiber,
  Function,
  Layer,
  Option,
  Schema,
  Semaphore,
} from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { SqlClient } from "effect/sql";
import { ActivityRepository } from "#src/activities/activity-repository";
import { ActivityConfig } from "#src/config/activity-config";
import { ActivityApi } from "#src/http-api/activity-api";
import type {
  ReadyzControllerCheck200,
  ReadyzControllerCheck503,
} from "#src/http-api/contracts/health/schemas";
import { BearerSecurityMiddleware } from "#src/http-api/contracts/shared";
import type { ActivitiesControllerFindByGuildQuery } from "#src/http-api/contracts/guilds/schemas";
import { Permissions } from "#src/activities/activity-permissions";

export interface ActivityReadinessValue {
  readonly check: () => Effect.Effect<
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

      // Drizzle's SELECT builder requires FROM; this probe must not depend on a table.
      const probe = sql`SELECT 1`.pipe(
        semaphore.withPermitsIfAvailable(1),
        Effect.map(Option.isSome),
      );

      const check = () =>
        Effect.acquireUseRelease(
          Effect.forkIn(probe, scope),
          (fiber) => Fiber.join(fiber).pipe(Effect.timeout("3 seconds")),
          // PostgreSQL cancellation can outlast the response deadline. Keep its
          // permit until cleanup finishes so subsequent probes cannot pile up.
          (fiber) =>
            Fiber.interrupt(fiber).pipe(
              Effect.forkIn(scope, { startImmediately: true }),
              Effect.asVoid,
            ),
        ).pipe(
          Effect.catch(() => Effect.succeed(false)),
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

class ActivityHttpFailure extends TaggedErrorClass<ActivityHttpFailure>()(
  "ActivityHttpFailure",
  {
    status: Schema.Literals([401, 403, 404, 500, 503]),
    message: Schema.String,
  },
) {}

const fail = (status: 401 | 403 | 404 | 500, message: string) =>
  Effect.fail(new ActivityHttpFailure({ status, message }));

const authorize = Effect.fn("Activity.authorize")(function* (
  guildIdentifier: string,
  required: PermissionValue,
) {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const permissions = yield* Permissions;
  const discordId = request.headers["x-auth-discord-id"];
  const userId = request.headers["x-auth-user-id"];

  if (!discordId || !userId) return yield* fail(401, "Unauthorized");

  const guildId = yield* permissions.resolveGuildId(guildIdentifier).pipe(
    Effect.mapError(
      () =>
        new ActivityHttpFailure({
          status: 503,
          message: "Authorization service unavailable",
        }),
    ),
  );

  if (!guildId) return yield* fail(403, "Insufficient permissions");
  const apiKey = readApiKeyAccess(request.headers);

  if (apiKey === null || !apiKeyAllowsOrganization(apiKey, guildId))
    return yield* fail(403, "Insufficient permissions");

  const capabilities = yield* permissions
    .getUserGuildPermissions(discordId, userId, guildId)
    .pipe(
      Effect.mapError(
        () =>
          new ActivityHttpFailure({
            status: 503,
            message: "Authorization service unavailable",
          }),
      ),
    );

  if (!createAccessPolicy({ capabilities }).allows(required)) {
    return yield* fail(403, "Insufficient permissions");
  }

  return guildId;
});

const repositoryFailure = Function.compose(
  Schema.is(Schema.Struct({ _tag: Schema.Literal("ActivityNotFound") })),
  (notFound) =>
    notFound
      ? new ActivityHttpFailure({ status: 404, message: "Activity not found" })
      : new ActivityHttpFailure({
          status: 500,
          message: "Internal server error",
        }),
);

const jsonOperation = <A, R>(effect: Effect.Effect<A, unknown, R>) =>
  effect.pipe(
    Effect.map((value) => HttpServerResponse.jsonUnsafe(value)),
    Effect.catch((error) => {
      const failure =
        error instanceof ActivityHttpFailure ? error : repositoryFailure(error);

      return Effect.succeed(
        HttpServerResponse.jsonUnsafe(
          { message: failure.message, statusCode: failure.status },
          { status: failure.status },
        ),
      );
    }),
  );

const activityQuery = (
  query: ActivitiesControllerFindByGuildQuery,
  guildId: string,
  userId?: string,
) => ({
  ...query,
  type: query.type ? [...query.type] : undefined,
  source: query.source ? [...query.source] : undefined,
  limit: query.limit ?? 50,
  guildId,
  userId,
});

const BearerSecurityLive = Layer.succeed(
  BearerSecurityMiddleware,
  BearerSecurityMiddleware.of({ bearer: (httpEffect) => httpEffect }),
);

const ActivityHandlers = Layer.mergeAll(
  HttpApiBuilder.group(ActivityApi, "users", (handlers) =>
    handlers.handleRaw("UsersActivityControllerGetOnline", ({ query }) =>
      jsonOperation(
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest;
          const userId = request.headers["x-auth-user-id"];

          if (!userId) return yield* fail(401, "Unauthorized");
          const repository = yield* OnlineRepository;

          return yield* repository.find(userId, query);
        }),
      ),
    ),
  ),
  HttpApiBuilder.group(ActivityApi, "health", (handlers) =>
    handlers
      .handleRaw("HealthzControllerCheck", () =>
        Effect.succeed(
          HttpServerResponse.jsonUnsafe({
            status: "ok",
            info: { process: { status: "up" } },
            error: null,
            details: { process: { status: "up" } },
          }),
        ),
      )
      .handleRaw("ReadyzControllerCheck", () =>
        Effect.gen(function* () {
          const readiness = yield* ActivityReadiness;
          const result = yield* readiness.check();

          return HttpServerResponse.jsonUnsafe(result, {
            status: result.status === "ok" ? 200 : 503,
          });
        }),
      ),
  ),
  HttpApiBuilder.group(ActivityApi, "guilds", (handlers) =>
    handlers
      .handleRaw("ActivitiesControllerFindByGuild", ({ params, query }) =>
        jsonOperation(
          Effect.gen(function* () {
            const guildId = yield* authorize(params.guildId, Permission.ADMIN);
            const repository = yield* ActivityRepository;

            return yield* repository.findMany(activityQuery(query, guildId));
          }),
        ),
      )
      .handleRaw("ActivitiesControllerSuggestActorNames", ({ params, query }) =>
        jsonOperation(
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
      .handleRaw("ActivitiesControllerSuggestWorlds", ({ params, query }) =>
        jsonOperation(
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
      .handleRaw("ActivitiesControllerSuggestClanNames", ({ params, query }) =>
        jsonOperation(
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
      .handleRaw("ActivitiesControllerFindByUser", ({ params, query }) =>
        jsonOperation(
          Effect.gen(function* () {
            const guildId = yield* authorize(params.guildId, Permission.ADMIN);
            const repository = yield* ActivityRepository;

            return yield* repository.findMany(
              activityQuery(query, guildId, params.userId),
            );
          }),
        ),
      )
      .handleRaw("ActivitiesControllerGetMemberActivityStats", ({ params }) =>
        jsonOperation(
          Effect.gen(function* () {
            const guildId = yield* authorize(params.guildId, Permission.ADMIN);
            const repository = yield* ActivityRepository;

            return yield* repository.memberStats(guildId);
          }),
        ),
      )
      .handleRaw("ActivitiesControllerFindOne", ({ params }) =>
        jsonOperation(
          Effect.gen(function* () {
            const guildId = yield* authorize(params.guildId, Permission.ADMIN);
            const repository = yield* ActivityRepository;

            return yield* repository.findOne(params.id, guildId);
          }),
        ),
      )
      .handleRaw("ActivitiesControllerDeleteActivity", ({ params }) =>
        jsonOperation(
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
    Layer.merge(BearerSecurityLive, apiKeyEndpointPolicyLayer("activity")),
  ),
);

const DocumentationRoute = HttpRouter.use((router) =>
  router.add(
    "GET",
    "/doc",
    HttpServerResponse.raw(
      Bun.file(new URL("../../openapi.yaml", import.meta.url)),
      { contentType: "application/yaml" },
    ),
  ),
);

export const ActivityRoutes = Layer.merge(
  HttpApiBuilder.layer(ActivityApi, { openapiPath: "/openapi.json" }).pipe(
    Layer.provide(ActivityHandlers),
  ),
  DocumentationRoute,
);

export const ActivityHttpServer = Layer.unwrap(
  Effect.map(ActivityConfig, ({ port }) =>
    HttpRouter.serve(
      ActivityRoutes.pipe(Layer.provide(httpServerRouteMetrics)),
      { middleware: httpServerMetrics },
    ).pipe(Layer.provide(BunHttpServer.layer({ hostname: "0.0.0.0", port }))),
  ),
).pipe(Layer.provide(ActivityConfig.layer));
