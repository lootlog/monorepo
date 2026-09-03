import { TaggedError as TaggedErrorClass } from "effect/Schema";
import type { AccessPolicy } from "@lootlog/domain/access-policy";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import { Context, Effect, Layer, Schema } from "effect";
import { HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import type { guildTable, roleTable } from "#src/database/drizzle/schema";
import { LootlogApi } from "../../lootlog-api.js";
import type {
  KillsControllerCreateKill201,
  KillsControllerCreateKillRequestJson,
  KillsControllerGetGuildKillStats200,
  KillsControllerGetGuildKillStatsQuery,
  KillsControllerGetGuildTopKillersByType200,
  KillsControllerGetGuildTopKillersByTypeQuery,
  KillsControllerGetGuildTopNpcs200,
  KillsControllerGetGuildTopNpcsQuery,
  KillsControllerGetMemberKills200,
  KillsControllerGetMemberKillsQuery,
  KillsControllerGetNpcKillers200,
  KillsControllerGetNpcKillersQuery,
  KillsControllerGetUserKillStats200,
  KillsControllerGetUserKillStatsQuery,
  KillsControllerGetUserNpcKills200,
  KillsControllerGetUserNpcKillsQuery,
} from "../../contracts/kills/schemas.js";
import type {
  LootsControllerCountLootsByGuildId200,
  LootsControllerCountLootsByGuildIdQuery,
  LootsControllerCreateComment201,
  LootsControllerCreateCommentRequestJson,
  LootsControllerCreateLoot201,
  LootsControllerCreateLootRequestJson,
  LootsControllerFetchLootById200,
  LootsControllerFetchLootsByGuildId200,
  LootsControllerFetchLootsByGuildIdQuery,
  LootsControllerGetComments200,
  LootsControllerGetLootStats200,
  LootsControllerGetLootStatsQuery,
  LootsControllerResolveLootItemByHid200,
  LootsControllerResolveLootItemByHidQuery,
  LootsControllerUpdateLoot200,
  LootsControllerUpdateLootRequestJson,
} from "../../contracts/loots/schemas.js";

type Guild = typeof guildTable.$inferSelect;
type Role = typeof roleTable.$inferSelect;

export interface AuthenticatedCaller {
  readonly discordId: string;
  readonly userId: string;
}

export interface AuthorizedGuildCaller extends AuthenticatedCaller {
  readonly guild: Guild;
  readonly accessPolicy: AccessPolicy;
  readonly roles: ReadonlyArray<Role>;
}

export class KillsLootsAccessDenied extends TaggedErrorClass<KillsLootsAccessDenied>()(
  "KillsLootsAccessDenied",
  {
    status: Schema.Literals([401, 403]),
    code: Schema.String,
  },
) {}

export class KillsLootsNotFound extends TaggedErrorClass<KillsLootsNotFound>()(
  "KillsLootsNotFound",
  {
    status: Schema.Literal(404),
    code: Schema.String,
  },
) {}

export class KillsLootsBadRequest extends TaggedErrorClass<KillsLootsBadRequest>()(
  "KillsLootsBadRequest",
  {
    status: Schema.Literal(400),
    code: Schema.String,
  },
) {}

export class KillsLootsDataError extends TaggedErrorClass<KillsLootsDataError>()(
  "KillsLootsDataError",
  { cause: Schema.Defect() },
) {}

export class KillsLootsAuthorization extends Context.Service<
  KillsLootsAuthorization,
  {
    readonly requireCaller: Effect.Effect<
      AuthenticatedCaller,
      KillsLootsAccessDenied
    >;
    readonly requireGuild: (options: {
      readonly guildId: string;
      readonly capability: PermissionValue;
    }) => Effect.Effect<
      AuthorizedGuildCaller,
      KillsLootsAccessDenied | KillsLootsNotFound
    >;
  }
>()("@lootlog/api/http-api/kills-loots/authorization") {}

type DataEffect<A> = Effect.Effect<A, KillsLootsDataError>;

export class KillsLootsData extends Context.Service<
  KillsLootsData,
  {
    readonly createKill: (
      caller: AuthenticatedCaller,
      payload: KillsControllerCreateKillRequestJson,
    ) => DataEffect<KillsControllerCreateKill201>;
    readonly getGuildKillStats: (
      caller: AuthorizedGuildCaller,
      query: KillsControllerGetGuildKillStatsQuery,
    ) => DataEffect<KillsControllerGetGuildKillStats200>;
    readonly getUserKillStats: (
      caller: AuthenticatedCaller,
      query: KillsControllerGetUserKillStatsQuery,
    ) => DataEffect<KillsControllerGetUserKillStats200>;
    readonly getUserNpcKills: (
      caller: AuthenticatedCaller,
      query: KillsControllerGetUserNpcKillsQuery,
    ) => DataEffect<KillsControllerGetUserNpcKills200>;
    readonly getGuildTopNpcs: (
      caller: AuthorizedGuildCaller,
      query: KillsControllerGetGuildTopNpcsQuery,
    ) => DataEffect<KillsControllerGetGuildTopNpcs200>;
    readonly getGuildTopKillersByType: (
      caller: AuthorizedGuildCaller,
      query: KillsControllerGetGuildTopKillersByTypeQuery,
    ) => DataEffect<KillsControllerGetGuildTopKillersByType200>;
    readonly getNpcKillers: (
      caller: AuthorizedGuildCaller,
      npcId: number,
      query: KillsControllerGetNpcKillersQuery,
    ) => DataEffect<KillsControllerGetNpcKillers200 | null>;
    readonly getMemberKills: (
      caller: AuthorizedGuildCaller,
      memberId: number,
      query: KillsControllerGetMemberKillsQuery,
    ) => DataEffect<KillsControllerGetMemberKills200 | null>;
    readonly fetchLoots: (
      caller: AuthorizedGuildCaller,
      query: LootsControllerFetchLootsByGuildIdQuery,
    ) => DataEffect<LootsControllerFetchLootsByGuildId200>;
    readonly getLootStats: (
      caller: AuthorizedGuildCaller,
      query: LootsControllerGetLootStatsQuery,
    ) => DataEffect<LootsControllerGetLootStats200>;
    readonly countLoots: (
      caller: AuthorizedGuildCaller,
      query: LootsControllerCountLootsByGuildIdQuery,
    ) => DataEffect<number>;
    readonly resolveLootItem: (
      caller: AuthorizedGuildCaller,
      query: LootsControllerResolveLootItemByHidQuery,
    ) => DataEffect<LootsControllerResolveLootItemByHid200>;
    readonly fetchLoot: (
      caller: AuthorizedGuildCaller,
      lootId: number,
    ) => DataEffect<LootsControllerFetchLootById200>;
    readonly archiveLoot: (
      caller: AuthorizedGuildCaller,
      lootId: number,
    ) => DataEffect<boolean>;
    readonly createLoot: (
      caller: AuthenticatedCaller,
      payload: LootsControllerCreateLootRequestJson,
    ) => DataEffect<LootsControllerCreateLoot201>;
    readonly getComments: (
      caller: AuthorizedGuildCaller,
      lootId: number,
    ) => DataEffect<LootsControllerGetComments200 | null>;
    readonly createComment: (
      caller: AuthorizedGuildCaller,
      lootId: number,
      payload: LootsControllerCreateCommentRequestJson,
    ) => DataEffect<LootsControllerCreateComment201 | null>;
    readonly updateLoot: (
      caller: AuthenticatedCaller,
      lootId: number,
      payload: LootsControllerUpdateLootRequestJson,
    ) => DataEffect<LootsControllerUpdateLoot200 | null>;
  }
>()("@lootlog/api/http-api/kills-loots/data") {
  static layer(service: KillsLootsData["Service"]) {
    return Layer.succeed(KillsLootsData, KillsLootsData.of(service));
  }
}

const requireCaller = Effect.flatMap(
  KillsLootsAuthorization,
  (authorization) => authorization.requireCaller,
);

const requireGuild = (guildId: unknown, capability: PermissionValue) => {
  if (typeof guildId !== "string") {
    return Effect.fail(
      new KillsLootsAccessDenied({
        status: 403,
        code: "ORGANIZATION_SCOPE_REQUIRED",
      }),
    );
  }
  return Effect.flatMap(KillsLootsAuthorization, (authorization) =>
    authorization.requireGuild({ guildId, capability }),
  );
};

const data = <A>(
  operation: (service: KillsLootsData["Service"]) => DataEffect<A>,
) => Effect.flatMap(KillsLootsData, operation);

const parseIdentifier = (value: string, code: string) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed >= 0
    ? Effect.succeed(parsed)
    : Effect.fail(new KillsLootsBadRequest({ status: 400, code }));
};

