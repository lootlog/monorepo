import { useSession } from "@/hooks/auth/use-session";
import { authClient } from "@/lib/auth-client";
import { clearAuthenticatedClientState } from "@/lib/clear-authenticated-client-state";
import {
  getAuthControllerGetScopesQueryKey,
  useAuthControllerGetScopes,
} from "@/lib/api/generated/auth/auth/auth";
import { isApiError } from "@/lib/api-client";
import { useAuthRecoveryStore } from "@/store/auth-recovery.store";
import { DISCORD_AUTH_SCOPES, isAuthErrorResponse } from "@lootlog/types";
import { useEffect, useRef, useState } from "react";
import { GameClientAuthRecovery } from "./game-client-auth-recovery";

type Props = {
  children: React.ReactNode;
};

export const GameClientAuthBoundary: React.FC<Props> = ({ children }) => {
  const session = useSession();
  const authFailure = useAuthRecoveryStore((state) => state.failure);
  const [reauthenticationPending, setReauthenticationPending] = useState(false);
  const authenticatedContentMounted = useRef(false);
  const scopesQuery = useAuthControllerGetScopes({
    query: {
      enabled: Boolean(session.data) && !authFailure,
      queryKey: getAuthControllerGetScopesQueryKey(),
      retry: false,
    },
  });
  const hasRequiredScopes = DISCORD_AUTH_SCOPES.every((scope) =>
    scopesQuery.data?.includes(scope),
  );
  const authReady = Boolean(
    session.data && !authFailure && !scopesQuery.isError && hasRequiredScopes,
  );

  useEffect(() => {
    if (authReady) {
      authenticatedContentMounted.current = true;
      return;
    }

    if (authenticatedContentMounted.current) {
      authenticatedContentMounted.current = false;
      clearAuthenticatedClientState();
    }
  }, [authReady]);

  const handleReconnect = async () => {
    setReauthenticationPending(true);

    try {
      await authClient.signIn.social({
        provider: "discord",
        callbackURL: window.location.href,
        scopes: DISCORD_AUTH_SCOPES,
      });
    } catch {
      setReauthenticationPending(false);
    }
  };

  if (session.isPending || (session.data && scopesQuery.isPending)) {
    return <GameClientAuthRecovery mode="checking" />;
  }

  if (!session.data || authFailure) {
    return (
      <GameClientAuthRecovery
        actionPending={reauthenticationPending}
        mode="reauth"
        onAction={() => void handleReconnect()}
      />
    );
  }

  if (scopesQuery.isError) {
    const requiresReauthentication =
      isApiError(scopesQuery.error) &&
      (scopesQuery.error.status === 401 ||
        (isAuthErrorResponse(scopesQuery.error.data) &&
          scopesQuery.error.data.requiresReauth));

    if (requiresReauthentication) {
      return (
        <GameClientAuthRecovery
          actionPending={reauthenticationPending}
          mode="reauth"
          onAction={() => void handleReconnect()}
        />
      );
    }

    return (
      <GameClientAuthRecovery
        mode="retry"
        onAction={() => void scopesQuery.refetch()}
      />
    );
  }

  if (!hasRequiredScopes) {
    return (
      <GameClientAuthRecovery
        actionPending={reauthenticationPending}
        mode="reauth"
        onAction={() => void handleReconnect()}
      />
    );
  }

  return children;
};
