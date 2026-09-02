import { Schema, SchemaIssue } from "effect";
import {
  CreateBattleSchema,
  type CreateBattleDto,
} from "#src/battles/dto/create-battle.dto";
import {
  QueryBattleAnalyticsSchema,
  type QueryBattleAnalyticsDto,
} from "#src/battles/dto/query-battle-analytics.dto";
import {
  QueryAbyssSeasonsSchema,
  QueryBattleStatisticsSchema,
  QueryPlayerVsPlayerSchema,
  type QueryAbyssSeasonsDto,
  type QueryBattleStatisticsDto,
  type QueryPlayerVsPlayerDto,
} from "#src/battles/dto/query-battle-statistics.dto";
import {
  QueryBattlesSchema,
  type QueryBattlesDto,
} from "#src/battles/dto/query-battles.dto";
import {
  UpdateBattleSchema,
  type UpdateBattleDto,
} from "#src/battles/dto/update-battle.dto";
import {
  DeleteUserDataSchema,
  type DeleteUserData,
  type InternalController,
} from "#src/battles/internal.controller";
import type {
  BattlesController,
  PublicBattlesController,
} from "#src/battles/battles.controller";
import {
  BadRequestException,
  HttpError,
  UnauthorizedException,
} from "#src/platform/http-error";
import { Logger } from "#src/platform/logger";

export interface BattlelogControllers {
  readonly battles: BattlesController;
  readonly publicBattles: PublicBattlesController;
  readonly internal: InternalController;
}

const logger = new Logger("HttpRouter");

const openApiFile = async (): Promise<Blob> => {
  const colocated = Bun.file(new URL("../../openapi.yaml", import.meta.url));
  if (await colocated.exists()) return colocated;
  return Bun.file(new URL("../../../openapi.yaml", import.meta.url));
};

const json = (value: unknown, status = 200): Response =>
  Response.json(value, { status });

const queryRecord = (url: URL): Record<string, string> =>
  Object.fromEntries(url.searchParams.entries());

const parseQuery = <S extends Schema.ConstraintDecoder<unknown, never>>(
  schema: S,
  url: URL,
): S["Type"] => Schema.decodeUnknownSync(schema)(queryRecord(url));

const parseBody = async <S extends Schema.ConstraintDecoder<unknown, never>>(
  schema: S,
  request: Request,
): Promise<S["Type"]> => {
  let body: unknown;
  try {
    body = await request.json();
  } catch (cause) {
    throw new BadRequestException("Request body must be valid JSON", { cause });
  }
  return Schema.decodeUnknownSync(schema)(body);
};

const authenticatedUserId = (request: Request): string => {
  const discordId = request.headers.get("x-auth-discord-id");
  const userId = request.headers.get("x-auth-user-id");
  if (!discordId || !userId) throw new UnauthorizedException();
  return userId;
};

const pathParameter = (pathname: string, expression: RegExp): string | null =>
  expression.exec(pathname)?.[1] ?? null;

const errorResponse = (error: unknown): Response => {
  if (Schema.isSchemaError(error)) {
    return json(
      {
        error: "Bad Request",
        message: SchemaIssue.makeFormatterStandardSchemaV1()(error.issue)
          .issues,
        statusCode: 400,
      },
      400,
    );
  }
  if (error instanceof HttpError) {
    return json(
      {
        error: error.name.replace(/Exception$/, ""),
        message: error.message,
        statusCode: error.statusCode,
      },
      error.statusCode,
    );
  }

  logger.error("Unhandled request failure", error);
  return json(
    {
      error: "Internal Server Error",
      message: "Internal server error",
      statusCode: 500,
    },
    500,
  );
};

