import type { PersonalCharacterAuraId } from "@lootlog/schema/character-aura";
import { Effect } from "effect";
import { asOperator } from "./rpc.js";

export const listAuraHolderIds = () =>
  asOperator(({ auth, api }, session) =>
    Effect.gen(function* () {
      yield* auth.getOperator(session);

      const { holders } = yield* api.listCharacterAuraGrantHolders();

      return holders.map((holder) => holder.userId);
    }),
  );

export const getAuraGrants = (userId: string) =>
  asOperator(({ auth, api }, session) =>
    Effect.andThen(
      auth.getOperator(session),
      api.getCharacterAuraGrants({ userId }),
    ),
  );

export const grantPersonalAura = (
  userId: string,
  auraId: PersonalCharacterAuraId,
) =>
  asOperator(({ auth, api }, session) =>
    Effect.flatMap(auth.getOperator(session), (operator) =>
      api.grantPersonalCharacterAura({
        userId,
        auraId,
        operatorUserId: operator.userId,
      }),
    ),
  );

export const revokePersonalAuras = (userId: string) =>
  asOperator(({ auth, api }, session) =>
    Effect.andThen(
      auth.getOperator(session),
      api.revokePersonalCharacterAuras({ userId }),
    ),
  );
