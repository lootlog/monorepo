import { useAuthScopes } from "@/hooks/api/use-auth-scopes";
import { useDiscordSignIn } from "@/hooks/auth/use-discord-sign-in";
import { useAuthRecoveryStore } from "@/store/auth-recovery.store";
import { isReauthenticationError } from "@/lib/api-reauthentication";
import { DISCORD_AUTH_SCOPES } from "@lootlog/schema/discord";
import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AuthenticationRecovery } from "./authentication-recovery";

type Props = {
  children: React.ReactNode;
};

export const AuthenticationGuard = ({ children }: Props) => {
  const {
    data: scopes,
    error,
    isError,
    isPending,
    isFetching,
    refetch,
  } = useAuthScopes();

  const authFailure = useAuthRecoveryStore((state) => state.failure);

  const {
    signIn,
    isPending: reauthenticationPending,
    hasError: hasSignInError,
  } = useDiscordSignIn();

  const { t } = useTranslation();

  const hasRequiredScopes = DISCORD_AUTH_SCOPES.every((scope) =>
    scopes?.includes(scope),
  );

  const handleLoginAction = () => {
    const errorCallbackURL = new URL("/signin", window.location.origin);
    errorCallbackURL.searchParams.set(
      "redirect",
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );

    return signIn({
      callbackURL: window.location.href,
      errorCallbackURL: errorCallbackURL.toString(),
      scopes: DISCORD_AUTH_SCOPES,
    });
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
        actionError={hasSignInError ? t("auth.signin.failed") : undefined}
        actionPending={reauthenticationPending}
        mode="reauth"
        onAction={() => void handleLoginAction()}
      />
    );
  }

  return (
    <AuthenticationRecovery
      actionPending={isFetching}
      mode="retry"
      onAction={() => void refetch()}
    />
  );
};
