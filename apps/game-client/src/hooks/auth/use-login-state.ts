import { useEffect } from "react";
import {
  cancelLoginHandoff,
  useLoginHandoffStore,
} from "@/hooks/auth/login-handoff";
import { resolveLoginState, type LoginState } from "@/hooks/auth/login-state";
import { authClient } from "@/lib/auth-client";

/** The session and the popup handoff read as one login state. */
export const useLoginState = () => {
  const session = authClient.useSession();
  const handoff = useLoginHandoffStore((state) => state.handoff);
  const state = resolveLoginState({ handoff, session });

  useEffect(() => {
    if (state === "signedIn") cancelLoginHandoff();
  }, [state]);

  return { state, session, handoff };
};

/** The same reading outside React, such as for the diagnostics report. */
export const readLoginState = (): LoginState =>
  resolveLoginState({
    handoff: useLoginHandoffStore.getState().handoff,
    // `value` reads the atom without mounting it, so this never starts a request.
    session: authClient.$store.atoms.session.value,
  });
