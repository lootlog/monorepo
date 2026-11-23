import type { UserEntitlementChange } from "@lootlog/schema/plans";
import { Effect } from "effect";
import { asOperator } from "./rpc.js";

export const getUserEntitlement = (userId: string) =>
  asOperator(({ auth, api }, session) =>
    Effect.andThen(
      auth.getOperator(session),
      api.getUserEntitlement({ userId }),
    ),
  );

export const setUserEntitlement = (
  userId: string,
  change: UserEntitlementChange,
) =>
  asOperator(({ auth, api }, session) =>
    Effect.flatMap(auth.getOperator(session), (operator) =>
      api.setUserEntitlement({
        userId,
        operatorUserId: operator.userId,
        change,
      }),
    ),
  );
