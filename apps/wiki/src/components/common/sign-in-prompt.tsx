import { LogIn } from "lucide-react";
import { cn } from "cn";
import { useDiscordSignIn } from "@lootlog/client/auth-session";
import { Button } from "@lootlog/ui/components/button";
import { ButtonLoadingContent } from "@lootlog/ui/components/button-loading-content";
import { DialogFooter } from "@lootlog/ui/components/dialog";
import { useWikiContext } from "@/contexts/wiki-context";
import { t } from "@/i18n/messages";

type SignInPromptProps = {
  reason: string;
  className?: string;
};

export function SignInPrompt({ reason, className }: SignInPromptProps) {
  const { config, authClient } = useWikiContext();
  const signIn = useDiscordSignIn(authClient);

  return (
    <div className={cn("flex flex-col gap-4 px-4 pb-4", className)}>
      <p className="text-sm text-muted-foreground">{reason}</p>
      {signIn.hasError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("userMenu.signInFailed")}
        </p>
      ) : null}
      <DialogFooter>
        <Button
          type="button"
          disabled={signIn.isPending}
          onClick={() =>
            void signIn.signIn({
              callbackURL: window.location.href,
              webOrigin: config.webAppUrl,
            })
          }
        >
          <ButtonLoadingContent loading={signIn.isPending}>
            <LogIn aria-hidden="true" />
            {t("userMenu.signIn")}
          </ButtonLoadingContent>
        </Button>
      </DialogFooter>
    </div>
  );
}
