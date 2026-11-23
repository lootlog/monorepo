import { Effect } from "effect";
import { asOperator } from "./rpc.js";

export const listUserOrganizations = (discordId: string) =>
  asOperator(({ auth, api }, session) =>
    Effect.andThen(
      auth.getOperator(session),
      api.listUserOrganizations({ discordId }),
    ),
  );
