import { PageHeader } from "@lootlog/ui/components/page-header";
import { SectionCardContent } from "@lootlog/ui/components/section-card-content";
import { SectionCardFooter } from "@lootlog/ui/components/section-card-footer";
import { DiscordIcon } from "@/features/signin/discord-icon";
import { signInErrorKind } from "@/features/signin/sign-in-error-kind";
import { signInRetryUrl } from "@/features/signin/sign-in-retry-url";
import { authClient } from "@/lib/auth-client";
import { useDiscordSignIn } from "@lootlog/client/auth-session";
import {
  COMMUNITY_LINKS,
  WEB_SIGN_IN_PATH,
  docsPageUrl,
} from "@lootlog/domain/public-sites";
import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { Button } from "@lootlog/ui/components/button";
import { useSearch } from "@tanstack/react-router";
import { Option, Schema } from "effect";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

const SIGN_IN_HELP_URL = `${docsPageUrl("faq")}#logowanie-przez-discord-zakończyło-się-błędem`;

const DISPLAYABLE_ERROR_CODE = /^[A-Za-z0-9_]{1,64}$/u;

const decodeSteps = Schema.decodeUnknownOption(Schema.Array(Schema.String));

export const SignInError: React.FC = () => {
  const search = useSearch({ from: "/signin_/error" });
  const { signIn, isPending, hasError } = useDiscordSignIn(authClient);
  const { t } = useTranslation();

  const kind = signInErrorKind(search.error);
  const translationKey = `auth.signinError.kinds.${kind}`;

  const steps = Option.getOrElse(
    decodeSteps(t(`${translationKey}.steps`, { returnObjects: true })),
    () => [],
  );

  const errorCode =
    search.error !== undefined && DISPLAYABLE_ERROR_CODE.test(search.error)
      ? search.error
      : undefined;

  const handleRetry = () =>
    signIn({
      callbackURL:
        signInRetryUrl(search.retry, window.location.origin) ??
        `${window.location.origin}${WEB_SIGN_IN_PATH}`,
      webOrigin: window.location.origin,
    });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-lg px-4 py-8">
        <PageHeader
          icon={ShieldAlert}
          title={t(`${translationKey}.title`)}
          description={t(`${translationKey}.description`)}
        >
          <SectionCardContent className="space-y-4">
            {steps.length > 0 && (
              <div>
                <h2 className="text-sm font-medium">
                  {t("auth.signinError.stepsHeading")}
                </h2>
                <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-foreground marker:text-muted-foreground">
                  {steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
            {hasError && (
              <Alert variant="destructive">
                <AlertDescription>{t("auth.signin.failed")}</AlertDescription>
              </Alert>
            )}
            {kind !== "banned" && (
              <Button
                onClick={() => void handleRetry()}
                icon={<DiscordIcon />}
                loading={isPending}
                className="w-full"
                size="xl"
              >
                {t("auth.signinError.retry")}
              </Button>
            )}
            {errorCode && (
              <p className="text-xs text-muted-foreground">
                {t("auth.signinError.code")}{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono select-all">
                  {errorCode}
                </code>
              </p>
            )}
          </SectionCardContent>
          <SectionCardFooter>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <a
                  href={SIGN_IN_HELP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              {t("auth.signinError.guide")}
              <span className="sr-only">{t("ui.externalLink.newTab")}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <a
                  href={COMMUNITY_LINKS.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              {t("auth.signinError.support")}
              <span className="sr-only">{t("ui.externalLink.newTab")}</span>
            </Button>
          </SectionCardFooter>
        </PageHeader>
      </div>
    </div>
  );
};
