import { useAuthScopes } from "@/hooks/api/use-auth-scopes";
import { authClient } from "@/lib/auth-client";
import { useAuthRecoveryStore } from "@/store/auth-recovery.store";
import { ApiError } from "@lootlog/client/transport";
import { DISCORD_AUTH_SCOPES } from "@lootlog/schema/discord";
import { LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AuthenticationRecovery } from "./authentication-recovery";

type Props = {
  children: React.ReactNode;
};

type ApiErrorData = {
  requiresReauth?: boolean;
};

const isReauthenticationError = (error: unknown) => {
  if (!(error instanceof ApiError)) {
    return false;
  }

  if (error.status === 401) {
    return true;
  }

  return (
    typeof error.data === "object" &&
    error.data !== null &&
    (error.data as ApiErrorData).requiresReauth === true
  );
};

export const AuthenticationGuard = ({ children }: Props) => {
  const { data: scopes, error, isError, isPending, refetch } = useAuthScopes();
  const authFailure = useAuthRecoveryStore((state) => state.failure);
  const reauthenticationAttempt = useRef<Promise<unknown> | null>(null);
  const [reauthenticationPending, setReauthenticationPending] = useState(false);
  const { t } = useTranslation();

  const hasRequiredScopes = DISCORD_AUTH_SCOPES.every((scope) =>
    scopes?.includes(scope),
  );

  const handleLoginAction = async () => {
    if (reauthenticationAttempt.current) {
      return;
    }

    setReauthenticationPending(true);
    const errorCallbackURL = new URL("/signin", window.location.origin);
    errorCallbackURL.searchParams.set(
      "redirect",
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
    const attempt = authClient.signIn.social({
      provider: "discord",
      callbackURL: window.location.href,
      errorCallbackURL: errorCallbackURL.toString(),
      scopes: DISCORD_AUTH_SCOPES,
    });
    reauthenticationAttempt.current = attempt;

    try {
      await attempt;
    } catch {
      reauthenticationAttempt.current = null;
      setReauthenticationPending(false);
    }
  };

  if (isPending && !authFailure) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoaderCircle
          aria-label={t("auth.loading")}
          className="size-8 animate-spin text-muted-foreground"
        />
      </div>
    );
  }

  if (hasRequiredScopes && !authFailure) {
    return children;
  }

  const requiresReauthentication =
    authFailure !== null || !isError || isReauthenticationError(error);

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
