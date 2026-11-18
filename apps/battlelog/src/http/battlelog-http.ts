import { apiKeyEndpointPolicyLayer } from "@lootlog/schema/api-key-http";
import { hasServiceAuthorization } from "@lootlog/protocol/http/service-auth";
import { BearerSecurityPassthrough } from "@lootlog/protocol/http/bearer-security";
import { readForwardAuthIdentity } from "@lootlog/schema/api-key-policy";
import { ContextLogger } from "@lootlog/instrumentation";
import { OperationError } from "@lootlog/instrumentation/operation";
import {
  serviceApiRoutes,
  serviceHttpServer,
} from "@lootlog/instrumentation/service";
import { Cause, Effect, Layer, Option, Schema, SchemaIssue } from "effect";
import {
  HttpRouter,
  HttpMiddleware,
  HttpServerRequest,
  HttpServerError,
  HttpServerResponse,
} from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { BattlelogApplication } from "#src/battlelog-application";
import type { BattlelogOperations } from "#src/battles/battlelog-operations";
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
import {
  RecordWeaponKillsSchema,
  type RecordWeaponKillsInput,
} from "#src/battles/weapon-kills/weapon-kills";
import { BattlelogApi } from "../http-api/battlelog-api.js";
import type {
  BattlesControllerGetBattleAnalyticsQuery,
  BattlesControllerGetCombatProfileQuery,
  BattlesControllerGetDashboardBattlesQuery,
  BattlesControllerGetPlayerVsPlayerBattlesQuery,
} from "../http-api/contracts/battles/endpoints.schemas.js";
import {
  ApplicationError,
  AuthenticationRequiredError,
  applicationErrorStatus,
} from "#src/infrastructure/http-error";

export type { BattlelogOperations };

const logger = new ContextLogger("BattlelogHttpApi");

const currentUserId = Effect.fn("Battlelog.currentUserId")(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const identity = readForwardAuthIdentity(request.headers);

  if (!identity) {
    return yield* Effect.fail(
      new OperationError({
        operation: "Battlelog.currentUserId",
        cause: new AuthenticationRequiredError(),
      }),
    );
  }

  return identity.userId;
});

const errorResponse = (cause: unknown) => {
  if (
    HttpServerError.isHttpServerError(cause) &&
    cause.reason instanceof HttpServerError.RequestParseError
  ) {
    return HttpServerResponse.jsonUnsafe(
      { error: "Bad Request", message: "Invalid JSON body", statusCode: 400 },
      { status: 400 },
    );
  }

  if (Schema.isSchemaError(cause)) {
    return HttpServerResponse.jsonUnsafe(
      {
        error: "Bad Request",
        message: SchemaIssue.makeFormatterStandardSchemaV1()(cause.issue)
          .issues,
        statusCode: 400,
      },
      { status: 400 },
    );
  }

  if (cause instanceof ApplicationError) {
    const status = applicationErrorStatus(cause);

    return HttpServerResponse.jsonUnsafe(
      {
        error: cause.name.replace(/Exception$/, ""),
        message: cause.message,
        statusCode: status,
      },
      { status },
    );
  }

  logger.error("Unhandled request failure", cause);

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
  effect: Effect.Effect<A, OperationError, R>,
  status = 200,
) =>
  effect.pipe(
    Effect.map((value) => HttpServerResponse.jsonUnsafe(value, { status })),
    Effect.catchTag("OperationError", (failure) =>
      Effect.succeed(errorResponse(failure.cause)),
    ),
  );

const operations = Effect.map(
  BattlelogApplication,
  (application) => application.operations,
);

