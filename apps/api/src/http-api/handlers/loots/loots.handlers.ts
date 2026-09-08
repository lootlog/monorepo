import { optionalPathString } from "#src/shared/http/handler-response";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { LootlogApi } from "../../lootlog-api.js";
import {
  archiveLoot,
  countLoots,
  createComment,
  createLoot,
  fetchLoot,
  fetchLoots,
  getComments,
  getLootStats,
  resolveLootItem,
  toRecordsHttpResponse,
  updateLoot,
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
      .handle("LootsControllerGetLootStats", ({ params, query }) =>
        toRecordsHttpResponse(
          getLootStats(optionalPathString(params.guildId), query),
        ),
      )
      .handle("LootsControllerCountLootsByGuildId", ({ params, query }) =>
        toRecordsHttpResponse(
          countLoots(optionalPathString(params.guildId), query),
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
      .handle("LootsControllerUpdateLoot", ({ params, payload }) =>
        toRecordsHttpResponse(updateLoot(params.id, payload)),
      ),
);
