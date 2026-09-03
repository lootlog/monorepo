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
        toRecordsHttpResponse(fetchLoots(params.guildId, query)),
      )
      .handle("LootsControllerGetLootStats", ({ params, query }) =>
        toRecordsHttpResponse(getLootStats(params.guildId, query)),
      )
      .handle("LootsControllerCountLootsByGuildId", ({ params, query }) =>
        toRecordsHttpResponse(countLoots(params.guildId, query)),
      )
      .handle("LootsControllerResolveLootItemByHid", ({ params, query }) =>
        toRecordsHttpResponse(resolveLootItem(params.guildId, query)),
      )
      .handle("LootsControllerFetchLootById", ({ params }) =>
        toRecordsHttpResponse(fetchLoot(params.guildId, params.lootId)),
      )
      .handle("LootsControllerDeleteLoot", ({ params }) =>
        toRecordsHttpResponse(archiveLoot(params.guildId, params.lootId)),
      )
      .handle("LootsControllerCreateLoot", ({ payload }) =>
        toRecordsHttpResponse(createLoot(payload)),
      )
      .handle("LootsControllerGetComments", ({ params }) =>
        toRecordsHttpResponse(getComments(params.guildId, params.lootId)),
      )
      .handle("LootsControllerCreateComment", ({ params, payload }) =>
        toRecordsHttpResponse(
          createComment(params.guildId, params.lootId, payload),
        ),
      )
      .handle("LootsControllerUpdateLoot", ({ params, payload }) =>
        toRecordsHttpResponse(updateLoot(params.id, payload)),
      ),
);
