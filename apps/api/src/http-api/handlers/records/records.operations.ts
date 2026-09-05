import { statusCodeResponse } from "#src/shared/http/handler-response";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import type { AccessPolicy } from "@lootlog/domain/access-policy";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import { Context, Effect, Layer, Schema } from "effect";
import { applicationErrorResponse } from "../../application-error-response.js";
import { HttpServerResponse } from "effect/unstable/http";
import type { guildTable, roleTable } from "#src/database/drizzle/schema";
import type {
  CreateKillResponse,
  CreateKillRequest,
  GuildKillStatsResponse,
  GuildKillStatsQuery,
  GuildTopKillersByTypeResponse,
  GuildTopKillersQuery,
  GuildTopNpcsResponse,
  GuildTopNpcsQuery,
  MemberKillsResponse,
  MemberKillsQuery,
  NpcKillersResponse,
  NpcKillersQuery,
  UserKillStatsResponse,
  UserKillStatsQuery,
  UserNpcKillsResponse,
  UserNpcKillsQuery,
} from "#src/contracts/kills/schemas";
import type {
  LootCountResponse,
  LootsQuery,
  LootCommentResponse,
  CreateLootCommentRequest,
  CreateLootResponse,
  CreateLootRequest,
  LootDetailResponse,
  LootListResponse,
  LootCommentsResponse,
  LootStatsResponse,
  LootStatsQuery,
  ResolvedLootItemResponse,
  ResolveLootItemQuery,
  LootShareResponse,
  UpdateLootShareRequest,
} from "#src/contracts/loots/schemas";

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

export class RecordsAccessDenied extends TaggedErrorClass<RecordsAccessDenied>()(
  "RecordsAccessDenied",
  {
    status: Schema.Literals([401, 403]),
    code: Schema.String,
  },
) {}

export class RecordsNotFound extends TaggedErrorClass<RecordsNotFound>()(
  "RecordsNotFound",
  {
    status: Schema.Literal(404),
    code: Schema.String,
  },
) {}

export class RecordsBadRequest extends TaggedErrorClass<RecordsBadRequest>()(
  "RecordsBadRequest",
  {
    status: Schema.Literal(400),
    code: Schema.String,
  },
) {}

export class RecordsDataError extends TaggedErrorClass<RecordsDataError>()(
  "RecordsDataError",
  { cause: Schema.Defect() },
) {}

export class RecordsAuthorization extends Context.Service<
  RecordsAuthorization,
  {
    readonly requireCaller: Effect.Effect<
      AuthenticatedCaller,
      RecordsAccessDenied
    >;
    readonly requireGuild: (options: {
      readonly guildId: string;
      readonly capability: PermissionValue;
    }) => Effect.Effect<
      AuthorizedGuildCaller,
      RecordsAccessDenied | RecordsNotFound
    >;
  }
>()("@lootlog/api/http-api/records/authorization") {}

type DataEffect<A> = Effect.Effect<A, RecordsDataError>;

export class RecordsData extends Context.Service<
  RecordsData,
  {
    readonly createKill: (
      caller: AuthenticatedCaller,
      payload: CreateKillRequest,
    ) => DataEffect<CreateKillResponse>;
    readonly getGuildKillStats: (
      caller: AuthorizedGuildCaller,
      query: GuildKillStatsQuery,
    ) => DataEffect<GuildKillStatsResponse>;
    readonly getUserKillStats: (
      caller: AuthenticatedCaller,
      query: UserKillStatsQuery,
    ) => DataEffect<UserKillStatsResponse>;
    readonly getUserNpcKills: (
      caller: AuthenticatedCaller,
      query: UserNpcKillsQuery,
    ) => DataEffect<UserNpcKillsResponse>;
    readonly getGuildTopNpcs: (
      caller: AuthorizedGuildCaller,
      query: GuildTopNpcsQuery,
    ) => DataEffect<GuildTopNpcsResponse>;
    readonly getGuildTopKillersByType: (
      caller: AuthorizedGuildCaller,
      query: GuildTopKillersQuery,
    ) => DataEffect<GuildTopKillersByTypeResponse>;
    readonly getNpcKillers: (
      caller: AuthorizedGuildCaller,
      npcId: number,
      query: NpcKillersQuery,
    ) => DataEffect<NpcKillersResponse | null>;
    readonly getMemberKills: (
      caller: AuthorizedGuildCaller,
      memberId: number,
      query: MemberKillsQuery,
    ) => DataEffect<MemberKillsResponse | null>;
    readonly fetchLoots: (
      caller: AuthorizedGuildCaller,
      query: LootsQuery,
    ) => DataEffect<LootListResponse>;
    readonly getLootStats: (
      caller: AuthorizedGuildCaller,
      query: LootStatsQuery,
    ) => DataEffect<LootStatsResponse>;
    readonly countLoots: (
      caller: AuthorizedGuildCaller,
      query: LootsQuery,
    ) => DataEffect<number>;
    readonly resolveLootItem: (
      caller: AuthorizedGuildCaller,
      query: ResolveLootItemQuery,
    ) => DataEffect<ResolvedLootItemResponse>;
    readonly fetchLoot: (
      caller: AuthorizedGuildCaller,
      lootId: number,
    ) => DataEffect<LootDetailResponse>;
    readonly archiveLoot: (
      caller: AuthorizedGuildCaller,
      lootId: number,
    ) => DataEffect<boolean>;
    readonly createLoot: (
      caller: AuthenticatedCaller,
      payload: CreateLootRequest,
    ) => DataEffect<CreateLootResponse>;
    readonly getComments: (
      caller: AuthorizedGuildCaller,
      lootId: number,
    ) => DataEffect<LootCommentsResponse | null>;
    readonly createComment: (
      caller: AuthorizedGuildCaller,
      lootId: number,
      payload: CreateLootCommentRequest,
    ) => DataEffect<LootCommentResponse | null>;
    readonly updateLoot: (
      caller: AuthenticatedCaller,
      lootId: number,
      payload: UpdateLootShareRequest,
    ) => DataEffect<LootShareResponse | null>;
  }
