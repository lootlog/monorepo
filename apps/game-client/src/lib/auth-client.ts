import { gameClientFetch } from "./game-client-platform";
import { AUTH_SERVICE_URL } from "@/config/auth";
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: `${AUTH_SERVICE_URL}/idp`,
  fetchOptions: { customFetchImpl: gameClientFetch },
  plugins: [
    inferAdditionalFields({
      user: {
        discordId: {
          type: "string",
          required: true,
        },
      },
    }),
  ],
});

type SessionState = ReturnType<typeof authClient.useSession>;

/** True only after the session request resolved without a signed-in User. */
export const isSignedOut = (): boolean => {
  // `value` reads the atom without mounting it, so this never starts a request.
  const session: SessionState = authClient.$store.atoms.session.value;

  return !session.isPending && !session.error && !session.data;
};