export const createKill = Effect.fn("kills.createKill")(function* (
  payload: KillsControllerCreateKillRequestJson,
) {
  const caller = yield* requireCaller;
  return yield* data((service) => service.createKill(caller, payload));
});

export const getGuildKillStats = Effect.fn("kills.getGuildKillStats")(
  function* (guildId: unknown, query: KillsControllerGetGuildKillStatsQuery) {
    const caller = yield* requireGuild(guildId, Permission.LOOTLOG_ACCESS);
    return yield* data((service) => service.getGuildKillStats(caller, query));
  },
);

export const getUserKillStats = Effect.fn("kills.getUserKillStats")(function* (
  query: KillsControllerGetUserKillStatsQuery,
) {
  const caller = yield* requireCaller;
  return yield* data((service) => service.getUserKillStats(caller, query));
});

export const getUserNpcKills = Effect.fn("kills.getUserNpcKills")(function* (
  query: KillsControllerGetUserNpcKillsQuery,
) {
  const caller = yield* requireCaller;
  return yield* data((service) => service.getUserNpcKills(caller, query));
});

export const getGuildTopNpcs = Effect.fn("kills.getGuildTopNpcs")(function* (
  guildId: unknown,
  query: KillsControllerGetGuildTopNpcsQuery,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_ACCESS);
  return yield* data((service) => service.getGuildTopNpcs(caller, query));
});

