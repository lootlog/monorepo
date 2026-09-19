import {
  pathString,
  statusCodeResponse,
} from "#src/shared/http/handler-response";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";

import { applicationErrorResponse } from "../../application-error-response.js";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import {
  decodeTimerResponse,
  decodeTimersResponse,
  decodeTimerHistoryResponse,
  decodeTimerNpcSearchResponse,
  decodeCreateAutoTimerResponse,
} from "./timer-response.schema.js";
import type { AccessPolicy } from "@lootlog/domain/access-policy";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import type { Guild, Role } from "#src/timers/timers.types";
import { LootlogApi } from "../../lootlog-api.js";
import type {
  CreateManualTimerRequest,
  CreateAutoTimerRequest,
  ResetTimerRequest,
} from "#src/contracts/timers/schemas";

import {
  type TimersDataFailure,
  TimersInfrastructureError,
  type TimersNotFound,
} from "./timer-errors.js";

export type TimersIdentity = {
  readonly userId: string;
  readonly discordId: string;
};

export type TimersGuildAccess = TimersIdentity & {
  readonly guild: Guild;
  readonly accessPolicy: AccessPolicy;
  readonly roles: Role[];
};

export class TimersAccessDenied extends TaggedErrorClass<TimersAccessDenied>()(
  "TimersAccessDenied",
  { status: Schema.Literals([401, 403]), code: Schema.String },
) {}

export class TimersAuthorization extends Context.Service<
  TimersAuthorization,
  {
    readonly identity: Effect.Effect<TimersIdentity, TimersAccessDenied>;
    readonly requireGuild: (options: {
      readonly guildId: string;
      readonly capability: PermissionValue;
    }) => Effect.Effect<TimersGuildAccess, TimersAccessDenied | TimersNotFound>;
  }
>()("@lootlog/api/http-api/timers/authorization") {}

type DataEffect = Effect.Effect<unknown, TimersDataFailure>;

export class TimersData extends Context.Service<
  TimersData,
  {
    readonly getAll: (identity: TimersIdentity, world?: string) => DataEffect;
    readonly getRecentHistory: (
      access: TimersGuildAccess,
      world: string,
      limit?: number,
    ) => DataEffect;
    readonly getGuildTimers: (
      access: TimersGuildAccess,
      world?: string,
    ) => DataEffect;
    readonly searchNpcs: (
      guildId: string,
      world: string,
      search: string,
      limit?: number,
    ) => DataEffect;
    readonly createAuto: (
      identity: TimersIdentity,
      payload: CreateAutoTimerRequest,
    ) => DataEffect;
    readonly reset: (
      access: TimersGuildAccess,
      timerIdentifier: string,
      payload: ResetTimerRequest,
    ) => DataEffect;
    readonly delete: (
      access: TimersGuildAccess,
      timerIdentifier: string,
      world?: string,
    ) => DataEffect;
    readonly getHistory: (
      access: TimersGuildAccess,
      world: string,
      timerIdentifier: string,
      limit?: number,
    ) => DataEffect;
    readonly restore: (
      access: TimersGuildAccess,
      historyEntryId: number,
    ) => DataEffect;
    readonly createManual: (
      access: TimersGuildAccess,
      payload: CreateManualTimerRequest,
    ) => DataEffect;
  }
>()("@lootlog/api/http-api/timers/data") {
  static makeService(
    operations: Pick<
      TimersData["Service"],
      | "createAuto"
      | "getAll"
      | "delete"
      | "getGuildTimers"
      | "getHistory"
      | "getRecentHistory"
      | "createManual"
      | "restore"
      | "reset"
      | "searchNpcs"
    >,
  ): TimersData["Service"] {
    return TimersData.of({
      getAll: operations.getAll,
      getRecentHistory: operations.getRecentHistory,
      getGuildTimers: operations.getGuildTimers,
      searchNpcs: operations.searchNpcs,
      createAuto: operations.createAuto,
      reset: operations.reset,
      delete: operations.delete,
      getHistory: operations.getHistory,
      restore: operations.restore,
      createManual: operations.createManual,
    });
  }
}

const identity = Effect.flatMap(
  TimersAuthorization,
  (service) => service.identity,
);

const requireGuild = (guildId: string, capability: PermissionValue) =>
  Effect.flatMap(TimersAuthorization, (service) =>
    service.requireGuild({ guildId, capability }),
  );

const data = <A>(
  operation: (
    service: TimersData["Service"],
  ) => Effect.Effect<A, TimersDataFailure>,
) => Effect.flatMap(TimersData, operation);

const mapResponseError = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.mapError((cause) => new TimersInfrastructureError({ cause })),
  );

type TimersHttpFailure = TimersAccessDenied | TimersDataFailure;

const toHttpResponse = <A, R>(effect: Effect.Effect<A, TimersHttpFailure, R>) =>
  Effect.catchTags(effect, {
    ApplicationError: applicationErrorResponse,
    TimersAccessDenied: statusCodeResponse,
    TimersInfrastructureError: (error) => Effect.die(error.cause),
    TimersNotFound: statusCodeResponse,
  });

const parsedLimit = (value: unknown): number | undefined =>
  value ? Number.parseInt(String(value), 10) : undefined;

export const getAllTimers = Effect.fn("getAllTimers")(function* (
  world?: string,
) {
  const current = yield* identity;
  const value = yield* data((service) => service.getAll(current, world));

  return yield* mapResponseError(decodeTimersResponse(value));
});

