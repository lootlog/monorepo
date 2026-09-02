import { Context, Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import type { AccessPolicy } from "@lootlog/domain/access-policy";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import type { CreateManualTimerDto as LegacyCreateManualTimerDto } from "#src/timers/dto/create-manual-timer.dto";
import type { CreateTimerFromGameClientDto as LegacyCreateAutoTimerDto } from "#src/timers/dto/create-timer-from-game-client.dto";
import type { ResetTimerDto as LegacyResetTimerDto } from "#src/timers/dto/reset-timer.dto";
import type { TimersService } from "#src/timers/timers.service";
import type { Guild, Role } from "#src/timers/timers.types";
import {
  LootlogApi,
  TimersControllerCreateAutoTimer201,
  type CreateManualTimerDto,
  type CreateTimerFromGameClientDto,
  TimersControllerCreateManualTimer201,
  TimersControllerGetAllTimers200,
  TimersControllerGetRecentTimerHistory200,
  TimersControllerGetTimerHistory200,
  TimersControllerGetTimers200,
  TimersControllerResetTimer200,
  TimersControllerRestoreTimerFromHistory201,
  TimersControllerSearchNpcsWithTimerData200,
  type ResetTimerDto,
} from "../../lootlog-api.generated.js";

export const TIMERS_ENDPOINTS = [
  "TimersControllerGetAllTimers",
  "TimersControllerGetRecentTimerHistory",
  "TimersControllerGetTimers",
  "TimersControllerSearchNpcsWithTimerData",
  "TimersControllerCreateAutoTimer",
  "TimersControllerResetTimer",
  "TimersControllerDeleteTimer",
  "TimersControllerGetTimerHistory",
  "TimersControllerRestoreTimerFromHistory",
  "TimersControllerCreateManualTimer",
] as const;

export type TimersIdentity = {
  readonly userId: string;
  readonly discordId: string;
};

export type TimersGuildAccess = TimersIdentity & {
  readonly guild: Guild;
  readonly accessPolicy: AccessPolicy;
  readonly roles: Role[];
};

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class TimersAccessDenied extends Schema.TaggedError<TimersAccessDenied>()(
  "TimersAccessDenied",
  { status: Schema.Literals([401, 403]), code: Schema.String },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class TimersNotFound extends Schema.TaggedError<TimersNotFound>()(
  "TimersNotFound",
  { status: Schema.Literal(404), code: Schema.String },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class TimersOperationError extends Schema.TaggedError<TimersOperationError>()(
  "TimersOperationError",
  { cause: Schema.Defect() },
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

type DataEffect = Effect.Effect<unknown, TimersOperationError>;

export class TimersData extends Context.Service<
  TimersData,
  {
    readonly getAll: (identity: TimersIdentity, world?: string) => DataEffect;
    readonly getRecentHistory: (
      identity: TimersIdentity,
      guildId: string,
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
      payload: CreateTimerFromGameClientDto,
    ) => DataEffect;
    readonly reset: (
      identity: TimersIdentity,
      guildId: string,
      timerIdentifier: string,
      payload: ResetTimerDto,
    ) => DataEffect;
    readonly delete: (
      identity: TimersIdentity,
      guildId: string,
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
      identity: TimersIdentity,
      guildId: string,
      historyEntryId: number,
    ) => DataEffect;
    readonly createManual: (
      identity: TimersIdentity,
      guildId: string,
      payload: CreateManualTimerDto,
    ) => DataEffect;
  }
>()("@lootlog/api/http-api/timers/data") {
  static makeService(service: TimersService): TimersData["Service"] {
    const attempt = (operation: () => PromiseLike<unknown>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new TimersOperationError({ cause }),
      });

    return TimersData.of({
      getAll: ({ discordId, userId }, world) =>
        attempt(() => service.getAllTimers(discordId, userId, { world })),
      getRecentHistory: ({ discordId }, guildId, world, limit) =>
        attempt(() =>
          service.getRecentTimerHistory(discordId, guildId, world, { limit }),
        ),
      getGuildTimers: ({ userId, guild, accessPolicy, roles }, world) =>
        attempt(() =>
          service.getTimers(userId, { world }, guild, accessPolicy, roles),
        ),
      searchNpcs: (guildId, world, search, limit) =>
        attempt(() =>
          service.searchNpcsWithTimerData(guildId, world, search, limit),
        ),
      createAuto: ({ discordId, userId }, payload) =>
        attempt(() =>
          service.createAutoTimer(
            discordId,
            userId,
            structuredClone(payload) as LegacyCreateAutoTimerDto,
          ),
        ),
      reset: ({ discordId }, guildId, timerIdentifier, payload) =>
        attempt(() =>
          service.resetTimer(
            discordId,
            guildId,
            timerIdentifier,
            structuredClone(payload) as LegacyResetTimerDto,
          ),
        ),
      delete: ({ discordId }, guildId, timerIdentifier, world) =>
        attempt(() =>
          service.deleteTimer(discordId, guildId, timerIdentifier, world),
        ),
      getHistory: (
        { guild, accessPolicy, roles },
        world,
        timerIdentifier,
        limit,
      ) =>
        attempt(() =>
          service.getTimerHistory(guild.id, world, timerIdentifier, {
            limit,
            accessPolicy,
            roles,
          }),
        ),
      restore: ({ discordId }, guildId, historyEntryId) =>
        attempt(() =>
          service.restoreTimerFromHistory(discordId, guildId, historyEntryId),
        ),
      createManual: ({ discordId }, guildId, payload) =>
        attempt(() =>
          service.createManualTimer(
            discordId,
            guildId,
            structuredClone(payload) as LegacyCreateManualTimerDto,
          ),
        ),
    });
  }

  static layerService(service: TimersService) {
    return Layer.succeed(TimersData, TimersData.makeService(service));
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
  ) => Effect.Effect<A, TimersOperationError>,
) => Effect.flatMap(TimersData, operation);

const toWire = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toWire);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, toWire(nested)]),
  );
};

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  Schema.decodeUnknownEffect(schema)(toWire(value)).pipe(
    Effect.mapError((cause) => new TimersOperationError({ cause })),
  );

