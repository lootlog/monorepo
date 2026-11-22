import { create } from "zustand";
import { resolveLoginState, type LoginState } from "@/hooks/auth/login-state";
import { authClient, readSession } from "@/lib/auth-client";
import { isExtensionClient } from "@/lib/game-client-platform";

export const useLoginWebsiteStore = create<{ websiteOpened: boolean }>(() => ({
  websiteOpened: false,
}));

export const markLoginWebsiteOpened = () =>
  useLoginWebsiteStore.setState({ websiteOpened: true });

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

export const readLoginState = (): LoginState =>
  resolveLoginState({
    extension: isExtensionClient(),
    websiteOpened: useLoginWebsiteStore.getState().websiteOpened,
    session: readSession(),
  });
