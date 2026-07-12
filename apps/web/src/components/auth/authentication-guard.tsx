import { useAuthScopes } from "@/hooks/api/use-auth-scopes";
import { authClient } from "@/lib/auth-client";
import { ApiError } from "@/lib/api-client/api-client";
import { useAuthRecoveryStore } from "@/store/auth-recovery.store";
import { DISCORD_AUTH_SCOPES, isAuthErrorResponse } from "@lootlog/types";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { AuthenticationRecovery } from "./authentication-recovery";

type Props = {
  children: React.ReactNode;
};

export const AuthenticationGuard: React.FC<Props> = ({ children }) => {
  const { data: scopes, error, isError, isPending, refetch } = useAuthScopes();
  const authFailure = useAuthRecoveryStore((state) => state.failure);
  const [reauthenticationPending, setReauthenticationPending] = useState(false);

  const hasRequiredScopes = DISCORD_AUTH_SCOPES.every((scope) =>
    scopes?.includes(scope),
  );

  const handleLoginAction = async () => {
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

  if (isPending) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoaderCircle className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasRequiredScopes && !authFailure) {
    return children;
  }

  const requiresReauthentication =
    Boolean(authFailure) ||
    !isError ||
    (error instanceof ApiError &&
      (error.status === 401 ||
        (isAuthErrorResponse(error.data) && error.data.requiresReauth)));

  if (requiresReauthentication) {
    return (
      <AuthenticationRecovery
        actionPending={reauthenticationPending}
        mode="reauth"
        onAction={() => void handleLoginAction()}
      />
    );
  }

  return (
    <AuthenticationRecovery mode="retry" onAction={() => void refetch()} />
  );
};
