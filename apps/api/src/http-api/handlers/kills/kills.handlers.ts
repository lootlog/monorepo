import { optionalPathString } from "#src/shared/http/handler-response";
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
  getUserKillAnalytics,
  getUserKillActivity,
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
        toRecordsHttpResponse(
          getGuildKillStats(optionalPathString(params.guildId), query),
        ),
      )
      .handle("KillsControllerGetUserKillAnalytics", ({ query }) =>
        toRecordsHttpResponse(getUserKillAnalytics(query)),
      )
      .handle("KillsControllerGetUserKillActivity", ({ query }) =>
        toRecordsHttpResponse(getUserKillActivity(query)),
      )
      .handle("KillsControllerGetUserKillStats", ({ query }) =>
        toRecordsHttpResponse(getUserKillStats(query)),
      )
      .handle("KillsControllerGetUserNpcKills", ({ query }) =>
        toRecordsHttpResponse(getUserNpcKills(query)),
      )
      .handle("KillsControllerGetGuildTopNpcs", ({ params, query }) =>
        toRecordsHttpResponse(
          getGuildTopNpcs(optionalPathString(params.guildId), query),
        ),
      )
      .handle("KillsControllerGetGuildTopKillersByType", ({ params, query }) =>
        toRecordsHttpResponse(
          getGuildTopKillersByType(optionalPathString(params.guildId), query),
        ),
      )
      .handle("KillsControllerGetNpcKillers", ({ params, query }) =>
        toRecordsHttpResponse(
          getNpcKillers(
            optionalPathString(params.guildId),
            params.npcId,
            query,
          ),
        ),
      )
      .handle("KillsControllerGetMemberKills", ({ params, query }) =>
        toRecordsHttpResponse(
          getMemberKills(
            optionalPathString(params.guildId),
            params.memberId,
            query,
          ),
        ),
      ),
);
