import { HttpApiBuilder } from "effect/unstable/httpapi";
import { LootlogApi } from "../../lootlog-api.js";
import {
  createKill,
  getGuildKillStats,
  getGuildTopKillersByType,
  getGuildTopNpcs,
  getMemberKills,
  getNpcKillers,
  getUserKillStats,
  getUserNpcKills,
  toRecordsHttpResponse,
} from "../records/records.operations.js";

export const KillsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "kills",
  (handlers) =>
    handlers
      .handle("KillsControllerCreateKill", ({ payload }) =>
        toRecordsHttpResponse(createKill(payload)),
      )
      .handle("KillsControllerGetGuildKillStats", ({ params, query }) =>
        toRecordsHttpResponse(getGuildKillStats(params.guildId, query)),
      )
      .handle("KillsControllerGetUserKillStats", ({ query }) =>
        toRecordsHttpResponse(getUserKillStats(query)),
      )
      .handle("KillsControllerGetUserNpcKills", ({ query }) =>
        toRecordsHttpResponse(getUserNpcKills(query)),
      )
      .handle("KillsControllerGetGuildTopNpcs", ({ params, query }) =>
        toRecordsHttpResponse(getGuildTopNpcs(params.guildId, query)),
      )
      .handle("KillsControllerGetGuildTopKillersByType", ({ params, query }) =>
        toRecordsHttpResponse(getGuildTopKillersByType(params.guildId, query)),
      )
      .handle("KillsControllerGetNpcKillers", ({ params, query }) =>
        toRecordsHttpResponse(
          getNpcKillers(params.guildId, params.npcId, query),
        ),
      )
      .handle("KillsControllerGetMemberKills", ({ params, query }) =>
        toRecordsHttpResponse(
          getMemberKills(params.guildId, params.memberId, query),
        ),
      ),
);
