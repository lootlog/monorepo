import { BunHttpServer } from "@effect/platform-bun";
import { httpServerMetrics } from "@lootlog/instrumentation";
import { Effect, Layer, Schema, SchemaIssue } from "effect";
import {
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { BattlelogApplication } from "#src/battlelog-application";
import type { BattlelogOperations } from "#src/battles/battlelog-operations";
import { BattlelogOperationFailure } from "../battles/battlelog-operation.js";
import {
  CreateBattleSchema,
  type CreateBattleInput,
} from "#src/battles/submission/create-battle";
import type { BattleAnalyticsCriteria } from "#src/battles/analytics/query-battle-analytics";
import type {
  AbyssSeasonsQuery,
  BattleStatisticsQuery,
  PlayerVsPlayerQuery,
} from "#src/battles/analytics/query-battle-statistics";
import type { BattleListQuery } from "#src/battles/catalog/query-battles";
import {
  UpdateBattleSchema,
  type BattleUpdate,
} from "#src/battles/catalog/update-battle";
import {
  DeleteUserDataSchema,
  type DeleteUserData,
} from "#src/battles/internal-operations";
import { BattlelogApi } from "../http-api/battlelog-api.js";
import { BearerSecurityMiddleware } from "../http-api/contracts/battles/security.js";
import {
  type BattlesControllerGetBattleAnalyticsQuery,
  type BattlesControllerGetCombatProfileQuery,
  type BattlesControllerGetDashboardBattlesQuery,
  type BattlesControllerGetPlayerVsPlayerBattlesQuery,
} from "../http-api/contracts/battles/endpoints.schemas.js";
import {
  ApplicationError,
  AuthenticationRequiredError,
  applicationErrorStatus,
} from "#src/infrastructure/http-error";
import { Logger } from "#src/infrastructure/logger";

export type { BattlelogOperations };

const logger = new Logger("BattlelogHttpApi");

const currentUserId = Effect.fn("Battlelog.currentUserId")(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const discordId = request.headers["x-auth-discord-id"];
  const userId = request.headers["x-auth-user-id"];
  if (!discordId || !userId) {
    return yield* Effect.fail(
      new BattlelogOperationFailure({
        operation: "Battlelog.currentUserId",
        cause: new AuthenticationRequiredError(),
      }),
    );
  }
  return userId;
});

const errorResponse = (error: unknown) => {
  if (Schema.isSchemaError(error)) {
    return HttpServerResponse.jsonUnsafe(
      {
        error: "Bad Request",
        message: SchemaIssue.makeFormatterStandardSchemaV1()(error.issue)
          .issues,
        statusCode: 400,
      },
      { status: 400 },
    );
  }
  if (error instanceof ApplicationError) {
    const status = applicationErrorStatus(error);
    return HttpServerResponse.jsonUnsafe(
      {
        error: error.name.replace(/Exception$/, ""),
        message: error.message,
        statusCode: status,
      },
      { status },
    );
  }
  logger.error("Unhandled request failure", error);
  return HttpServerResponse.jsonUnsafe(
    {
      error: "Internal Server Error",
      message: "Internal server error",
      statusCode: 500,
    },
    { status: 500 },
  );
};

const toResponse = <A, R>(
  effect: Effect.Effect<A, BattlelogOperationFailure, R>,
  status = 200,
) =>
  effect.pipe(
    Effect.map((value) => HttpServerResponse.jsonUnsafe(value, { status })),
    Effect.catchTag("BattlelogOperationFailure", (failure) =>
      Effect.succeed(errorResponse(failure.cause)),
    ),
  );

const operations = Effect.map(
  BattlelogApplication,
  (application) => application.operations,
);

const secured = <A>(
  _operation: string,
  run: (
    operations: BattlelogOperations,
    userId: string,
  ) => Effect.Effect<A, BattlelogOperationFailure>,
  status = 200,
) =>
  toResponse(
    Effect.gen(function* () {
      const userId = yield* currentUserId();
      const services = yield* operations;
      return yield* run(services, userId);
    }),
    status,
  );

