import { createAccessPolicy } from "@lootlog/domain/access-policy";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import { PgClient } from "@effect/sql-pg";
import { Context, Effect, Layer } from "effect";
import { statfs } from "node:fs/promises";
import { parseActivityQuery } from "#src/activities/activity-model";
import {
  ActivityNotFound,
  ActivityRepository,
  type ActivityRepositoryValue,
} from "#src/activities/activity-repository";
import { ActivityConfig } from "#src/config/activity-config";
import {
  Permissions,
  type PermissionsValue,
} from "#src/permissions/permissions";

type HealthEntry = {
  readonly status: "up" | "down";
  readonly message?: string;
};
export interface ActivityHealthValue {
  readonly check: () => Effect.Effect<
    {
      readonly status: "ok" | "error";
      readonly info: Record<string, HealthEntry> | null;
      readonly error: Record<string, HealthEntry> | null;
      readonly details: Record<string, HealthEntry>;
    },
    never
  >;
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
      const checkOne = (name: string, check: () => Promise<boolean>) =>
        Effect.tryPromise({ try: check, catch: (cause) => cause }).pipe(
          Effect.catch(() => Effect.succeed(false)),
          Effect.map(
            (up) =>
              [
                name,
                { status: up ? "up" : "down" } satisfies HealthEntry,
              ] as const,
          ),
        );
      const check = Effect.fn("ActivityHealth.check")(function* () {
        const memory = process.memoryUsage();
        const entries = yield* Effect.all(
          [
            sql`SELECT 1`.pipe(
              Effect.as(["database", { status: "up" }] as const),
              Effect.catch(() =>
                Effect.succeed(["database", { status: "down" }] as const),
              ),
            ),
            checkOne(
              "api-service",
              async () =>
                (await fetch(new URL("/healthz", config.apiServiceUrl))).ok,
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

export interface ActivityHttpServices {
  readonly repository: ActivityRepositoryValue;
  readonly permissions: PermissionsValue;
  readonly health: ActivityHealthValue;
}
const json = (value: unknown, status = 200) => Response.json(value, { status });
const parseLimit = (url: URL, fallback: number): number => {
  const limit = Number(url.searchParams.get("limit") ?? fallback);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50)
    throw new Error("Invalid limit");
  return limit;
};
const authorize = async (
  request: Request,
  guildIdentifier: string,
  required: PermissionValue,
  permissions: PermissionsValue,
): Promise<string | Response> => {
  const discordId = request.headers.get("x-auth-discord-id");
  const userId = request.headers.get("x-auth-user-id");
  if (!discordId || !userId)
    return json({ message: "Unauthorized", statusCode: 401 }, 401);
  const guildId = await Effect.runPromise(
    permissions.resolveGuildId(guildIdentifier),
  );
  if (!guildId)
    return json({ message: "Insufficient permissions", statusCode: 403 }, 403);
  const capabilities = await Effect.runPromise(
    permissions.getUserGuildPermissions(discordId, userId, guildId),
  );
  if (!createAccessPolicy({ capabilities }).allows(required))
    return json({ message: "Insufficient permissions", statusCode: 403 }, 403);
  return guildId;
};

const handleGet = async (
  parts: string[],
  url: URL,
  guildId: string,
  repository: ActivityRepositoryValue,
): Promise<Response> => {
  const route = parts.slice(2).join("/");
  const search = url.searchParams.get("search") ?? undefined;
  if (route === "activity-logs")
    return json(
      await Effect.runPromise(
        repository.findMany({ ...parseActivityQuery(url), guildId }),
      ),
    );
  if (route === "activity-logs/actor-name-suggestions")
    return json({
      suggestions: await Effect.runPromise(
        repository.suggestActorNames(guildId, search, parseLimit(url, 10)),
      ),
    });
  if (route === "activity-logs/world-suggestions")
    return json({
      worlds: await Effect.runPromise(
        repository.suggestWorlds(guildId, search, parseLimit(url, 20)),
      ),
    });
  if (route === "activity-logs/clan-name-suggestions")
    return json({
      suggestions: await Effect.runPromise(
        repository.suggestClanNames(guildId, search, parseLimit(url, 10)),
      ),
    });
  if (route === "member-activity-stats")
    return json(await Effect.runPromise(repository.memberStats(guildId)));
  const userId =
    route.startsWith("users/") && route.endsWith("/activity-logs")
      ? parts[3]
      : undefined;
  if (userId)
    return json(
      await Effect.runPromise(
        repository.findMany({ ...parseActivityQuery(url), guildId, userId }),
      ),
    );
  const activityId = route.startsWith("activity-logs/") ? parts[3] : undefined;
  return activityId
    ? json(await Effect.runPromise(repository.findOne(activityId, guildId)))
    : json({ message: "Not Found", statusCode: 404 }, 404);
};

const handleDelete = async (
  parts: string[],
  guildId: string,
  repository: ActivityRepositoryValue,
): Promise<Response> => {
  const activityId =
    parts.length === 4 && parts[2] === "activity-logs" ? parts[3] : undefined;
  return activityId
    ? json({
        count: await Effect.runPromise(
          repository.deleteOne(activityId, guildId),
        ),
      })
    : json({ message: "Not Found", statusCode: 404 }, 404);
};

const errorResponse = (error: unknown): Response => {
  if (error instanceof ActivityNotFound)
    return json({ message: "Activity not found", statusCode: 404 }, 404);
  if (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "ActivityNotFound"
  )
    return json({ message: "Activity not found", statusCode: 404 }, 404);
  if (error instanceof Error && error.message.startsWith("Invalid"))
    return json({ message: error.message, statusCode: 400 }, 400);
  return json({ message: "Internal server error", statusCode: 500 }, 500);
};

export const makeActivityHandler =
  (services: ActivityHttpServices) =>
  async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/healthz") {
      const result = await Effect.runPromise(services.health.check());
      return json(result, result.status === "ok" ? 200 : 503);
    }
    if (request.method === "GET" && url.pathname === "/doc")
      return new Response(
        Bun.file(new URL("../../openapi.yaml", import.meta.url)),
      );
    const parts = url.pathname
      .split("/")
      .filter(Boolean)
      .map(decodeURIComponent);
    if (
      parts[0] !== "guilds" ||
      !parts[1] ||
      (request.method !== "GET" && request.method !== "DELETE")
    )
      return json({ message: "Not Found", statusCode: 404 }, 404);
    try {
      const guildIdentifier = parts[1];
      const authorized = await authorize(
        request,
        guildIdentifier,
        request.method === "DELETE" ? Permission.OWNER : Permission.ADMIN,
        services.permissions,
      );
      if (authorized instanceof Response) return authorized;
      const guildId = authorized;
      return request.method === "GET"
        ? handleGet(parts, url, guildId, services.repository)
        : handleDelete(parts, guildId, services.repository);
    } catch (error) {
      return errorResponse(error);
    }
  };

export const ActivityHttpServer = Layer.effectDiscard(
  Effect.gen(function* () {
    const config = yield* ActivityConfig;
    const repository = yield* ActivityRepository;
    const permissions = yield* Permissions;
    const health = yield* ActivityHealth;
    yield* Effect.acquireRelease(
      Effect.sync(() =>
        Bun.serve({
          port: config.port,
          hostname: "0.0.0.0",
          fetch: makeActivityHandler({ repository, permissions, health }),
        }),
      ),
      (server) => Effect.promise(() => Promise.resolve(server.stop(true))),
    );
    yield* Effect.logInfo(`Activity listening on ${config.port}`);
  }),
);
