import {
  type LootlogAuthClient,
  useDiscordSignIn,
  useLogout,
} from "@lootlog/client/auth-session";
import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { Button } from "@lootlog/ui/components/button";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useState } from "react";
import { KeyManager } from "@/components/key-manager";
import { getPortalEnvironment } from "@/lib/environment";
import { webAppOrigin } from "@lootlog/schema/api-services";
import { portalText as t } from "@/lib/translations";

export function KeySession({ authClient }: { authClient: LootlogAuthClient }) {
  const session = authClient.useSession();
  const signIn = useDiscordSignIn(authClient);
  const { logout, isPending: isLoggingOut } = useLogout(authClient);
  const [logoutFailed, setLogoutFailed] = useState(false);

  const login = () =>
    signIn.signIn({
      callbackURL: `${location.origin}${import.meta.env.BASE_URL}keys`,
      webOrigin: webAppOrigin(getPortalEnvironment(location.hostname)),
    });

  const signOut = () => {
    setLogoutFailed(false);
    logout().catch(() => setLogoutFailed(true));
  };

  return (
    <main className="flex min-w-0 flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">
            {t.keys}
          </h1>
          <p className="text-base text-pretty text-muted-foreground">
            {t.keysDescription}
          </p>
        </div>
        {session.data && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isLoggingOut}
            onClick={signOut}
          >
            {t.logout}
          </Button>
        )}
      </header>
      {session.isPending && (
        <div role="status" className="flex flex-col gap-4">
          <span className="sr-only">{t.loading}</span>
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      )}
      {!session.isPending && !session.data && (
        <section className="flex max-w-xl flex-col items-start gap-4 rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-base font-semibold">{t.signInTitle}</h2>
            <p className="text-sm text-muted-foreground">{t.signedOut}</p>
          </div>
          <Button
            loading={signIn.isPending}
            disabled={signIn.isPending}
            onClick={() => void login()}
          >
            {t.login}
          </Button>
        </section>
      )}
      {session.data && (
        <KeyManager key={session.data.user.id} userId={session.data.user.id} />
      )}
      {(signIn.hasError ||
        logoutFailed ||
        (session.error && !session.data)) && (
        <Alert variant="destructive">
          <AlertDescription>{t.error}</AlertDescription>
        </Alert>
      )}
    </main>
  );
}