const publicOperation = <A>(
  _operation: string,
  run: (
    operations: BattlelogOperations,
  ) => Effect.Effect<A, BattlelogOperationFailure>,
  status = 200,
) => toResponse(Effect.flatMap(operations, run), status);

const dashboardQuery = (
  query: BattlesControllerGetDashboardBattlesQuery,
): BattleListQuery => ({
  ...query,
  size: query.size ?? 20,
  sortOrder: query.sortOrder ?? "desc",
  includeTotal: query.includeTotal ?? false,
  type: query.type ? [...query.type] : undefined,
  characterId: query.characterId ? [...query.characterId] : undefined,
  result: query.result ? [...query.result] : undefined,
});

const analyticsQuery = (
  query: BattlesControllerGetBattleAnalyticsQuery,
): BattleAnalyticsCriteria => ({ ...query });

const statisticsQuery = (
  query: BattlesControllerGetCombatProfileQuery,
): BattleStatisticsQuery => ({
  ...query,
  size: query.size ?? 20,
  sortBy: query.sortBy ?? "totalBattles",
  sortOrder: query.sortOrder ?? "desc",
  includeTotal: query.includeTotal ?? false,
});

const playerVsPlayerQuery = (
  query: BattlesControllerGetPlayerVsPlayerBattlesQuery,
): PlayerVsPlayerQuery => ({
  ...statisticsQuery(query),
  opponentId: query.opponentId,
  excludeBattleId: query.excludeBattleId,
});

const BearerSecurityLive = Layer.succeed(
  BearerSecurityMiddleware,
  BearerSecurityMiddleware.of({ bearer: (httpEffect) => httpEffect }),
);

