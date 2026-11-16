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

/** The User may not choose an aura, or does not play the character. */
export class CharacterAuraAccessDenied extends TaggedErrorClass<CharacterAuraAccessDenied>()(
  "CharacterAuraAccessDenied",
  { status: Schema.Literal(403) },
) {}

/** No Lootlog User proved to play the Margonem account. */
export class CharacterAuraGrantTargetNotFound extends TaggedErrorClass<CharacterAuraGrantTargetNotFound>()(
  "CharacterAuraGrantTargetNotFound",
  { status: Schema.Literal(404) },
) {}

export class CharacterAurasOperationError extends TaggedErrorClass<CharacterAurasOperationError>()(
  "CharacterAurasOperationError",
  { cause: Schema.Defect() },
) {}

/** A Margonem character, by its account and id. */
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
    /** Lets the User who plays the account choose any aura; admins only. */
    readonly grantAuras: (
      callerUserId: string,
      gameAccountId: string,
    ) => Operation<void>;
    /** Lets the User who plays the account choose one personal aura; admins only. */
    readonly grantPersonalAura: (
      callerUserId: string,
      gameAccountId: string,
      auraId: PersonalCharacterAuraId,
    ) => Operation<void>;
    /** Withdraws every grant and removes the auras they allowed; admins only. */
    readonly revokeAuras: (
      callerUserId: string,
      gameAccountId: string,
    ) => Operation<void>;
  }
>()("@lootlog/api/http-api/character-auras/data") {}
