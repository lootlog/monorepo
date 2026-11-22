import {
  type CharacterAurasFailure,
  CharacterAurasData,
} from "#src/character-auras/character-auras-data";
import { statusCodeResponse } from "#src/shared/http/handler-response";

import { Context, Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { LootlogApi } from "../../lootlog-api.js";

export class CharacterAurasIdentity extends Context.Service<
  CharacterAurasIdentity,
  { readonly userId: Effect.Effect<string> }
>()("@lootlog/api/http-api/character-auras/identity") {}

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
      .handle("CharacterAurasControllerGetGrants", ({ params }) =>
        toHttpResponse(
          withUser((data, userId) =>
            data.getGrants(userId, params.gameAccountId),
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
