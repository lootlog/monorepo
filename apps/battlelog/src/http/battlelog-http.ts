import { apiKeyEndpointPolicyLayer } from "@lootlog/protocol/http/api-key-http";
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
  type HttpServerResponse,
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
  applicationErrorHttpResponse,
} from "@lootlog/protocol/http/errors";
import {
  SchemaErrorResponseLive,
  requestValidationErrorResponse,
} from "@lootlog/protocol/http/schema-error-response";

export type { BattlelogOperations };

const logger = new ContextLogger("BattlelogHttpApi");

const currentUserId = Effect.fn("Battlelog.currentUserId")(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const identity = readForwardAuthIdentity(request.headers);

  if (!identity) {
    return yield* new OperationError({
      operation: "Battlelog.currentUserId",
      cause: new AuthenticationRequiredError(),
    });
  }

  return identity.userId;
});

const answerFailure = (failure: OperationError) =>
  Schema.is(ApplicationError)(failure.cause)
    ? applicationErrorHttpResponse(failure.cause)
    : Effect.die(failure);

const respond = <A, R>(effect: Effect.Effect<A, OperationError, R>) =>
  Effect.catchTag(effect, "OperationError", answerFailure);

const invalidJsonBody = new Schema.SchemaError(
  new SchemaIssue.InvalidValue({ message: "Expected a valid JSON body" }),
);

const withJsonBody = <I, A, R>(
  schema: Schema.Codec<I, unknown>,
  onExcessProperty: "error" | "ignore",
  run: (body: I) => Effect.Effect<A, OperationError, R>,
) =>
  HttpServerRequest.schemaBodyJson(schema, { onExcessProperty }).pipe(
    Effect.matchEffect({
      onFailure: (error) => {
        if (Schema.isSchemaError(error)) {
          return Effect.succeed(
            requestValidationErrorResponse("Payload", error),
          );
        }

        return error.reason instanceof HttpServerError.RequestParseError
          ? Effect.succeed(
              requestValidationErrorResponse("Payload", invalidJsonBody),
            )
          : Effect.die(error);
      },
      onSuccess: run,
    }),
  );

const operations = Effect.map(
  BattlelogApplication,
  (application) => application.operations,
);

const secured = <A, R>(
  run: (
    operations: BattlelogOperations,
    userId: string,
  ) => Effect.Effect<A, OperationError, R>,
) =>
  respond(
    Effect.gen(function* () {
      const userId = yield* currentUserId();
      const services = yield* operations;

      return yield* run(services, userId);
    }),
  );