export const getGuildTopKillersByType = Effect.fn(
  "kills.getGuildTopKillersByType",
)(function* (
  guildId: unknown,
  query: KillsControllerGetGuildTopKillersByTypeQuery,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_ACCESS);
  return yield* data((service) =>
    service.getGuildTopKillersByType(caller, query),
  );
});

export const getNpcKillers = Effect.fn("kills.getNpcKillers")(function* (
  guildId: unknown,
  npcId: string,
  query: KillsControllerGetNpcKillersQuery,
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
  guildId: unknown,
  memberId: string,
  query: KillsControllerGetMemberKillsQuery,
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
      pagination: null,
    }
  );
});

export const fetchLoots = Effect.fn("loots.fetchLoots")(function* (
  guildId: unknown,
  query: LootsControllerFetchLootsByGuildIdQuery,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_READ);
  return yield* data((service) => service.fetchLoots(caller, query));
});

export const getLootStats = Effect.fn("loots.getLootStats")(function* (
  guildId: unknown,
  query: LootsControllerGetLootStatsQuery,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_READ);
  return yield* data((service) => service.getLootStats(caller, query));
});

export const countLoots = Effect.fn("loots.countLoots")(function* (
  guildId: unknown,
  query: LootsControllerCountLootsByGuildIdQuery,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_READ);
  const count = yield* data((service) => service.countLoots(caller, query));
  return { count } satisfies LootsControllerCountLootsByGuildId200;
});

export const resolveLootItem = Effect.fn("loots.resolveLootItem")(function* (
  guildId: unknown,
  query: LootsControllerResolveLootItemByHidQuery,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_READ);
  return yield* data((service) => service.resolveLootItem(caller, query));
});

export const fetchLoot = Effect.fn("loots.fetchLoot")(function* (
  guildId: unknown,
  lootId: number,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_READ);
  const loot = yield* data((service) => service.fetchLoot(caller, lootId));
  if (loot === null) {
    return yield* new KillsLootsNotFound({
      status: 404,
      code: "LOOT_NOT_FOUND",
    });
  }
  return loot;
});

export const archiveLoot = Effect.fn("loots.archiveLoot")(function* (
  guildId: unknown,
  lootId: number,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_ARCHIVE);
  const archived = yield* data((service) =>
    service.archiveLoot(caller, lootId),
  );
  if (!archived) {
    return yield* new KillsLootsNotFound({
      status: 404,
      code: "LOOT_NOT_FOUND",
    });
  }
  return HttpServerResponse.empty({ status: 200 });
});

export const createLoot = Effect.fn("loots.createLoot")(function* (
  payload: LootsControllerCreateLootRequestJson,
) {
  const caller = yield* requireCaller;
  return yield* data((service) => service.createLoot(caller, payload));
});

export const getComments = Effect.fn("loots.getComments")(function* (
  guildId: unknown,
  lootId: number,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_READ);
  const comments = yield* data((service) =>
    service.getComments(caller, lootId),
  );
  if (comments === null) {
    return yield* new KillsLootsNotFound({
      status: 404,
      code: "LOOT_NOT_FOUND",
    });
  }
  return comments;
});

