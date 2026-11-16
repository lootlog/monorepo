import { Context, Effect } from "effect";
import type { AccessPolicy } from "@lootlog/domain/access-policy";
import type { Guild, Role } from "./timers.types.js";
import type {
  CreateManualTimerRequest,
  CreateAutoTimerRequest,
  ResetTimerRequest,
  TimerNpcSearchQuery,
} from "#src/contracts/timers/schemas";
import type { TimersDataFailure } from "./timer-errors.js";

export type TimersIdentity = {
  readonly userId: string;
  readonly discordId: string;
};

export type TimersGuildAccess = TimersIdentity & {
  readonly guild: Guild;
  readonly accessPolicy: AccessPolicy;
  readonly roles: Role[];
};

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
    readonly getGuildHeroTimers: (
      access: TimersGuildAccess,
      world: string,
    ) => DataEffect;
    readonly searchNpcs: (
      access: TimersGuildAccess,
      query: TimerNpcSearchQuery,
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
