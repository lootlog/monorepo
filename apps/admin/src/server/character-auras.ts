import {
  characterAurasControllerGetGrants,
  characterAurasControllerGrantAuras,
  characterAurasControllerGrantPersonalAura,
  characterAurasControllerListGrantHolders,
  characterAurasControllerRevokeAuras,
} from "@lootlog/client/main";
import { ApiError } from "@lootlog/client/transport";
import type { PersonalCharacterAuraId } from "@lootlog/schema/character-aura";
import { asOperator } from "./lootlog-api.js";

export type AuraResult<A> =
  | { readonly status: "ok"; readonly value: A }
  | { readonly status: "forbidden" };

const settle = async <A>(request: Promise<A>): Promise<AuraResult<A>> => {
  try {
    return { status: "ok", value: await request };
  } catch (error) {
    if (error instanceof ApiError && error.status === 403)
      return { status: "forbidden" };

    throw error;
  }
};

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

export const getAuraGrants = (userId: string) =>
  settle(characterAurasControllerGetGrants({ userId }, asOperator()));

export const grantAuras = (userId: string) =>
  characterAurasControllerGrantAuras({ userId }, asOperator());

export const grantPersonalAura = (
  userId: string,
  auraId: PersonalCharacterAuraId,
) =>
  characterAurasControllerGrantPersonalAura({ userId, auraId }, asOperator());

export const revokeAuras = (userId: string) =>
  characterAurasControllerRevokeAuras({ userId }, asOperator());
