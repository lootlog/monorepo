import { optionalPathString } from "#src/shared/http/handler-response";
import { HttpApiBuilder } from "effect/http-api";
import { LootlogApi } from "../../lootlog-api.js";
import {
  archiveLoot,
  createComment,
  createLootDraw,
  createLoot,
  fetchLoot,
  fetchLoots,
  getComments,
  getLootDraws,
  getLootStats,
  getUserLootStats,
  resolveLootItem,
  setLootLike,
  toRecordsHttpResponse,
  updateLoot,
  voidLootDraw,
} from "../records/records.operations.js";

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
