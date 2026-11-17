import type {
  UserKillAnalyticsQuery,
  UserKillActivityQuery,
} from "#src/contracts/kills/analytics-schemas";
import { Permission } from "@lootlog/schema/permissions";
import { Effect } from "effect";
import type {
  CreateKillRequest,
  GuildKillStatsQuery,
  GuildTopKillersQuery,
  GuildTopNpcsQuery,
  MemberKillsQuery,
  NpcKillersQuery,
  UserKillStatsQuery,
  UserNpcKillsQuery,
} from "#src/contracts/kills/schemas";
import {
  requireCaller,
  requireGuild,
  data,
  parseIdentifier,
  toRecordsHttpResponse,
} from "../../access/records.access.js";
import { optionalPathString } from "#src/shared/http/handler-response";
import { HttpApiBuilder } from "effect/http-api";
import { LootlogApi } from "../../lootlog-api.js";

export const createKill = Effect.fn("kills.createKill")(function* (
  payload: CreateKillRequest,
) {
  const caller = yield* requireCaller;

  return yield* data((service) => service.createKill(caller, payload));
});

export const getGuildKillStats = Effect.fn("kills.getGuildKillStats")(
  function* (guildId: string | undefined, query: GuildKillStatsQuery) {
    const caller = yield* requireGuild(guildId, Permission.LOOTLOG_ACCESS);

    return yield* data((service) => service.getGuildKillStats(caller, query));
  },
);

export const getUserKillStats = Effect.fn("kills.getUserKillStats")(function* (
  query: UserKillStatsQuery,
) {
  const caller = yield* requireCaller;

  return yield* data((service) => service.getUserKillStats(caller, query));
});

export const getUserNpcKills = Effect.fn("kills.getUserNpcKills")(function* (
  query: UserNpcKillsQuery,
) {
  const caller = yield* requireCaller;

  return yield* data((service) => service.getUserNpcKills(caller, query));
});

export const getGuildTopNpcs = Effect.fn("kills.getGuildTopNpcs")(function* (
  guildId: string | undefined,
  query: GuildTopNpcsQuery,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_ACCESS);

  return yield* data((service) => service.getGuildTopNpcs(caller, query));
});

export const getGuildTopKillersByType = Effect.fn(
  "kills.getGuildTopKillersByType",
)(function* (guildId: string | undefined, query: GuildTopKillersQuery) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_ACCESS);

  return yield* data((service) =>
    service.getGuildTopKillersByType(caller, query),
  );
});

export const getNpcKillers = Effect.fn("kills.getNpcKillers")(function* (
  guildId: string | undefined,
  npcId: string,
  query: NpcKillersQuery,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_ACCESS);
  const parsedNpcId = yield* parseIdentifier(npcId, "INVALID_NPC_ID");

  const result = yield* data((service) =>
    service.getNpcKillers(caller, parsedNpcId, query),
  );

  return (
    result ?? {
      npc: null,
      killers: [],
    }
  );
});

export const getMemberKills = Effect.fn("kills.getMemberKills")(function* (
  guildId: string | undefined,
  memberId: string,
  query: MemberKillsQuery,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_ACCESS);
  const parsedMemberId = yield* parseIdentifier(memberId, "INVALID_MEMBER_ID");

  const result = yield* data((service) =>
    service.getMemberKills(caller, parsedMemberId, query),
  );

  return (
    result ?? {
      member: null,
      overview: null,
      npcs: [],
      total: 0,
      nextCursor: null,
    }
  );
});

export const getUserKillAnalytics = Effect.fn("kills.getUserKillAnalytics")(
  function* (query: UserKillAnalyticsQuery) {
    const caller = yield* requireCaller;

    return yield* data((service) =>
      service.getUserKillAnalytics(caller, query),
    );
  },
);

export const getUserKillActivity = Effect.fn("kills.getUserKillActivity")(
  function* (query: UserKillActivityQuery) {
    const caller = yield* requireCaller;

    return yield* data((service) => service.getUserKillActivity(caller, query));
  },
);

export const getUserKillCharacters = Effect.fn("kills.getUserKillCharacters")(
  function* () {
    const caller = yield* requireCaller;

    return yield* data((service) => service.getUserKillCharacters(caller));
  },
);

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
      .handle("KillsControllerGetUserKillCharacters", () =>
        toRecordsHttpResponse(getUserKillCharacters()),
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
