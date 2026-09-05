import { Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { ApplicationError } from "#src/shared/http/http-errors";

export class TimersInvalidRequest extends TaggedErrorClass<TimersInvalidRequest>()(
  "TimersInvalidRequest",
  { status: Schema.Literal(400), code: Schema.String },
) {}

export class TimersForbidden extends TaggedErrorClass<TimersForbidden>()(
  "TimersForbidden",
  { status: Schema.Literal(403), code: Schema.String },
) {}

export class TimersNotFound extends TaggedErrorClass<TimersNotFound>()(
  "TimersNotFound",
  { status: Schema.Literal(404), code: Schema.String },
) {}

export class TimersConflict extends TaggedErrorClass<TimersConflict>()(
  "TimersConflict",
  { status: Schema.Literal(409), code: Schema.String },
) {}

export class TimersMemberNotFound extends TaggedErrorClass<TimersMemberNotFound>()(
  "TimersMemberNotFound",
  { guildId: Schema.String, discordId: Schema.String },
) {}

export class TimersInvariantViolation extends TaggedErrorClass<TimersInvariantViolation>()(
  "TimersInvariantViolation",
  { code: Schema.String },
) {}

export class TimersInfrastructureError extends TaggedErrorClass<TimersInfrastructureError>()(
  "TimersInfrastructureError",
  { cause: Schema.Defect() },
) {}

export type TimersDataFailure =
  | ApplicationError
  | TimersInvalidRequest
  | TimersForbidden
  | TimersNotFound
  | TimersConflict
  | TimersInfrastructureError;

export const toTimersDataFailure = (cause: unknown): TimersDataFailure => {
  if (
    cause instanceof TimersInvalidRequest ||
    cause instanceof TimersForbidden ||
    cause instanceof TimersNotFound ||
    cause instanceof TimersConflict ||
    cause instanceof TimersInfrastructureError
  ) {
    return cause;
  }
  if (cause instanceof ApplicationError) return cause;
  return new TimersInfrastructureError({ cause });
};
