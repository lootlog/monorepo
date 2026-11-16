import { Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { ApplicationError } from "#src/shared/http/http-errors";

export class HeroSightingsNotFound extends TaggedErrorClass<HeroSightingsNotFound>()(
  "HeroSightingsNotFound",
  { status: Schema.Literal(404), code: Schema.String },
) {}

export class HeroSightingsMemberNotFound extends TaggedErrorClass<HeroSightingsMemberNotFound>()(
  "HeroSightingsMemberNotFound",
  { guildId: Schema.String, userId: Schema.String },
) {}

class HeroSightingsInfrastructureError extends TaggedErrorClass<HeroSightingsInfrastructureError>()(
  "HeroSightingsInfrastructureError",
  { cause: Schema.Defect() },
) {}

export type HeroSightingsDataFailure =
  | ApplicationError
  | HeroSightingsNotFound
  | HeroSightingsInfrastructureError;

export const toHeroSightingsDataFailure = (
  cause: unknown,
): HeroSightingsDataFailure => {
  if (
    cause instanceof HeroSightingsNotFound ||
    cause instanceof HeroSightingsInfrastructureError ||
    cause instanceof ApplicationError
  )
    return cause;

  return new HeroSightingsInfrastructureError({ cause });
};
