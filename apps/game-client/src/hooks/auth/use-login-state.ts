import { create } from "zustand";
import { resolveLoginState, type LoginState } from "@/hooks/auth/login-state";
import { authClient } from "@/lib/auth-client";
import { isExtensionClient } from "@/lib/game-client-platform";

/** Whether the player opened the website from the login window this run. */
export const useLoginWebsiteStore = create<{ websiteOpened: boolean }>(() => ({
  websiteOpened: false,
}));

export const markLoginWebsiteOpened = () =>
  useLoginWebsiteStore.setState({ websiteOpened: true });

/** The session and the website round trip read as one login state. */
export const useLoginState = () => {
  const session = authClient.useSession();
  const websiteOpened = useLoginWebsiteStore((state) => state.websiteOpened);

  const state = resolveLoginState({
    extension: isExtensionClient(),
    websiteOpened,
    session,
  });

  return { state, session };
};

/** The same reading outside React, such as for the diagnostics report. */
export const readLoginState = (): LoginState =>
  resolveLoginState({
    extension: isExtensionClient(),
    websiteOpened: useLoginWebsiteStore.getState().websiteOpened,
    // `value` reads the atom without mounting it, so this never starts a request.
    session: authClient.$store.atoms.session.value,
  });