export const getRecentTimerHistory = Effect.fn("getRecentTimerHistory")(
  function* (guildId: string, world: string, limit?: number) {
    const access = yield* requireGuild(guildId, Permission.LOOTLOG_TIMERS_READ);

    const value = yield* data((service) =>
      service.getRecentHistory(access, world, limit),
    );

    return yield* mapResponseError(decodeTimerHistoryResponse(value));
  },
);

export const getGuildTimers = Effect.fn("getGuildTimers")(function* (
  guildId: string,
  world?: string,
) {
  const access = yield* requireGuild(guildId, Permission.LOOTLOG_TIMERS_READ);
  const value = yield* data((service) => service.getGuildTimers(access, world));

  return yield* mapResponseError(decodeTimersResponse(value));
});

export const searchTimerNpcs = Effect.fn("searchTimerNpcs")(function* (
  guildId: string,
  world: string,
  search: string,
  limit?: number,
) {
  const access = yield* requireGuild(guildId, Permission.LOOTLOG_TIMERS_READ);

  const value = yield* data((service) =>
    service.searchNpcs(access.guild.id, world, search, limit),
  );

  return yield* mapResponseError(decodeTimerNpcSearchResponse(value));
});

export const createAutoTimer = Effect.fn("createAutoTimer")(function* (
  payload: CreateAutoTimerRequest,
) {
  const current = yield* identity;
  const value = yield* data((service) => service.createAuto(current, payload));

  return yield* mapResponseError(decodeCreateAutoTimerResponse(value));
});

export const resetGuildTimer = Effect.fn("resetGuildTimer")(function* (
  guildId: string,
  timerIdentifier: string,
  payload: ResetTimerRequest,
) {
  const access = yield* requireGuild(guildId, Permission.LOOTLOG_TIMERS_RESET);

  const value = yield* data((service) =>
    service.reset(access, timerIdentifier, payload),
  );

  return yield* mapResponseError(decodeTimerResponse(value));
});

export const deleteGuildTimer = Effect.fn("deleteGuildTimer")(function* (
  guildId: string,
  timerIdentifier: string,
  world?: string,
) {
  const access = yield* requireGuild(guildId, Permission.LOOTLOG_MANAGE);
  yield* data((service) => service.delete(access, timerIdentifier, world));
});

export const getGuildTimerHistory = Effect.fn("getGuildTimerHistory")(
  function* (
    guildId: string,
    world: string,
    timerIdentifier: string,
    limit?: number,
  ) {
    const access = yield* requireGuild(guildId, Permission.LOOTLOG_TIMERS_READ);

    const value = yield* data((service) =>
      service.getHistory(access, world, timerIdentifier, limit),
    );

    return yield* mapResponseError(decodeTimerHistoryResponse(value));
  },
);

export const restoreGuildTimer = Effect.fn("restoreGuildTimer")(function* (
  guildId: string,
  historyEntryId: number,
) {
  const access = yield* requireGuild(guildId, Permission.LOOTLOG_TIMERS_WRITE);

  const value = yield* data((service) =>
    service.restore(access, historyEntryId),
  );

  return yield* mapResponseError(decodeTimerResponse(value));
});

export const createManualGuildTimer = Effect.fn("createManualGuildTimer")(
  function* (guildId: string, payload: CreateManualTimerRequest) {
    const access = yield* requireGuild(
      guildId,
      Permission.LOOTLOG_TIMERS_WRITE,
    );

    const value = yield* data((service) =>
      service.createManual(access, payload),
    );

    return yield* mapResponseError(decodeTimerResponse(value));
  },
);

export const TimersHandlers = HttpApiBuilder.group(
  LootlogApi,
  "timers",
  (handlers) =>
    handlers
      .handle("TimersControllerGetAllTimers", ({ query }) =>
        toHttpResponse(getAllTimers(query.world)),
      )
      .handle("TimersControllerGetRecentTimerHistory", ({ query }) =>
        toHttpResponse(
          getRecentTimerHistory(
            query.guildId,
            query.world,
            parsedLimit(query.limit),
          ),
        ),
      )
      .handle("TimersControllerGetTimers", ({ params, query }) =>
        toHttpResponse(
          Effect.flatMap(pathString(params.guildId, "guildId"), (guildId) =>
            getGuildTimers(guildId, query.world),
          ),
        ),
      )
      .handle("TimersControllerSearchNpcsWithTimerData", ({ params, query }) =>
        toHttpResponse(
          searchTimerNpcs(
            params.guildId,
            query.world,
            query.search,
            query.limit,
          ),
        ),
      )
      .handle("TimersControllerCreateAutoTimer", ({ payload }) =>
        toHttpResponse(createAutoTimer(payload)),
      )
      .handle("TimersControllerResetTimer", ({ params, payload }) =>
        toHttpResponse(
          resetGuildTimer(params.guildId, params.timerIdentifier, payload),
        ),
      )
      .handle("TimersControllerDeleteTimer", ({ params, query }) =>
        toHttpResponse(
          deleteGuildTimer(params.guildId, params.timerIdentifier, query.world),
        ),
      )
      .handle("TimersControllerGetTimerHistory", ({ params, query }) =>
        toHttpResponse(
          getGuildTimerHistory(
            params.guildId,
            query.world,
            params.timerIdentifier,
            parsedLimit(query.limit),
          ),
        ),
      )
      .handle("TimersControllerRestoreTimerFromHistory", ({ params }) =>
        toHttpResponse(
          restoreGuildTimer(
            params.guildId,
            Number.parseInt(params.historyEntryId, 10),
          ),
        ),
      )
      .handle("TimersControllerCreateManualTimer", ({ params, payload }) =>
        toHttpResponse(createManualGuildTimer(params.guildId, payload)),
      ),
);
