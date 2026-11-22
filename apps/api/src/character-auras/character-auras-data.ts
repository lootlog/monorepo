import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import type {
  CharacterAuraId,
  PersonalCharacterAuraId,
} from "@lootlog/schema/character-aura";
import type {
  CharacterAurasResponse,
  OwnCharacterAuraResponse,
} from "#src/contracts/character-auras/schemas";

export class CharacterAuraAccessDenied extends TaggedErrorClass<CharacterAuraAccessDenied>()(
  "CharacterAuraAccessDenied",
  { status: Schema.Literal(403) },
) {}

export class CharacterAuraGrantTargetNotFound extends TaggedErrorClass<CharacterAuraGrantTargetNotFound>()(
  "CharacterAuraGrantTargetNotFound",
  { status: Schema.Literal(404) },
) {}

export class CharacterAurasOperationError extends TaggedErrorClass<CharacterAurasOperationError>()(
  "CharacterAurasOperationError",
  { cause: Schema.Defect() },
) {}

export interface CharacterAuraCharacter {
  readonly gameAccountId: string;
  readonly characterId: string;
}

export type CharacterAurasFailure =
  | CharacterAuraAccessDenied
  | CharacterAuraGrantTargetNotFound
  | CharacterAurasOperationError;

type Operation<A> = Effect.Effect<A, CharacterAurasFailure>;

export class CharacterAurasData extends Context.Service<
  CharacterAurasData,
  {
    readonly getAuras: () => Effect.Effect<
      CharacterAurasResponse,
      CharacterAurasOperationError
    >;
    readonly getOwnAura: (
      userId: string,
    ) => Effect.Effect<OwnCharacterAuraResponse, CharacterAurasOperationError>;
    readonly updateOwnAura: (
      userId: string,
      character: CharacterAuraCharacter,
      auraId: CharacterAuraId | null,
    ) => Operation<OwnCharacterAuraResponse>;
    readonly grantAuras: (
      callerUserId: string,
      gameAccountId: string,
    ) => Operation<void>;
    readonly grantPersonalAura: (
      callerUserId: string,
      gameAccountId: string,
      auraId: PersonalCharacterAuraId,
    ) => Operation<void>;
    readonly revokeAuras: (
      callerUserId: string,
      gameAccountId: string,
    ) => Operation<void>;
  }
>()("@lootlog/api/http-api/character-auras/data") {}