const defectCause = (error: unknown) =>
  error instanceof TimersOperationError ? error.cause : error;

const errorStatus = (error: unknown): number | undefined => {
  if (error instanceof TimersAccessDenied || error instanceof TimersNotFound) {
    return error.status;
  }
  const cause = defectCause(error);
  if (
    typeof cause === "object" &&
    cause !== null &&
    "getStatus" in cause &&
    typeof cause.getStatus === "function"
  ) {
    return cause.getStatus();
  }
  return undefined;
};

const orDieHttpFailure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, (error) => Effect.die(defectCause(error)));

const declaredEmptyError = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  statuses: ReadonlyArray<number>,
) =>
  Effect.catch(effect, (error) =>
    statuses.includes(errorStatus(error) ?? 0)
      ? Effect.fail(undefined)
      : Effect.die(defectCause(error)),
  );

const pathString = (value: unknown, name: string) =>
  typeof value === "string"
    ? Effect.succeed(value)
    : Effect.die(new TypeError(`${name} path parameter must be a string`));

const parsedLimit = (value: unknown): number | undefined =>
  value ? Number.parseInt(String(value), 10) : undefined;

export const getAllTimers = Effect.fn("getAllTimers")(function* (
  world?: string,
) {
  const current = yield* identity;
  const value = yield* data((service) => service.getAll(current, world));
  return yield* decode(TimersControllerGetAllTimers200, value);
});

export const getRecentTimerHistory = Effect.fn("getRecentTimerHistory")(
  function* (guildId: string, world: string, limit?: number) {
    const current = yield* identity;
    const value = yield* data((service) =>
      service.getRecentHistory(current, guildId, world, limit),
    );
    return yield* decode(TimersControllerGetRecentTimerHistory200, value);
  },
);

export const getGuildTimers = Effect.fn("getGuildTimers")(function* (
  guildId: string,
  world?: string,
) {
  const access = yield* requireGuild(guildId, Permission.LOOTLOG_TIMERS_READ);
  const value = yield* data((service) => service.getGuildTimers(access, world));
  return yield* decode(TimersControllerGetTimers200, value);
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
  return yield* decode(TimersControllerSearchNpcsWithTimerData200, value);
});