export const BattlelogHandlers = Layer.mergeAll(
  HttpApiBuilder.group(BattlelogApi, "health", (handlers) =>
    handlers.handle("HealthzControllerHealthCheck", () => Effect.void),
  ),
  HttpApiBuilder.group(BattlelogApi, "battles", (handlers) =>
    handlers
      .handleRaw("BattlesControllerCreateBattle", () =>
        toResponse(
          Effect.gen(function* () {
            const userId = yield* currentUserId();
            const data: CreateBattleInput =
              yield* HttpServerRequest.schemaBodyJson(CreateBattleSchema, {
                onExcessProperty: "error",
              }).pipe(
                Effect.mapError(
                  (cause) =>
                    new BattlelogOperationFailure({
                      operation: "BattlesController_createBattle",
                      cause,
                    }),
                ),
              );
            const services = yield* operations;
            return yield* services.battles.createBattle(data, userId);
          }),
          201,
        ),
      )
      .handleRaw("BattlesControllerGetDashboardBattles", ({ query }) =>
        secured(
          "BattlesController_getDashboardBattles",
          ({ battles }, userId) =>
            battles.getDashboardBattles(dashboardQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerGetUserCharacters", () =>
        secured("BattlesController_getUserCharacters", ({ battles }, userId) =>
          battles.getUserCharacters(userId),
        ),
      )
      .handleRaw("BattlesControllerGetBattleAnalytics", ({ query }) =>
        secured("BattlesController_getBattleAnalytics", ({ battles }, userId) =>
          battles.getBattleAnalytics(analyticsQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerGetAbyssSeasons", ({ query }) =>
        secured("BattlesController_getAbyssSeasons", ({ battles }, userId) =>
          battles.getAbyssSeasons(
            {
              characterId: query.characterId,
              world: query.world,
            } satisfies AbyssSeasonsQuery,
            userId,
          ),
        ),
      )
      .handleRaw("BattlesControllerGetCombatProfile", ({ query }) =>
        secured("BattlesController_getCombatProfile", ({ battles }, userId) =>
          battles.getCombatProfile(statisticsQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerGetProfessionWinRate", ({ query }) =>
        secured(
          "BattlesController_getProfessionWinRate",
          ({ battles }, userId) =>
            battles.getProfessionWinRate(statisticsQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerGetHeadToHead", ({ query }) =>
        secured("BattlesController_getHeadToHead", ({ battles }, userId) =>
          battles.getHeadToHead(statisticsQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerGetCurrentStreak", ({ query }) =>
        secured("BattlesController_getCurrentStreak", ({ battles }, userId) =>
          battles.getCurrentStreak(statisticsQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerGetBattleDuration", ({ query }) =>
        secured("BattlesController_getBattleDuration", ({ battles }, userId) =>
          battles.getBattleDuration(statisticsQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerGetPhGrowth", ({ query }) =>
        secured("BattlesController_getPhGrowth", ({ battles }, userId) =>
          battles.getPhGrowth(statisticsQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerGetRatingGrowth", ({ query }) =>
        secured("BattlesController_getRatingGrowth", ({ battles }, userId) =>
          battles.getRatingGrowth(statisticsQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerGetRatingDeltaByOpponent", ({ query }) =>
        secured(
          "BattlesController_getRatingDeltaByOpponent",
          ({ battles }, userId) =>
            battles.getRatingDeltaByOpponent(statisticsQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerGetPlayerVsPlayerBattles", ({ query }) =>
        secured(
          "BattlesController_getPlayerVsPlayerBattles",
          ({ battles }, userId) =>
            battles.getPlayerVsPlayerBattles(
              playerVsPlayerQuery(query),
              userId,
            ),
        ),
      )
      .handleRaw("BattlesControllerSearchWarriors", ({ query }) =>
        secured("BattlesController_searchWarriors", ({ battles }, userId) =>
          battles.searchWarriors(query.q ?? "", userId),
        ),
      )
      .handleRaw("BattlesControllerGetUserWorlds", () =>
        secured("BattlesController_getUserWorlds", ({ battles }, userId) =>
          battles.getUserWorlds(userId),
        ),
      )
      .handleRaw("BattlesControllerGetBattleTimeline", ({ params }) =>
        secured("BattlesController_getBattleTimeline", ({ battles }, userId) =>
          battles.getBattleTimeline(params.battleId, userId),
        ),
      )
      .handleRaw("BattlesControllerGetBattle", ({ params }) =>
        secured("BattlesController_getBattle", ({ battles }, userId) =>
          battles.getBattle(params.battleId, userId),
        ),
      )
      .handleRaw("BattlesControllerDeleteBattle", ({ params }) =>
        secured("BattlesController_deleteBattle", ({ battles }, userId) =>
          battles.deleteBattle(params.battleId, userId),
        ),
      )
      .handleRaw("BattlesControllerUpdateBattle", ({ params }) =>
        toResponse(
          Effect.gen(function* () {
            const userId = yield* currentUserId();
            const data: BattleUpdate = yield* HttpServerRequest.schemaBodyJson(
              UpdateBattleSchema,
              {
                onExcessProperty: "error",
              },
            ).pipe(
              Effect.mapError(
                (cause) =>
                  new BattlelogOperationFailure({
                    operation: "BattlesController_updateBattle",
                    cause,
                  }),
              ),
            );
            const services = yield* operations;
            return yield* services.battles.updateBattle(
              params.battleId,
              data,
              userId,
            );
          }),
        ),
      )
      .handleRaw("BattlesControllerGetBattleRawData", ({ params }) =>
        secured("BattlesController_getBattleRawData", ({ battles }, userId) =>
          battles.getBattleRawData(params.battleId, userId),
        ),
      ),
  ),
  HttpApiBuilder.group(BattlelogApi, "public-battles", (handlers) =>
    handlers
      .handleRaw("PublicBattlesControllerGetPublicBattle", ({ params }) =>
        publicOperation(
          "PublicBattlesController_getPublicBattle",
          ({ publicBattles }) => publicBattles.getPublicBattle(params.battleId),
        ),
      )
      .handleRaw("PublicBattlesControllerGetPublicBattleRaw", ({ params }) =>
        publicOperation(
          "PublicBattlesController_getPublicBattleRaw",
          ({ publicBattles }) =>
            publicBattles.getPublicBattleRaw(params.battleId),
        ),
      )
      .handleRaw(
        "PublicBattlesControllerGetPublicBattleTimeline",
        ({ params }) =>
          publicOperation(
            "PublicBattlesController_getPublicBattleTimeline",
            ({ publicBattles }) =>
              publicBattles.getPublicBattleTimeline(params.battleId),
          ),
      ),
  ),
  HttpApiBuilder.group(BattlelogApi, "internal", (handlers) =>
    handlers.handleRaw("InternalControllerDeleteUserData", () =>
      toResponse(
        Effect.gen(function* () {
          const body: DeleteUserData = yield* HttpServerRequest.schemaBodyJson(
            DeleteUserDataSchema,
            {
              onExcessProperty: "error",
            },
          ).pipe(
            Effect.mapError(
              (cause) =>
                new BattlelogOperationFailure({
                  operation: "InternalController_deleteUserData",
                  cause,
                }),
            ),
          );
          const services = yield* operations;
          return yield* services.internal.deleteUserData(body);
        }),
        201,
      ),
    ),
  ),
).pipe(Layer.provide(BearerSecurityLive));

const openApiFile = async (): Promise<Blob> => {
  const colocated = Bun.file(new URL("../../openapi.yaml", import.meta.url));
  if (await colocated.exists()) return colocated;
  return Bun.file(new URL("../../../openapi.yaml", import.meta.url));
};

// oxlint-disable-next-line react-hooks/rules-of-hooks -- Effect router constructor, not React.
const DocumentationRoutes = HttpRouter.use((router) =>
  Effect.gen(function* () {
    const yaml = yield* Effect.tryPromise(openApiFile);
    yield* router.addAll([
      HttpRouter.route(
        "GET",
        "/openapi.yaml",
        HttpServerResponse.raw(yaml, { contentType: "application/yaml" }),
      ),
      HttpRouter.route(
        "GET",
        "/docs-yaml",
        HttpServerResponse.raw(yaml, { contentType: "application/yaml" }),
      ),
      HttpRouter.route(
        "GET",
        "/docs",
        HttpServerResponse.text(
          '<!doctype html><html><head><title>Battle Log API</title></head><body><h1>Battle Log API</h1><p><a href="/docs-json">OpenAPI JSON</a></p></body></html>',
          { contentType: "text/html; charset=utf-8" },
        ),
      ),
    ]);
  }),
);

export const BattlelogRoutes = Layer.merge(
  HttpApiBuilder.layer(BattlelogApi, { openapiPath: "/docs-json" }).pipe(
    Layer.provide(BattlelogHandlers),
  ),
  DocumentationRoutes,
);

export const BattlelogHttpServer = Layer.unwrap(
  Effect.map(BattlelogApplication, (application) =>
    HttpRouter.serve(
      BattlelogRoutes.pipe(
        HttpRouter.provideRequest(
          Layer.succeed(BattlelogApplication, application),
        ),
      ),
      {
        middleware: (effect) =>
          httpServerMetrics(
            Effect.catchCause(effect, (cause) => {
              logger.error("Unhandled Battlelog HTTP failure", cause);
              return Effect.succeed(
                HttpServerResponse.jsonUnsafe(
                  { message: "Internal server error", statusCode: 500 },
                  { status: 500 },
                ),
              );
            }),
          ),
      },
    ).pipe(
      Layer.provide(
        BunHttpServer.layer({ hostname: "0.0.0.0", port: application.port }),
      ),
    ),
  ),
);

export const makeBattlelogTestBoundary = (
  testOperations: BattlelogOperations,
) => {
  const boundary = HttpRouter.toWebHandler(
    BattlelogRoutes.pipe(
      HttpRouter.provideRequest(
        Layer.succeed(
          BattlelogApplication,
          BattlelogApplication.of({ operations: testOperations, port: 0 }),
        ),
      ),
      Layer.provide(HttpServer.layerServices),
    ),
    { disableLogger: true },
  );
  return {
    dispose: boundary.dispose,
    handler: boundary.handler as (request: Request) => Promise<Response>,
  };
};
