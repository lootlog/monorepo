import { emptyStatusResponse } from "#src/shared/http/handler-response";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import type { CharacterAuraId } from "@lootlog/schema/character-aura";
import type {
  CharacterAurasResponse,
  OwnCharacterAuraResponse,
} from "#src/contracts/character-auras/schemas";
import { LootlogApi } from "../../lootlog-api.js";

/** The User may not choose an aura, or wears none to show on an account. */
export class CharacterAuraAccessDenied extends TaggedErrorClass<CharacterAuraAccessDenied>()(
  "CharacterAuraAccessDenied",
  { status: Schema.Literal(403) },
) {}

export class CharacterAurasOperationError extends TaggedErrorClass<CharacterAurasOperationError>()(
  "CharacterAurasOperationError",
  { cause: Schema.Defect() },
) {}

export class CharacterAurasIdentity extends Context.Service<
  CharacterAurasIdentity,
  { readonly userId: Effect.Effect<string> }
>()("@lootlog/api/http-api/character-auras/identity") {}

type Operation<A> = Effect.Effect<
  A,
  CharacterAuraAccessDenied | CharacterAurasOperationError
>;

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
      auraId: CharacterAuraId | null,
    ) => Operation<OwnCharacterAuraResponse>;
    readonly linkGameAccount: (
      userId: string,
      gameAccountId: string,
    ) => Operation<OwnCharacterAuraResponse>;
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
  effect: Effect.Effect<
    A,
    CharacterAuraAccessDenied | CharacterAurasOperationError,
    R
  >,
) =>
  Effect.catchTags(effect, {
    CharacterAuraAccessDenied: emptyStatusResponse,
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
            data.updateOwnAura(userId, payload.auraId),
          ),
        ),
      )
      .handle("CharacterAurasControllerLinkGameAccount", ({ params }) =>
        toHttpResponse(
          withUser((data, userId) =>
            data.linkGameAccount(userId, params.gameAccountId),
          ),
        ),
      ),
);
