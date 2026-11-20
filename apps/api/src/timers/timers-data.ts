import { Context, Effect } from "effect";
import type { AccessPolicy } from "@lootlog/domain/access-policy";
import type { Guild, Role } from "./timers.types.js";
import type {
  CreateManualTimerRequest,
  CreateAutoTimerRequest,
  ResetTimerRequest,
  CreateAutoTimerResponse,
  TimerNpcSearchQuery,
  TimerNpcSearchResponse,
} from "#src/contracts/timers/schemas";
import type { TimersDataFailure } from "./timer-errors.js";
import type { mapTimerResponse } from "./timer-projection.js";
import type { makeTimerHistory } from "./timer-history.data-layer.js";

export type TimersIdentity = {
  readonly userId: string;
  readonly discordId: string;
};

export type TimersGuildAccess = TimersIdentity & {
  readonly guild: Guild;
  readonly accessPolicy: AccessPolicy;
  readonly roles: Role[];
};

type DataEffect<A> = Effect.Effect<A, TimersDataFailure>;

type TimerView = ReturnType<typeof mapTimerResponse>;

type TimerHistory = ReturnType<typeof makeTimerHistory>;

type TimerHistoryView = Effect.Success<ReturnType<TimerHistory["getHistory"]>>;

export class TimersData extends Context.Service<
  TimersData,
  {
    readonly getAll: (
      identity: TimersIdentity,
      world?: string,
    ) => DataEffect<ReadonlyArray<TimerView>>;
    readonly getRecentHistory: (
      access: TimersGuildAccess,
      world: string,
      limit?: number,
    ) => DataEffect<
      Effect.Success<ReturnType<TimerHistory["getRecentHistory"]>>
    >;
    readonly getGuildTimers: (
      access: TimersGuildAccess,
      world?: string,
    ) => DataEffect<ReadonlyArray<TimerView>>;
    readonly getGuildHeroTimers: (
      access: TimersGuildAccess,
      world: string,
    ) => DataEffect<ReadonlyArray<TimerView>>;
    readonly searchNpcs: (
      access: TimersGuildAccess,
      query: TimerNpcSearchQuery,
    ) => DataEffect<TimerNpcSearchResponse>;
    readonly createAuto: (
      identity: TimersIdentity,
      payload: CreateAutoTimerRequest,
    ) => DataEffect<CreateAutoTimerResponse>;
    readonly reset: (
      access: TimersGuildAccess,
      timerIdentifier: string,
      payload: ResetTimerRequest,
    ) => DataEffect<TimerView>;
    readonly delete: (
      access: TimersGuildAccess,
      timerIdentifier: string,
      world?: string,
    ) => DataEffect<void>;
    readonly getHistory: (
      access: TimersGuildAccess,
      world: string,
      timerIdentifier: string,
      limit?: number,
    ) => DataEffect<TimerHistoryView>;
    readonly restore: (
      access: TimersGuildAccess,
      historyEntryId: number,
    ) => DataEffect<TimerView>;
    readonly createManual: (
      access: TimersGuildAccess,
      payload: CreateManualTimerRequest,
    ) => DataEffect<TimerView>;
  }
>()("@lootlog/api/http-api/timers/data") {
  static makeService(
    operations: Pick<
      TimersData["Service"],
      | "createAuto"
      | "getAll"
      | "delete"
      | "getGuildTimers"
      | "getGuildHeroTimers"
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
      getGuildHeroTimers: operations.getGuildHeroTimers,
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
