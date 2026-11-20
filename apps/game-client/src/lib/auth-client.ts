import { gameClientFetch } from "./game-client-platform";
import { AUTH_SERVICE_URL } from "@/config/auth";
import { createLootlogAuthClient } from "@lootlog/client/auth-session";

export const authClient = createLootlogAuthClient(AUTH_SERVICE_URL, {
  fetch: gameClientFetch,
});

type SessionState = ReturnType<typeof authClient.useSession>;

/** True only after the session request resolved without a signed-in User. */
export const isSessionSignedOut = (
  session: Pick<SessionState, "data" | "error" | "isPending">,
): boolean => !session.isPending && !session.error && !session.data;

// SAFETY: Better Auth's client config always registers the `session` atom
// (getSessionAtom in better-auth/client/config); `atoms` is typed only as a
// string record.
const sessionAtom = authClient.$store.atoms.session as {
  readonly value: SessionState;
};

/** Reads the session atom without mounting it, so this never starts a request. */
export const readSession = (): SessionState => sessionAtom.value;

export const isSignedOut = (): boolean => isSessionSignedOut(readSession());