export const createAutoTimer = Effect.fn("createAutoTimer")(function* (
  payload: CreateTimerFromGameClientDto,
) {
  const current = yield* identity;
  const value = yield* data((service) => service.createAuto(current, payload));
  return yield* decode(TimersControllerCreateAutoTimer201, value);
});

export const resetGuildTimer = Effect.fn("resetGuildTimer")(function* (
  guildId: string,
  timerIdentifier: string,
  payload: ResetTimerDto,
) {
  const access = yield* requireGuild(guildId, Permission.LOOTLOG_TIMERS_RESET);
  const value = yield* data((service) =>
    service.reset(access, access.guild.id, timerIdentifier, payload),
  );
  return yield* decode(TimersControllerResetTimer200, value);
});

export const deleteGuildTimer = Effect.fn("deleteGuildTimer")(function* (
  guildId: string,
  timerIdentifier: string,
  world?: string,
) {
  const access = yield* requireGuild(guildId, Permission.LOOTLOG_MANAGE);
  yield* data((service) =>
    service.delete(access, access.guild.id, timerIdentifier, world),
  );
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
    return yield* decode(TimersControllerGetTimerHistory200, value);
  },
);

export const restoreGuildTimer = Effect.fn("restoreGuildTimer")(function* (
  guildId: string,
  historyEntryId: number,
) {
  const access = yield* requireGuild(guildId, Permission.LOOTLOG_TIMERS_WRITE);
  const value = yield* data((service) =>
    service.restore(access, access.guild.id, historyEntryId),
  );
  return yield* decode(TimersControllerRestoreTimerFromHistory201, value);
});

export const createManualGuildTimer = Effect.fn("createManualGuildTimer")(
  function* (guildId: string, payload: CreateManualTimerDto) {
    const access = yield* requireGuild(
      guildId,
      Permission.LOOTLOG_TIMERS_WRITE,
    );
    const value = yield* data((service) =>
      service.createManual(access, access.guild.id, payload),
    );
    return yield* decode(TimersControllerCreateManualTimer201, value);
  },
);

export const TimersHandlers = HttpApiBuilder.group(
  LootlogApi,
  "timers",
  (handlers) =>
    handlers
      .handle("TimersControllerGetAllTimers", ({ query }) =>
        orDieHttpFailure(getAllTimers(query.world)),
      )
      .handle("TimersControllerGetRecentTimerHistory", ({ query }) =>
        orDieHttpFailure(
          getRecentTimerHistory(
            query.guildId,
            query.world,
            parsedLimit(query.limit),
          ),
        ),
      )
      .handle("TimersControllerGetTimers", ({ params, query }) =>
        declaredEmptyError(
          Effect.flatMap(pathString(params.guildId, "guildId"), (guildId) =>
            getGuildTimers(guildId, query.world),
          ),
          [403],
        ),
      )
      .handle("TimersControllerSearchNpcsWithTimerData", ({ params, query }) =>
        declaredEmptyError(
          searchTimerNpcs(
            params.guildId,
            query.world,
            query.search,
            query.limit,
          ),
          [403],
        ),
      )
      .handle("TimersControllerCreateAutoTimer", ({ payload }) =>
        declaredEmptyError(createAutoTimer(payload), [400, 403]),
      )
      .handle("TimersControllerResetTimer", ({ params, payload }) =>
        declaredEmptyError(
          resetGuildTimer(params.guildId, params.timerIdentifier, payload),
          [403, 404],
        ),
      )
      .handle("TimersControllerDeleteTimer", ({ params, query }) =>
        declaredEmptyError(
          deleteGuildTimer(params.guildId, params.timerIdentifier, query.world),
          [403, 404],
        ),
      )
      .handle("TimersControllerGetTimerHistory", ({ params, query }) =>
        orDieHttpFailure(
          getGuildTimerHistory(
            params.guildId,
            query.world,
            params.timerIdentifier,
            parsedLimit(query.limit),
          ),
        ),
      )
      .handle("TimersControllerRestoreTimerFromHistory", ({ params }) =>
        orDieHttpFailure(
          restoreGuildTimer(
            params.guildId,
            Number.parseInt(params.historyEntryId, 10),
          ),
        ),
      )
      .handle("TimersControllerCreateManualTimer", ({ params, payload }) =>
        declaredEmptyError(
          createManualGuildTimer(params.guildId, payload),
          [403],
        ),
      ),
);
