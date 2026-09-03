import { Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  ApplicationError,
  ApplicationErrorKind,
} from "#src/shared/http/http-errors";

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
  if (cause instanceof ApplicationError) {
    switch (cause.kind) {
      case ApplicationErrorKind.INVALID_REQUEST:
        return new TimersInvalidRequest({ status: 400, code: cause.kind });
      case ApplicationErrorKind.FORBIDDEN:
        return new TimersForbidden({ status: 403, code: cause.kind });
      case ApplicationErrorKind.NOT_FOUND:
        return new TimersNotFound({ status: 404, code: cause.kind });
      case ApplicationErrorKind.CONFLICT:
        return new TimersConflict({ status: 409, code: cause.kind });
      default:
        return new TimersInfrastructureError({ cause });
    }
  }
  return new TimersInfrastructureError({ cause });
};
