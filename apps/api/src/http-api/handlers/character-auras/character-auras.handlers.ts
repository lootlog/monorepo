import { statusCodeResponse } from "#src/shared/http/handler-response";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import type {
  CharacterAuraId,
  PersonalCharacterAuraId,
} from "@lootlog/schema/character-aura";
import type {
  CharacterAurasResponse,
  OwnCharacterAuraResponse,
} from "#src/contracts/character-auras/schemas";
import { LootlogApi } from "../../lootlog-api.js";

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

export class CharacterAurasIdentity extends Context.Service<
  CharacterAurasIdentity,
  { readonly userId: Effect.Effect<string> }
>()("@lootlog/api/http-api/character-auras/identity") {}

type CharacterAurasFailure =
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

const withUser = <A, E>(
  operation: (
    data: CharacterAurasData["Service"],
    userId: string,
  ) => Effect.Effect<A, E>,
) =>
  Effect.gen(function* () {
    const identity = yield* CharacterAurasIdentity;
    const userId = yield* identity.userId;
    const data = yield* CharacterAurasData;

    return yield* operation(data, userId);
  });

export const getCharacterAuras = () =>
  Effect.flatMap(CharacterAurasData, (data) => data.getAuras());

export const getOwnCharacterAura = () =>
  withUser((data, userId) => data.getOwnAura(userId));

const toHttpResponse = <A, R>(
  effect: Effect.Effect<A, CharacterAurasFailure, R>,
) =>
  Effect.catchTags(effect, {
    CharacterAuraAccessDenied: statusCodeResponse,
    CharacterAuraGrantTargetNotFound: statusCodeResponse,
    CharacterAurasOperationError: (error) => Effect.die(error.cause),
  });

export const CharacterAurasHandlers = HttpApiBuilder.group(
  LootlogApi,
  "character-auras",
  (handlers) =>
    handlers
      .handle("CharacterAurasControllerGetAuras", () =>
        toHttpResponse(getCharacterAuras()),
      )
      .handle("CharacterAurasControllerGetOwnAura", () =>
        toHttpResponse(getOwnCharacterAura()),
      )
      .handle("CharacterAurasControllerUpdateOwnAura", ({ payload }) =>
        toHttpResponse(
          withUser((data, userId) =>
            data.updateOwnAura(
              userId,
              {
                gameAccountId: payload.gameAccountId,
                characterId: payload.characterId,
              },
              payload.auraId,
            ),
          ),
        ),
      )
      .handle("CharacterAurasControllerGrantAuras", ({ params }) =>
        toHttpResponse(
          withUser((data, userId) =>
            data.grantAuras(userId, params.gameAccountId),
          ),
        ),
      )
      .handle("CharacterAurasControllerGrantPersonalAura", ({ params }) =>
        toHttpResponse(
          withUser((data, userId) =>
            data.grantPersonalAura(userId, params.gameAccountId, params.auraId),
          ),
        ),
      )
      .handle("CharacterAurasControllerRevokeAuras", ({ params }) =>
        toHttpResponse(
          withUser((data, userId) =>
            data.revokeAuras(userId, params.gameAccountId),
          ),
        ),
      ),
);