const publicOperation = <A>(
  run: (operations: BattlelogOperations) => Effect.Effect<A, OperationError>,
) => respond(Effect.flatMap(operations, run));

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
        secured(({ battles }, userId) =>
          withJsonBody(CreateBattleSchema, "error", (data: CreateBattleInput) =>
            battles.createBattle(data, userId),
          ),
        ),
      )
      .handle("BattlesControllerGetDashboardBattles", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.getDashboardBattles(dashboardQuery(query), userId),
        ),
      )
      .handle("BattlesControllerGetUserCharacters", () =>
        secured(({ battles }, userId) => battles.getUserCharacters(userId)),
      )
      .handle("BattlesControllerGetBattleAnalytics", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.getBattleAnalytics(analyticsQuery(query), userId),
        ),
      )
      .handle("BattlesControllerGetAbyssSeasons", ({ query }) =>
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
      .handle("BattlesControllerGetCombatProfile", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.getCombatProfile(statisticsQuery(query), userId),
        ),
      )
      .handle("BattlesControllerGetProfessionWinRate", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.getProfessionWinRate(statisticsQuery(query), userId),
        ),
      )
      .handle("BattlesControllerGetHeadToHead", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.getHeadToHead(statisticsQuery(query), userId),
        ),
      )
      .handle("BattlesControllerGetCurrentStreak", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.getCurrentStreak(statisticsQuery(query), userId),
        ),
      )
      .handle("BattlesControllerGetBattleDuration", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.getBattleDuration(statisticsQuery(query), userId),
        ),
      )
      .handle("BattlesControllerGetPhGrowth", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.getPhGrowth(statisticsQuery(query), userId),
        ),
      )
      .handle("BattlesControllerGetRatingGrowth", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.getRatingGrowth(statisticsQuery(query), userId),
        ),
      )
      .handle("BattlesControllerGetRatingDeltaByOpponent", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.getRatingDeltaByOpponent(statisticsQuery(query), userId),
        ),
      )
      .handle("BattlesControllerGetPlayerVsPlayerBattles", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.getPlayerVsPlayerBattles(playerVsPlayerQuery(query), userId),
        ),
      )
      .handle("BattlesControllerSearchWarriors", ({ query }) =>
        secured(({ battles }, userId) =>
          battles.searchWarriors(query.q ?? "", userId),
        ),
      )
      .handle("BattlesControllerGetBattleTimeline", ({ params }) =>
        secured(({ battles }, userId) =>
          battles.getBattleTimeline(params.battleId, userId),
        ),
      )
      .handle("BattlesControllerGetBattle", ({ params }) =>
        secured(({ battles }, userId) =>
          battles.getBattle(params.battleId, userId),
        ),
      )
      .handle("BattlesControllerDeleteBattle", ({ params }) =>
        secured(({ battles }, userId) =>
          battles.deleteBattle(params.battleId, userId),
        ),
      )
      .handleRaw("BattlesControllerUpdateBattle", ({ params }) =>
        secured(({ battles }, userId) =>
          withJsonBody(UpdateBattleSchema, "error", (data: BattleUpdate) =>
            battles.updateBattle(params.battleId, data, userId),
          ),
        ),
      )
      .handle("BattlesControllerGetBattleRawData", ({ params }) =>
        secured(({ battles }, userId) =>
          battles.getBattleRawData(params.battleId, userId),
        ),
      ),
  ),
  HttpApiBuilder.group(BattlelogApi, "weapon-kills", (handlers) =>
    handlers
      .handleRaw("WeaponKillsControllerRecordWeaponKills", () =>
        secured(({ weaponKills }, userId) =>
          withJsonBody(
            RecordWeaponKillsSchema,
            "ignore",
            (data: RecordWeaponKillsInput) =>
              weaponKills.recordWeaponKills(data, userId),
          ),
        ),
      )
      .handle("WeaponKillsControllerGetCharacterWeaponKills", ({ params }) =>
        secured(({ weaponKills }) =>
          weaponKills.getCharacterWeaponKills(params),
        ),
      ),
  ),
  HttpApiBuilder.group(BattlelogApi, "public-battles", (handlers) =>
    handlers
      .handle("PublicBattlesControllerGetPublicBattle", ({ params }) =>
        publicOperation(({ publicBattles }) =>
          publicBattles.getPublicBattle(params.battleId),
        ),
      )
      .handle("PublicBattlesControllerGetPublicBattleRaw", ({ params }) =>
        publicOperation(({ publicBattles }) =>
          publicBattles.getPublicBattleRaw(params.battleId),
        ),
      )
      .handle("PublicBattlesControllerGetPublicBattleTimeline", ({ params }) =>
        publicOperation(({ publicBattles }) =>
          publicBattles.getPublicBattleTimeline(params.battleId),
        ),
      ),
  ),
  HttpApiBuilder.group(BattlelogApi, "internal", (handlers) =>
    handlers.handleRaw("InternalControllerDeleteUserData", () =>
      respond(
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

          return yield* withJsonBody(
            DeleteUserDataSchema,
            "error",
            (body: DeleteUserData) =>
              application.operations.internal.deleteUserData(body),
          );
        }),
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
}).pipe(
  Layer.provide(BattlelogHandlers),
  Layer.provide(SchemaErrorResponseLive),
);

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
