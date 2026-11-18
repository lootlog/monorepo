import { Permission } from "@lootlog/schema/permissions";
import { Effect, Metric } from "effect";
import { HttpServerResponse } from "effect/http";
import type {
  LootsQuery,
  CreateLootCommentRequest,
  CreateLootRequest,
  LootStatsQuery,
  UserLootStatsQuery,
  ResolveLootItemQuery,
  UpdateLootShareRequest,
  CreateLootDrawRequest,
  VoidLootDrawRequest,
} from "#src/contracts/loots/schemas";
import {
  RecordsNotFound,
  requireCaller,
  requireGuild,
  data,
  toRecordsHttpResponse,
} from "../../access/records.access.js";
import { optionalPathString } from "#src/shared/http/handler-response";
import { HttpApiBuilder } from "effect/http-api";
import { LootlogApi } from "../../lootlog-api.js";

export const fetchLoots = Effect.fn("loots.fetchLoots")(function* (
  guildId: string | undefined,
  query: LootsQuery,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_READ);

  return yield* data((service) => service.fetchLoots(caller, query));
});

const getLootStats = Effect.fn("loots.getLootStats")(function* (
  guildId: string | undefined,
  query: LootStatsQuery,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_READ);

  return yield* data((service) => service.getLootStats(caller, query));
});

const getUserLootStats = Effect.fn("loots.getUserLootStats")(function* (
  query: UserLootStatsQuery,
) {
  const caller = yield* requireCaller;

  return yield* data((service) => service.getUserLootStats(caller, query));
});

const resolveLootItem = Effect.fn("loots.resolveLootItem")(function* (
  guildId: string | undefined,
  query: ResolveLootItemQuery,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_READ);

  return yield* data((service) => service.resolveLootItem(caller, query));
});

const lootDetailReads = Metric.counter("loot.detail.reads", {
  description: "Authorized loot detail reads by visibility outcome",
  incremental: true,
});

export const fetchLoot = Effect.fn("loots.fetchLoot")(function* (
  guildId: string | undefined,
  lootId: number,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_READ);
  const loot = yield* data((service) => service.fetchLoot(caller, lootId));
  // A filtered result deliberately does not reveal whether a record exists.
  const outcome = loot === null ? "unavailable" : "visible";
  yield* Metric.update(Metric.withAttributes(lootDetailReads, { outcome }), 1);
  yield* Effect.annotateCurrentSpan({
    "organization.id": caller.guild.id,
    "loot.id": lootId,
    "loot.detail.outcome": outcome,
  });

  if (loot === null) {
    return yield* new RecordsNotFound({
      status: 404,
      code: "LOOT_NOT_FOUND",
    });
  }

  return loot;
});

const archiveLoot = Effect.fn("loots.archiveLoot")(function* (
  guildId: string | undefined,
  lootId: number,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_ARCHIVE);

  const archived = yield* data((service) =>
    service.archiveLoot(caller, lootId),
  );

  if (!archived) {
    return yield* new RecordsNotFound({
      status: 404,
      code: "LOOT_NOT_FOUND",
    });
  }

  return HttpServerResponse.empty({ status: 200 });
});

export const createLoot = Effect.fn("loots.createLoot")(function* (
  payload: CreateLootRequest,
) {
  const caller = yield* requireCaller;

  return yield* data((service) => service.createLoot(caller, payload));
});

const getComments = Effect.fn("loots.getComments")(function* (
  guildId: string | undefined,
  lootId: number,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_READ);

  const comments = yield* data((service) =>
    service.getComments(caller, lootId),
  );

  if (comments === null) {
    return yield* new RecordsNotFound({
      status: 404,
      code: "LOOT_NOT_FOUND",
    });
  }

  return comments;
});

export const createComment = Effect.fn("loots.createComment")(function* (
  guildId: string | undefined,
  lootId: number,
  payload: CreateLootCommentRequest,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_WRITE);

  const comment = yield* data((service) =>
    service.createComment(caller, lootId, payload),
  );

  if (comment === null) {
    return yield* new RecordsNotFound({
      status: 404,
      code: "LOOT_NOT_FOUND",
    });
  }

  return comment;
});

const lootNotFound = () =>
  new RecordsNotFound({ status: 404, code: "LOOT_NOT_FOUND" });

const getLootDraws = Effect.fn("loots.getDraws")(function* (
  guildId: string | undefined,
  lootId: number,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_READ);
  const draws = yield* data((service) => service.getDraws(caller, lootId));

  if (draws === null) return yield* lootNotFound();

  return draws;
});

