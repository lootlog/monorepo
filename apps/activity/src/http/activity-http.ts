import { BunHttpServer } from "@effect/platform-bun";
import { PgClient } from "@effect/sql-pg";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import { Context, Effect, Layer, Schema } from "effect";
import { statfs } from "node:fs/promises";
import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import {
  ActivityNotFound,
  ActivityRepository,
} from "#src/activities/activity-repository";
import { ActivityConfig } from "#src/config/activity-config";
import { ApiHttpClient } from "#src/http/api-http-client";
import {
  ActivityApi,
  BearerSecurityMiddleware,
  type ActivitiesControllerFindByGuildQuery,
} from "#src/http-api/activity-api.generated";
import { Permissions } from "#src/permissions/permissions";

type HealthEntry = {
  readonly status: "up" | "down";
  readonly message?: string;
};
export interface ActivityHealthValue {
  readonly check: () => Effect.Effect<{
    readonly status: "ok" | "error";
    readonly info: Record<string, HealthEntry> | null;
    readonly error: Record<string, HealthEntry> | null;
    readonly details: Record<string, HealthEntry>;
  }>;
}
export class ActivityHealth extends Context.Service<
  ActivityHealth,
  ActivityHealthValue
>()("@lootlog/activity/ActivityHealth") {
  static readonly layer = Layer.effect(
    ActivityHealth,
    Effect.gen(function* () {
      const sql = yield* PgClient.PgClient;
      const config = yield* ActivityConfig;
      const apiHttpClient = yield* ApiHttpClient;
      const checkOne = (name: string, check: () => Promise<boolean>) =>
        Effect.tryPromise({ try: check, catch: (cause) => cause }).pipe(
          Effect.timeout("3 seconds"),
          Effect.catch(() => Effect.succeed(false)),
          Effect.map(
            (up) =>
              [
                name,
                { status: up ? "up" : "down" } satisfies HealthEntry,
              ] as const,
          ),
          Effect.withSpan(`health.${name}`, {
            attributes: { adapter: name, retryCount: 0 },
          }),
        );
      const check = Effect.fn("HealthzController_check")(function* () {
        const memory = process.memoryUsage();
        const entries = yield* Effect.all(
          [
            sql`SELECT 1`.pipe(
              Effect.as(["database", { status: "up" }] as const),
              Effect.catch(() =>
                Effect.succeed(["database", { status: "down" }] as const),
              ),
            ),
            apiHttpClient
              .get(
                "HealthzController_check.api-service",
                new URL("/healthz", config.apiServiceUrl),
              )
              .pipe(
                Effect.map(({ status }) => status >= 200 && status < 300),
                Effect.catch(() => Effect.succeed(false)),
                Effect.map(
                  (up) =>
                    [
                      "api-service",
                      { status: up ? "up" : "down" } satisfies HealthEntry,
                    ] as const,
                ),
              ),
            Effect.succeed([
              "memory_heap",
              { status: memory.heapUsed <= 150 * 1024 * 1024 ? "up" : "down" },
            ] as const),
            Effect.succeed([
              "memory_rss",
              { status: memory.rss <= 400 * 1024 * 1024 ? "up" : "down" },
            ] as const),
            checkOne("storage", async () => {
              const stats = await statfs("/");
              return 1 - Number(stats.bavail) / Number(stats.blocks) <= 0.9;
            }),
          ],
          { concurrency: "unbounded" },
        );
        const details = Object.fromEntries(entries);
        const error = Object.fromEntries(
          entries.filter(([, entry]) => entry.status === "down"),
        );
        const info = Object.fromEntries(
          entries.filter(([, entry]) => entry.status === "up"),
        );
        return Object.keys(error).length === 0
          ? { status: "ok" as const, info, error: null, details }
          : {
              status: "error" as const,
              info: Object.keys(info).length > 0 ? info : null,
              error,
              details,
            };
      });
      return ActivityHealth.of({ check });
    }),
  );
}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class ActivityHttpFailure extends Schema.TaggedError<ActivityHttpFailure>()(
  "ActivityHttpFailure",
  {
    status: Schema.Literals([401, 403, 404, 500]),
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
          status: 500,
          message: "Internal server error",
        }),
    ),
  );
  if (!guildId) return yield* fail(403, "Insufficient permissions");
  const capabilities = yield* permissions.getUserGuildPermissions(
    discordId,
    userId,
    guildId,
  );
  if (!createAccessPolicy({ capabilities }).allows(required)) {
    return yield* fail(403, "Insufficient permissions");
  }
  return guildId;
});

const repositoryFailure = (error: unknown) =>
  error instanceof ActivityNotFound ||
  (typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "ActivityNotFound")
    ? new ActivityHttpFailure({ status: 404, message: "Activity not found" })
    : new ActivityHttpFailure({
        status: 500,
        message: "Internal server error",
      });

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

export const ActivityHandlers = Layer.merge(
  HttpApiBuilder.group(ActivityApi, "health", (handlers) =>
    handlers.handleRaw("HealthzControllerCheck", () =>
      Effect.map(ActivityHealth, (health) => health.check()).pipe(
        Effect.flatten,
        Effect.map((result) =>
          HttpServerResponse.jsonUnsafe(result, {
            status: result.status === "ok" ? 200 : 503,
          }),
        ),
      ),
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
).pipe(Layer.provide(BearerSecurityLive));

// oxlint-disable-next-line react-hooks/rules-of-hooks -- Effect router constructor, not React.
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
    HttpRouter.serve(ActivityRoutes).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "0.0.0.0", port })),
    ),
  ),
).pipe(Layer.provide(ActivityConfig.layer));
