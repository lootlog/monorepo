import { create } from "zustand";
import { resolveLoginState, type LoginState } from "@/hooks/auth/login-state";
import { authClient, readSession } from "@/lib/auth-client";
import { isExtensionClient } from "@/lib/game-client-platform";
import {
  recheckReauthentication,
  useReauthenticationStore,
} from "@/store/reauthentication.store";

export const useLoginWebsiteStore = create<{ websiteOpened: boolean }>(() => ({
  websiteOpened: false,
}));

export const markLoginWebsiteOpened = () =>
  useLoginWebsiteStore.setState({ websiteOpened: true });

export const useLoginState = () => {
  const session = authClient.useSession();
  const websiteOpened = useLoginWebsiteStore((state) => state.websiteOpened);
  const reauthentication = useReauthenticationStore();

  const state = resolveLoginState({
    extension: isExtensionClient(),
    websiteOpened,
    reauthentication,
    session,
  });

  const check = () =>
    void (reauthentication.required
      ? recheckReauthentication()
      : session.refetch());

  return { state, session, check };
};

const SIGN_IN_REQUIRED_STATES: ReadonlySet<LoginState> = new Set([
  "signedOut",
  "cookiesBlocked",
  "reauthRequired",
]);

export const useSignInRequired = () =>
  SIGN_IN_REQUIRED_STATES.has(useLoginState().state);

export const readLoginState = (): LoginState =>
  resolveLoginState({
    extension: isExtensionClient(),
    websiteOpened: useLoginWebsiteStore.getState().websiteOpened,
    reauthentication: useReauthenticationStore.getState(),
    session: readSession(),
  });
