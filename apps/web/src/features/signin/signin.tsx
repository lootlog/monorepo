import { PageHeader } from "@lootlog/ui/components/page-header";
import { SectionCardContent } from "@lootlog/ui/components/section-card-content";
import { Button } from "@lootlog/ui/components/button";
import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { useSearch } from "@tanstack/react-router";
import { useDiscordSignIn } from "@lootlog/client/auth-session";
import { authClient } from "@/lib/auth-client";
import { signinRedirectPath } from "@/features/signin/signin-redirect-path";
import { useTranslation } from "react-i18next";
import { WEB_SIGN_IN_PATH } from "@lootlog/domain/public-sites";
import { DiscordIcon } from "@/features/signin/discord-icon";

export const SignIn: React.FC = () => {
  const search = useSearch({ from: "/signin" });
  const { signIn, isPending, hasError } = useDiscordSignIn(authClient);
  const { t } = useTranslation();

  const handleDiscordSignIn = () =>
    signIn({
      callbackURL: `${window.location.origin}${signinRedirectPath(search.redirect) ?? WEB_SIGN_IN_PATH}`,
      webOrigin: window.location.origin,
    });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 px-4">
        <PageHeader title={t("auth.signin.title")}>
          <SectionCardContent>
            {hasError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{t("auth.signin.failed")}</AlertDescription>
              </Alert>
            )}
            <Button
              onClick={handleDiscordSignIn}
              icon={<DiscordIcon />}
              loading={isPending}
              className="w-full"
              size="xl"
            >
              {t("auth.signin.submit")}
            </Button>
          </SectionCardContent>
        </PageHeader>
      </div>
    </div>
  );
};
