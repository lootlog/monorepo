import {
  type CharacterAuraGrantsResponseDto,
  characterAurasControllerGetGrants,
  characterAurasControllerListGrantHolders,
  characterAurasControllerGrantAuras,
  characterAurasControllerGrantPersonalAura,
  characterAurasControllerRevokeAuras,
} from "@lootlog/client/main";
import { ApiError } from "@lootlog/client/transport";
import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import {
  type AuraAction,
  AuraActionRequest,
  type AuraRefusal,
} from "@/lib/aura-action";
import { GAME_ACCOUNT_ID } from "@/lib/margonem-account";
import { asOperator } from "./lootlog-api.js";

export type AuraResult<A> =
  | { readonly status: "ok"; readonly value: A }
  | { readonly status: AuraRefusal };

/**
 * Turns the refusals an operator can act on into answers: an operator who is
 * no global chat admin, and an account no Lootlog User proved to play.
 */
const settle = async <A>(request: Promise<A>): Promise<AuraResult<A>> => {
  try {
    return { status: "ok", value: await request };
  } catch (error) {
    if (error instanceof ApiError && error.status === 403)
      return { status: "forbidden" };

    if (error instanceof ApiError && error.status === 404)
      return { status: "no-player" };

    throw error;
  }
};

/** The Users holding an aura grant, in general or a personal one. */
export const listAuraHolderIds = async () => {
  const result = await settle(
    characterAurasControllerListGrantHolders(asOperator()),
  );

  return result.status === "ok"
    ? {
        status: result.status,
        value: result.value.holders.map((holder) => holder.userId),
      }
    : result;
};

const runAuraAction = (gameAccountId: string, action: AuraAction) => {
  switch (action.action) {
    case "grant":
      return characterAurasControllerGrantAuras(
        { gameAccountId },
        asOperator(),
      );
    case "grant-personal":
      return characterAurasControllerGrantPersonalAura(
        { gameAccountId, auraId: action.auraId },
        asOperator(),
      );
    case "revoke":
      return characterAurasControllerRevokeAuras(
        { gameAccountId },
        asOperator(),
      );
  }
};

/** What the User who plays the account may choose. */
export const getAuraGrants = createServerFn({ method: "GET" })
  .validator(
    Schema.decodeUnknownSync(
      Schema.String.check(Schema.isPattern(GAME_ACCOUNT_ID)),
    ),
  )
  .handler(
    ({
      data: gameAccountId,
    }): Promise<AuraResult<CharacterAuraGrantsResponseDto>> =>
      settle(
        characterAurasControllerGetGrants({ gameAccountId }, asOperator()),
      ),
  );

/**
 * Grants or revokes auras through the API, which allows it only to a global
 * chat admin. The guard has already verified the operator and the origin.
 */
export const performAuraAction = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(AuraActionRequest))
  .handler(async ({ data }): Promise<AuraRefusal | undefined> => {
    const result = await settle(runAuraAction(data.gameAccountId, data.action));

    return result.status === "ok" ? undefined : result.status;
  });