>()("@lootlog/api/http-api/records/data") {
  static layer(service: RecordsData["Service"]) {
    return Layer.succeed(RecordsData, RecordsData.of(service));
  }
}

const requireCaller = Effect.flatMap(
  RecordsAuthorization,
  (authorization) => authorization.requireCaller,
);

const requireGuild = (guildId: unknown, capability: PermissionValue) => {
  if (typeof guildId !== "string") {
    return Effect.fail(
      new RecordsAccessDenied({
        status: 403,
        code: "ORGANIZATION_SCOPE_REQUIRED",
      }),
    );
  }
  return Effect.flatMap(RecordsAuthorization, (authorization) =>
    authorization.requireGuild({ guildId, capability }),
  );
};

const data = <A>(
  operation: (service: RecordsData["Service"]) => DataEffect<A>,
) => Effect.flatMap(RecordsData, operation);

const parseIdentifier = (value: string, code: string) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed >= 0
    ? Effect.succeed(parsed)
    : Effect.fail(new RecordsBadRequest({ status: 400, code }));
};

export const createKill = Effect.fn("kills.createKill")(function* (
  payload: CreateKillRequest,
) {
  const caller = yield* requireCaller;
  return yield* data((service) => service.createKill(caller, payload));
});

export const getGuildKillStats = Effect.fn("kills.getGuildKillStats")(
  function* (guildId: unknown, query: GuildKillStatsQuery) {
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
  guildId: unknown,
  query: GuildTopNpcsQuery,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_ACCESS);
  return yield* data((service) => service.getGuildTopNpcs(caller, query));
});

export const getGuildTopKillersByType = Effect.fn(
  "kills.getGuildTopKillersByType",
)(function* (guildId: unknown, query: GuildTopKillersQuery) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_ACCESS);
  return yield* data((service) =>
    service.getGuildTopKillersByType(caller, query),
  );
});

export const getNpcKillers = Effect.fn("kills.getNpcKillers")(function* (
  guildId: unknown,
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
  guildId: unknown,
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
      pagination: null,
    }
  );
});

export const fetchLoots = Effect.fn("loots.fetchLoots")(function* (
  guildId: unknown,
  query: LootsQuery,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_READ);
  return yield* data((service) => service.fetchLoots(caller, query));
});

export const getLootStats = Effect.fn("loots.getLootStats")(function* (
  guildId: unknown,
  query: LootStatsQuery,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_READ);
  return yield* data((service) => service.getLootStats(caller, query));
});

export const countLoots = Effect.fn("loots.countLoots")(function* (
  guildId: unknown,
  query: LootsQuery,
) {
  const caller = yield* requireGuild(guildId, Permission.LOOTLOG_LOOTS_READ);
  const count = yield* data((service) => service.countLoots(caller, query));
  return { count } satisfies LootCountResponse;
});

export const resolveLootItem = Effect.fn("loots.resolveLootItem")(function* (
  guildId: unknown,
  query: ResolveLootItemQuery,
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
    return yield* new RecordsNotFound({
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

export const getComments = Effect.fn("loots.getComments")(function* (
  guildId: unknown,
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
  guildId: unknown,
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

export const updateLoot = Effect.fn("loots.updateLoot")(function* (
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

type HttpFailure =
  | RecordsAccessDenied
  | RecordsBadRequest
  | RecordsNotFound
  | RecordsDataError;

export const toRecordsHttpResponse = <A, R>(
  effect: Effect.Effect<A, HttpFailure, R>,
) =>
  Effect.catchTags(effect, {
    RecordsAccessDenied: statusCodeResponse,
    RecordsBadRequest: statusCodeResponse,
    RecordsNotFound: statusCodeResponse,
    RecordsDataError: (error) => applicationErrorResponse(error.cause),
  });
