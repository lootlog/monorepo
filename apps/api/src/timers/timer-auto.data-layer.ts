import { selectCharacterCatchingGuildIds } from "#src/members/character-catching-guilds";
import { selectAccessibleGuilds } from "#src/members/member-access-query";
import { Clock, Effect, Result } from "effect";
import { partition } from "es-toolkit";
import { Permission } from "@lootlog/schema/permissions";
import { ApiDatabase } from "#src/database/drizzle/database";
import type { ReadyRoomOperationError } from "#src/messaging/ready-room/ready-room-data";
import type { JsonValue } from "#src/contracts/api-shared";
import {
  ApplicationError,
  InvalidRequestError,
  PermissionDeniedError,
} from "@lootlog/protocol/http/errors";
import { ErrorKey } from "#src/timers/error-key";
import { recordNpcSpawnPositions } from "#src/npc-spawns/npc-spawn-positions";
import type { CreateAutoTimerRequest } from "#src/contracts/timers/schemas";
import type { TimersIdentity } from "./timers-data.js";
import { toTimersDataFailure } from "./timer-errors.js";
import { calculateSpawnWindow, hasTimerWeight } from "./timer-auto-report.js";
import {
  writeGuildTimer,
  type AutoTimerGuildWritePorts,
} from "./timer-auto-guild-write.js";

export interface AutoTimerPorts extends AutoTimerGuildWritePorts {
  readonly closeKilledNpcGatherings: (kill: {
    readonly guildIds: ReadonlyArray<string>;
    readonly world: string;
    readonly npcId: number;
    readonly location: string;
  }) => Effect.Effect<void, ReadyRoomOperationError>;
}

const badRequest = (code: ErrorKey, rejectedGuilds: ReadonlyArray<JsonValue>) =>
  new InvalidRequestError({
    code,
    details: { submittedGuilds: [], rejectedGuilds },
  });

export const makeAutoTimer = (
  database: typeof ApiDatabase.Service,
  ports: AutoTimerPorts,
) => {
  const operation = Effect.fn("createAutoTimerData")(function* (
    identity: TimersIdentity,
    payload: CreateAutoTimerRequest,
  ) {
    if (!hasTimerWeight(payload)) {
      return yield* new InvalidRequestError({ code: ErrorKey.WT_TOO_LOW });
    }

    const now = new Date(yield* Clock.currentTimeMillis);

    yield* Effect.try({
      try: () => calculateSpawnWindow(payload, now),
      catch: (cause) =>
        cause instanceof InvalidRequestError
          ? cause
          : new InvalidRequestError({
              code: ErrorKey.INVALID_CUSTOM_SPAWN_TIME,
            }),
    });

    const [guildRows, catchingGuildIds] = yield* Effect.all(
      [
        selectAccessibleGuilds(database, identity.discordId, [
          Permission.LOOTLOG_TIMERS_WRITE,
        ]),
        selectCharacterCatchingGuildIds(database, identity.discordId, payload),
      ],
      { concurrency: "unbounded" },
    );

    if (guildRows.length === 0) return yield* new PermissionDeniedError();

    const catching = new Set(catchingGuildIds);

    const [targets, excluded] = partition(guildRows, ({ guild }) =>
      catching.has(guild.id),
    );

    const rejectedGuilds: Array<{
      guildId: string;
      guildName: string;
      reason: "NOT_ON_CATCHING_WHITELIST" | "TIMER_CREATE_FAILED";
    }> = excluded.map(({ guild }) => ({
      guildId: guild.id,
      guildName: guild.name,
      reason: "NOT_ON_CATCHING_WHITELIST" as const,
    }));

    if (targets.length === 0) {
      return yield* badRequest(
        ErrorKey.NO_GUILDS_ON_THE_CATCHING_WHITELIST,
        rejectedGuilds,
      );
    }

    const submittedGuilds: Array<{ guildId: string; guildName: string }> = [];

    const outcomes = yield* Effect.forEach(
      targets,
      ({ guild }) =>
        writeGuildTimer(database, ports, identity, guild.id, payload).pipe(
          Effect.result,
          Effect.map((result) => ({ guild, result })),
        ),
      { concurrency: 3 },
    );

    for (const { guild, result } of outcomes) {
      if (Result.isSuccess(result)) {
        submittedGuilds.push({ guildId: guild.id, guildName: guild.name });
      } else {
        yield* Effect.logWarning("Auto timer write failed").pipe(
          Effect.annotateLogs({ guildId: guild.id, cause: result.failure }),
        );
        rejectedGuilds.push({
          guildId: guild.id,
          guildName: guild.name,
          reason: "TIMER_CREATE_FAILED",
        });
      }
    }

    if (submittedGuilds.length === 0) {
      return yield* badRequest(
        ErrorKey.NO_GUILD_ACCEPTS_THIS_TIMER,
        rejectedGuilds,
      );
    }

    // Every Lootlog that recorded the kill is known only now, and a gathering
    // shared by several closes only when all of them did. Closing is
    // idempotent, so a retried report repeats it, and the kill report does not
    // wait for it.
    yield* ports
      .closeKilledNpcGatherings({
        guildIds: submittedGuilds.map(({ guildId }) => guildId),
        world: payload.world,
        npcId: payload.npc.id,
        location: payload.npc.location,
      })
      .pipe(Effect.ignore, Effect.forkDetach);

    return { submittedGuilds, rejectedGuilds };
  });

  // The game client reports kills unattended, so a rejected report is the
  // only trace of a timer that players expected to appear.
  const logRejection = (
    payload: CreateAutoTimerRequest,
    error: ApplicationError,
  ) =>
    Effect.logWarning("Auto timer rejected").pipe(
      Effect.annotateLogs({
        code: error.body.code,
        details: error.body.details,
        world: payload.world,
        characterId: payload.characterId,
        npcId: payload.npc.id,
        npcName: payload.npc.name,
      }),
    );

  // Where the spawn stood is a fact of the game, kept whether or not an
  // Organization takes the timer.
  return (identity: TimersIdentity, payload: CreateAutoTimerRequest) =>
    recordNpcSpawnPositions(database, payload.gameVersion, [payload.npc]).pipe(
      Effect.forkDetach,
      Effect.andThen(operation(identity, payload)),
      Effect.tapError((error) =>
        error instanceof ApplicationError
          ? logRejection(payload, error)
          : Effect.void,
      ),
      Effect.mapError(toTimersDataFailure),
    );
};
