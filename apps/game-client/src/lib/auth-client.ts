import { gameClientFetch } from "./game-client-platform";
import { AUTH_SERVICE_URL } from "@/config/auth";
import { createLootlogAuthClient } from "@lootlog/client/auth-session";

export const authClient = createLootlogAuthClient(AUTH_SERVICE_URL, {
  fetch: gameClientFetch,
});

type SessionState = ReturnType<typeof authClient.useSession>;

export const isSessionSignedOut = (
  session: Pick<SessionState, "data" | "error" | "isPending">,
): boolean => !session.isPending && !session.error && !session.data;

const sessionAtom = authClient.$store.atoms["session"];

if (!sessionAtom) {
  throw new Error("Better Auth client has no session atom");
}

export const readSession = (): SessionState => sessionAtom.value;

export const isSignedOut = (): boolean => isSessionSignedOut(readSession());
