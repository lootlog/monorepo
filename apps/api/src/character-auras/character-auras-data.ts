import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import type {
  CharacterAuraId,
  PersonalCharacterAuraId,
} from "@lootlog/schema/character-aura";
import type {
  CharacterAuraGrantHoldersResponse,
  CharacterAuraGrantsResponse,
  CharacterAurasResponse,
  OwnCharacterAuraResponse,
} from "#src/contracts/character-auras/schemas";

export class CharacterAuraAccessDenied extends TaggedErrorClass<
  CharacterAuraAccessDenied,
  { readonly brand: unique symbol }
>()("CharacterAuraAccessDenied", { status: Schema.Literal(403) }) {}

export class CharacterAurasOperationError extends TaggedErrorClass<
  CharacterAurasOperationError,
  { readonly brand: unique symbol }
>()("CharacterAurasOperationError", { cause: Schema.Defect() }) {}

export interface CharacterAuraCharacter {
  readonly gameAccountId: string;
  readonly characterId: string;
}

export type CharacterAurasFailure =
  | CharacterAuraAccessDenied
  | CharacterAurasOperationError;

type Operation<A> = Effect.Effect<A, CharacterAurasFailure>;

export class CharacterAurasData extends Context.Service<
  CharacterAurasData,
  {
    readonly getAuras: Effect.Effect<
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
    readonly listGrantHolders: (
      callerUserId: string,
    ) => Operation<CharacterAuraGrantHoldersResponse>;
    readonly getGrants: (
      callerUserId: string,
      userId: string,
    ) => Operation<CharacterAuraGrantsResponse>;
    readonly grantAuras: (
      callerUserId: string,
      userId: string,
    ) => Operation<void>;
    readonly grantPersonalAura: (
      callerUserId: string,
      userId: string,
      auraId: PersonalCharacterAuraId,
    ) => Operation<void>;
    readonly revokeAuras: (
      callerUserId: string,
      userId: string,
    ) => Operation<void>;
  }
>()("@lootlog/api/http-api/character-auras/data") {}