export const createComment = Effect.fn("loots.createComment")(function* (
  guildId: unknown,
  lootId: number,
  payload: LootsControllerCreateCommentRequestJson,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_WRITE);
  const comment = yield* data((service) =>
    service.createComment(caller, lootId, payload),
  );
  if (comment === null) {
    return yield* new KillsLootsNotFound({
      status: 404,
      code: "LOOT_NOT_FOUND",
    });
  }
  return comment;
});

export const updateLoot = Effect.fn("loots.updateLoot")(function* (
  lootId: number,
  payload: LootsControllerUpdateLootRequestJson,
) {
  const caller = yield* requireCaller;
  const loot = yield* data((service) =>
    service.updateLoot(caller, lootId, payload),
  );
  if (loot === null) {
    return yield* new KillsLootsNotFound({
      status: 404,
      code: "LOOT_NOT_FOUND",
    });
  }
  return loot;
});

type HttpFailure =
  | KillsLootsAccessDenied
  | KillsLootsBadRequest
  | KillsLootsNotFound;

const toHttpResponse = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, (error) => {
    if (
      error instanceof KillsLootsAccessDenied ||
      error instanceof KillsLootsBadRequest ||
      error instanceof KillsLootsNotFound
    ) {
      return Effect.succeed(
        HttpServerResponse.empty({ status: (error as HttpFailure).status }),
      );
    }
    return Effect.die(error);
  });

export const LootsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "loots",
  (handlers) =>
    handlers
      .handle("LootsControllerFetchLootsByGuildId", ({ params, query }) =>
        toHttpResponse(fetchLoots(params.guildId, query)),
      )
      .handle("LootsControllerGetLootStats", ({ params, query }) =>
        toHttpResponse(getLootStats(params.guildId, query)),
      )
      .handle("LootsControllerCountLootsByGuildId", ({ params, query }) =>
        toHttpResponse(countLoots(params.guildId, query)),
      )
      .handle("LootsControllerResolveLootItemByHid", ({ params, query }) =>
        toHttpResponse(resolveLootItem(params.guildId, query)),
      )
      .handle("LootsControllerFetchLootById", ({ params }) =>
        toHttpResponse(fetchLoot(params.guildId, params.lootId)),
      )
      .handle("LootsControllerDeleteLoot", ({ params }) =>
        toHttpResponse(archiveLoot(params.guildId, params.lootId)),
      )
      .handle("LootsControllerCreateLoot", ({ payload }) =>
        toHttpResponse(createLoot(payload)),
      )
      .handle("LootsControllerGetComments", ({ params }) =>
        toHttpResponse(getComments(params.guildId, params.lootId)),
      )
      .handle("LootsControllerCreateComment", ({ params, payload }) =>
        toHttpResponse(createComment(params.guildId, params.lootId, payload)),
      )
      .handle("LootsControllerUpdateLoot", ({ params, payload }) =>
        toHttpResponse(updateLoot(params.id, payload)),
      ),
);

export const KillsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "kills",
  (handlers) =>
    handlers
      .handle("KillsControllerCreateKill", ({ payload }) =>
        toHttpResponse(createKill(payload)),
      )
      .handle("KillsControllerGetGuildKillStats", ({ params, query }) =>
        toHttpResponse(getGuildKillStats(params.guildId, query)),
      )
      .handle("KillsControllerGetUserKillStats", ({ query }) =>
        toHttpResponse(getUserKillStats(query)),
      )
      .handle("KillsControllerGetUserNpcKills", ({ query }) =>
        toHttpResponse(getUserNpcKills(query)),
      )
      .handle("KillsControllerGetGuildTopNpcs", ({ params, query }) =>
        toHttpResponse(getGuildTopNpcs(params.guildId, query)),
      )
      .handle("KillsControllerGetGuildTopKillersByType", ({ params, query }) =>
        toHttpResponse(getGuildTopKillersByType(params.guildId, query)),
      )
      .handle("KillsControllerGetNpcKillers", ({ params, query }) =>
        toHttpResponse(getNpcKillers(params.guildId, params.npcId, query)),
      )
      .handle("KillsControllerGetMemberKills", ({ params, query }) =>
        toHttpResponse(getMemberKills(params.guildId, params.memberId, query)),
      ),
);