export const createRequestHandler =
  (controllers: BattlelogControllers) =>
  // The explicit dispatcher mirrors the 26-operation compatibility contract.
  // oxlint-disable-next-line eslint/complexity
  async (request: Request): Promise<Response> => {
    const startedAt = performance.now();
    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/healthz") {
        return new Response("OK");
      }

      if (
        request.method === "GET" &&
        (url.pathname === "/openapi.yaml" || url.pathname === "/docs-yaml")
      ) {
        return new Response(await openApiFile(), {
          headers: { "content-type": "application/yaml" },
        });
      }

      if (request.method === "GET" && url.pathname === "/docs-json") {
        const document = Bun.YAML.parse(await (await openApiFile()).text());
        return json(document);
      }

      if (request.method === "GET" && url.pathname === "/docs") {
        return new Response(
          '<!doctype html><html><head><title>Battle Log API</title></head><body><h1>Battle Log API</h1><p><a href="/docs-json">OpenAPI JSON</a></p></body></html>',
          { headers: { "content-type": "text/html; charset=utf-8" } },
        );
      }

      const publicTimelineId = pathParameter(
        url.pathname,
        /^\/battles\/public\/([^/]+)\/timeline$/,
      );
      if (request.method === "GET" && publicTimelineId) {
        return json(
          await controllers.publicBattles.getPublicBattleTimeline(
            publicTimelineId,
          ),
        );
      }

      const publicRawId = pathParameter(
        url.pathname,
        /^\/battles\/public\/([^/]+)\/raw$/,
      );
      if (request.method === "GET" && publicRawId) {
        return json(
          await controllers.publicBattles.getPublicBattleRaw(publicRawId),
        );
      }

      const publicBattleId = pathParameter(
        url.pathname,
        /^\/battles\/public\/([^/]+)$/,
      );
      if (request.method === "GET" && publicBattleId) {
        return json(
          await controllers.publicBattles.getPublicBattle(publicBattleId),
        );
      }

      if (
        request.method === "POST" &&
        url.pathname === "/internal/delete-user-data"
      ) {
        const body: DeleteUserData = await parseBody(
          DeleteUserDataSchema,
          request,
        );
        return json(await controllers.internal.deleteUserData(body), 201);
      }

      if (!url.pathname.startsWith("/battles")) {
        return json({ message: "Not Found", statusCode: 404 }, 404);
      }

      const userId = authenticatedUserId(request);

      if (request.method === "POST" && url.pathname === "/battles") {
        const body: CreateBattleDto = await parseBody(
          CreateBattleSchema,
          request,
        );
        return json(await controllers.battles.createBattle(body, userId), 201);
      }

      if (request.method === "GET" && url.pathname === "/battles/@me") {
        const query: QueryBattlesDto = parseQuery(QueryBattlesSchema, url);
        return json(
          await controllers.battles.getDashboardBattles(query, userId),
        );
      }

      if (
        request.method === "GET" &&
        url.pathname === "/battles/@me/characters"
      ) {
        return json(await controllers.battles.getUserCharacters(userId));
      }

      if (
        request.method === "GET" &&
        url.pathname === "/battles/@me/analytics"
      ) {
        const query: QueryBattleAnalyticsDto = parseQuery(
          QueryBattleAnalyticsSchema,
          url,
        );
        return json(
          await controllers.battles.getBattleAnalytics(query, userId),
        );
      }

      if (
        request.method === "GET" &&
        url.pathname === "/battles/@me/abyss/seasons"
      ) {
        const query: QueryAbyssSeasonsDto = parseQuery(
          QueryAbyssSeasonsSchema,
          url,
        );
        return json(await controllers.battles.getAbyssSeasons(query, userId));
      }

      const statisticsRoutes = new Map<
        string,
        (query: QueryBattleStatisticsDto, userId: string) => Promise<unknown>
      >([
        [
          "/battles/@me/statistics/combat-profile",
          (query, id) => controllers.battles.getCombatProfile(query, id),
        ],
        [
          "/battles/@me/statistics/profession-win-rate",
          (query, id) => controllers.battles.getProfessionWinRate(query, id),
        ],
        [
          "/battles/@me/statistics/head-to-head",
          (query, id) => controllers.battles.getHeadToHead(query, id),
        ],
        [
          "/battles/@me/statistics/streak",
          (query, id) => controllers.battles.getCurrentStreak(query, id),
        ],
        [
          "/battles/@me/statistics/duration",
          (query, id) => controllers.battles.getBattleDuration(query, id),
        ],
        [
          "/battles/@me/statistics/ph-growth",
          (query, id) => controllers.battles.getPhGrowth(query, id),
        ],
        [
          "/battles/@me/statistics/rating-growth",
          (query, id) => controllers.battles.getRatingGrowth(query, id),
        ],
        [
          "/battles/@me/statistics/rating-delta-by-opponent",
          (query, id) =>
            controllers.battles.getRatingDeltaByOpponent(query, id),
        ],
      ]);
      const statisticsHandler = statisticsRoutes.get(url.pathname);
      if (request.method === "GET" && statisticsHandler) {
        const query: QueryBattleStatisticsDto = parseQuery(
          QueryBattleStatisticsSchema,
          url,
        );
        return json(await statisticsHandler(query, userId));
      }

      if (
        request.method === "GET" &&
        url.pathname === "/battles/@me/statistics/player-vs-player"
      ) {
        const query: QueryPlayerVsPlayerDto = parseQuery(
          QueryPlayerVsPlayerSchema,
          url,
        );
        return json(
          await controllers.battles.getPlayerVsPlayerBattles(query, userId),
        );
      }

      if (
        request.method === "GET" &&
        url.pathname === "/battles/@me/warriors/search"
      ) {
        return json(
          await controllers.battles.searchWarriors(
            url.searchParams.get("q") ?? "",
            userId,
          ),
        );
      }

      if (request.method === "GET" && url.pathname === "/battles/@me/worlds") {
        return json(await controllers.battles.getUserWorlds(userId));
      }

      const timelineBattleId = pathParameter(
        url.pathname,
        /^\/battles\/([^/]+)\/timeline$/,
      );
      if (request.method === "GET" && timelineBattleId) {
        return json(
          await controllers.battles.getBattleTimeline(timelineBattleId, userId),
        );
      }

      const rawBattleId = pathParameter(
        url.pathname,
        /^\/battles\/([^/]+)\/raw$/,
      );
      if (request.method === "GET" && rawBattleId) {
        return json(
          await controllers.battles.getBattleRawData(rawBattleId, userId),
        );
      }

      const battleId = pathParameter(url.pathname, /^\/battles\/([^/]+)$/);
      if (battleId && request.method === "GET") {
        return json(await controllers.battles.getBattle(battleId, userId));
      }
      if (battleId && request.method === "PATCH") {
        const body: UpdateBattleDto = await parseBody(
          UpdateBattleSchema,
          request,
        );
        return json(
          await controllers.battles.updateBattle(battleId, body, userId),
        );
      }
      if (battleId && request.method === "DELETE") {
        return json(await controllers.battles.deleteBattle(battleId, userId));
      }

      return json({ message: "Not Found", statusCode: 404 }, 404);
    } catch (error) {
      return errorResponse(error);
    } finally {
      logger.log("HTTP request completed", {
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
        method: request.method,
        path: url.pathname,
      });
    }
  };
