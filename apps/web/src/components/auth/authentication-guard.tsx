import { useAuthScopes } from "@/hooks/api/use-auth-scopes";
import { authClient } from "@/lib/auth-client";
import { DISCORD_AUTH_SCOPES } from "@lootlog/types";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { useTranslation } from "react-i18next";

type Props = {
  children: React.ReactNode;
};

export const AuthenticationGuard: React.FC<Props> = ({ children }) => {
  const { data: scopes, isFetched, isError } = useAuthScopes();
  const { t } = useTranslation();

  const hasRequiredScopes = DISCORD_AUTH_SCOPES.every((scope) =>
    scopes?.includes(scope),
  );

  const handleLoginAction = async () => {
    await authClient.signIn.social({
      provider: "discord",
      callbackURL: window.location.href,
      scopes: DISCORD_AUTH_SCOPES,
    });
  };

  return (
    <>
      <Dialog open={!hasRequiredScopes && isFetched && !isError}>
        <DialogContent className="p-4">
          <DialogTitle>{t("auth.reloginRequired.title")}</DialogTitle>
          <DialogDescription>
            {t("auth.reloginRequired.description")}
            <br />
            <br />
            <Button onClick={handleLoginAction}>
              {t("auth.reloginRequired.button")}
            </Button>
          </DialogDescription>
        </DialogContent>
      </Dialog>
      {children}
    </>
  );
};