const secured = <A>(
  run: (
    operations: BattlelogOperations,
    userId: string,
  ) => Effect.Effect<A, OperationError>,
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
  run: (operations: BattlelogOperations) => Effect.Effect<A, OperationError>,
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

const BattlelogHandlers = Layer.mergeAll(
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
                    new OperationError({
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
        secured(({ battles }, userId) =>
          battles.getDashboardBattles(dashboardQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerGetUserCharacters", () =>
        secured(({ battles }, userId) => battles.getUserCharacters(userId)),
      )
      .handleRaw("BattlesControllerGetBattleAnalytics", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.getBattleAnalytics(analyticsQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerGetAbyssSeasons", ({ query }) =>
        secured(({ battles }, userId) =>
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
        secured(({ battles }, userId) =>
          battles.getCombatProfile(statisticsQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerGetProfessionWinRate", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.getProfessionWinRate(statisticsQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerGetHeadToHead", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.getHeadToHead(statisticsQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerGetCurrentStreak", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.getCurrentStreak(statisticsQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerGetBattleDuration", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.getBattleDuration(statisticsQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerGetPhGrowth", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.getPhGrowth(statisticsQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerGetRatingGrowth", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.getRatingGrowth(statisticsQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerGetRatingDeltaByOpponent", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.getRatingDeltaByOpponent(statisticsQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerGetPlayerVsPlayerBattles", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.getPlayerVsPlayerBattles(playerVsPlayerQuery(query), userId),
        ),
      )
      .handleRaw("BattlesControllerSearchWarriors", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.searchWarriors(query.q ?? "", userId),
        ),
      )
      .handleRaw("BattlesControllerGetBattleTimeline", ({ params }) =>
        secured(({ battles }, userId) =>
          battles.getBattleTimeline(params.battleId, userId),
        ),
      )
      .handleRaw("BattlesControllerGetBattle", ({ params }) =>
        secured(({ battles }, userId) =>
          battles.getBattle(params.battleId, userId),
        ),
      )
      .handleRaw("BattlesControllerDeleteBattle", ({ params }) =>
        secured(({ battles }, userId) =>
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
                  new OperationError({
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
        secured(({ battles }, userId) =>
          battles.getBattleRawData(params.battleId, userId),
        ),
      ),
  ),
  HttpApiBuilder.group(BattlelogApi, "weapon-kills", (handlers) =>
    handlers
      .handleRaw("WeaponKillsControllerRecordWeaponKills", () =>
        toResponse(
          Effect.gen(function* () {
            const userId = yield* currentUserId();

            // Game clients loaded before the proof was dropped still send
            // `battleKey` and `margonemAccountProof`; their kills still count.
            const data: RecordWeaponKillsInput =
              yield* HttpServerRequest.schemaBodyJson(RecordWeaponKillsSchema, {
                onExcessProperty: "ignore",
              }).pipe(
                Effect.mapError(
                  (cause) =>
                    new OperationError({
                      operation: "WeaponKillsController_recordWeaponKills",
                      cause,
                    }),
                ),
              );

            const services = yield* operations;

            return yield* services.weaponKills.recordWeaponKills(data, userId);
          }),
        ),
      )
      .handleRaw("WeaponKillsControllerGetCharacterWeaponKills", ({ params }) =>
        secured(({ weaponKills }) =>
          weaponKills.getCharacterWeaponKills(params),
        ),
      ),
  ),
  HttpApiBuilder.group(BattlelogApi, "public-battles", (handlers) =>
    handlers
      .handleRaw("PublicBattlesControllerGetPublicBattle", ({ params }) =>
        publicOperation(({ publicBattles }) =>
          publicBattles.getPublicBattle(params.battleId),
        ),
      )
      .handleRaw("PublicBattlesControllerGetPublicBattleRaw", ({ params }) =>
        publicOperation(({ publicBattles }) =>
          publicBattles.getPublicBattleRaw(params.battleId),
        ),
      )
      .handleRaw(
        "PublicBattlesControllerGetPublicBattleTimeline",
        ({ params }) =>
          publicOperation(({ publicBattles }) =>
            publicBattles.getPublicBattleTimeline(params.battleId),
          ),
      ),
  ),
  HttpApiBuilder.group(BattlelogApi, "internal", (handlers) =>
    handlers.handleRaw("InternalControllerDeleteUserData", () =>
      toResponse(
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest;
          const application = yield* BattlelogApplication;

          if (
            !hasServiceAuthorization(
              request.headers.authorization,
              application.cleanupSecret,
            )
          ) {
            return yield* new OperationError({
              operation: "InternalController_deleteUserData",
              cause: new AuthenticationRequiredError(),
            });
          }

          const body: DeleteUserData = yield* HttpServerRequest.schemaBodyJson(
            DeleteUserDataSchema,
            {
              onExcessProperty: "error",
            },
          ).pipe(
            Effect.mapError(
              (cause) =>
                new OperationError({
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
).pipe(
  Layer.provide(
    Layer.merge(
      BearerSecurityPassthrough,
      apiKeyEndpointPolicyLayer("battlelog"),
    ),
  ),
);

export const BattlelogRoutes = serviceApiRoutes(BattlelogApi, {
  documentation: new URL("../../openapi.yaml", import.meta.url),
}).pipe(Layer.provide(BattlelogHandlers));

export const battlelogHttpMiddleware = HttpMiddleware.make(
  <E, R>(
    effect: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>,
  ): Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    E,
    R | HttpServerRequest.HttpServerRequest
  > =>
    Effect.tapCause(effect, (cause) =>
      Effect.sync(() => {
        const [, failure] = HttpServerError.causeResponseStripped(cause);

        if (Option.isSome(failure) && !Cause.hasInterruptsOnly(failure.value)) {
          logger.error("Unhandled Battlelog HTTP failure", failure.value);
        }
      }),
    ),
);

export const BattlelogHttpServer = Layer.unwrap(
  Effect.map(BattlelogApplication, (application) =>
    serviceHttpServer({
      routes: BattlelogRoutes.pipe(
        HttpRouter.provideRequest(
          Layer.succeed(BattlelogApplication, application),
        ),
      ),
      port: application.port,
      middleware: battlelogHttpMiddleware,
    }),
  ),
);