// Drawing and voiding decide who receives an item, as managing loots does.
export const createLootDraw = Effect.fn("loots.createDraw")(function* (
  guildId: string | undefined,
  lootId: number,
  payload: CreateLootDrawRequest,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_ARCHIVE);

  const draw = yield* data((service) =>
    service.createDraw(caller, lootId, payload),
  );

  if (draw === null) return yield* lootNotFound();

  return draw;
});

const voidLootDraw = Effect.fn("loots.voidDraw")(function* (
  guildId: string | undefined,
  lootId: number,
  drawId: number,
  payload: VoidLootDrawRequest,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_ARCHIVE);

  const draw = yield* data((service) =>
    service.voidDraw(caller, lootId, drawId, payload),
  );

  if (draw === null) return yield* lootNotFound();

  return draw;
});

const setLootLike = Effect.fn("loots.setLike")(function* (
  guildId: string | undefined,
  lootId: number,
  liked: boolean,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_READ);

  const likes = yield* data((service) =>
    service.setLike(caller, lootId, liked),
  );

  if (likes === null) {
    return yield* new RecordsNotFound({
      status: 404,
      code: "LOOT_NOT_FOUND",
    });
  }

  return likes;
});

const updateLoot = Effect.fn("loots.updateLoot")(function* (
  lootId: number,
  payload: UpdateLootShareRequest,
) {
  const caller = yield* requireCaller;

  const loot = yield* data((service) =>
    service.updateLoot(caller, lootId, payload),
  );

  if (loot === null) {
    return yield* new RecordsNotFound({
      status: 404,
      code: "LOOT_NOT_FOUND",
    });
  }

  return loot;
});

export const LootsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "loots",
  (handlers) =>
    handlers
      .handle("LootsControllerFetchLootsByGuildId", ({ params, query }) =>
        toRecordsHttpResponse(
          fetchLoots(optionalPathString(params.guildId), query),
        ),
      )
      .handle("LootsControllerGetUserLootStats", ({ query }) =>
        toRecordsHttpResponse(getUserLootStats(query)),
      )
      .handle("LootsControllerGetLootStats", ({ params, query }) =>
        toRecordsHttpResponse(
          getLootStats(optionalPathString(params.guildId), query),
        ),
      )
      .handle("LootsControllerResolveLootItemByHid", ({ params, query }) =>
        toRecordsHttpResponse(
          resolveLootItem(optionalPathString(params.guildId), query),
        ),
      )
      .handle("LootsControllerFetchLootById", ({ params }) =>
        toRecordsHttpResponse(
          fetchLoot(optionalPathString(params.guildId), params.lootId),
        ),
      )
      .handle("LootsControllerDeleteLoot", ({ params }) =>
        toRecordsHttpResponse(
          archiveLoot(optionalPathString(params.guildId), params.lootId),
        ),
      )
      .handle("LootsControllerCreateLoot", ({ payload }) =>
        toRecordsHttpResponse(createLoot(payload)),
      )
      .handle("LootsControllerGetComments", ({ params }) =>
        toRecordsHttpResponse(
          getComments(optionalPathString(params.guildId), params.lootId),
        ),
      )
      .handle("LootsControllerCreateComment", ({ params, payload }) =>
        toRecordsHttpResponse(
          createComment(
            optionalPathString(params.guildId),
            params.lootId,
            payload,
          ),
        ),
      )
      .handle("LootsControllerGetDraws", ({ params }) =>
        toRecordsHttpResponse(
          getLootDraws(optionalPathString(params.guildId), params.lootId),
        ),
      )
      .handle("LootsControllerCreateDraw", ({ params, payload }) =>
        toRecordsHttpResponse(
          createLootDraw(
            optionalPathString(params.guildId),
            params.lootId,
            payload,
          ),
        ),
      )
      .handle("LootsControllerVoidDraw", ({ params, payload }) =>
        toRecordsHttpResponse(
          voidLootDraw(
            optionalPathString(params.guildId),
            params.lootId,
            params.drawId,
            payload,
          ),
        ),
      )
      .handle("LootsControllerLikeLoot", ({ params }) =>
        toRecordsHttpResponse(
          setLootLike(optionalPathString(params.guildId), params.lootId, true),
        ),
      )
      .handle("LootsControllerUnlikeLoot", ({ params }) =>
        toRecordsHttpResponse(
          setLootLike(optionalPathString(params.guildId), params.lootId, false),
        ),
      )
      .handle("LootsControllerUpdateLoot", ({ params, payload }) =>
        toRecordsHttpResponse(updateLoot(params.id, payload)),
      ),
);
