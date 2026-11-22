import { Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { ApplicationError } from "@lootlog/protocol/http/errors";

export class TimersNotFound extends TaggedErrorClass<
  TimersNotFound,
  { readonly brand: unique symbol }
>()("TimersNotFound", { status: Schema.Literal(404), code: Schema.String }) {}

export class TimersMemberNotFound extends TaggedErrorClass<
  TimersMemberNotFound,
  { readonly brand: unique symbol }
>()("TimersMemberNotFound", {
  guildId: Schema.String,
  discordId: Schema.String,
}) {}

export class TimersInvariantViolation extends TaggedErrorClass<
  TimersInvariantViolation,
  { readonly brand: unique symbol }
>()("TimersInvariantViolation", { code: Schema.String }) {}

export class TimersInfrastructureError extends TaggedErrorClass<
  TimersInfrastructureError,
  { readonly brand: unique symbol }
>()("TimersInfrastructureError", { cause: Schema.Defect() }) {}

export type TimersDataFailure =
  | ApplicationError
  | TimersNotFound
  | TimersInfrastructureError;

export const toTimersDataFailure = (cause: unknown): TimersDataFailure => {
  if (
    cause instanceof TimersNotFound ||
    cause instanceof TimersInfrastructureError
  ) {
    return cause;
  }

  if (cause instanceof ApplicationError) return cause;

  return new TimersInfrastructureError({ cause });
};
