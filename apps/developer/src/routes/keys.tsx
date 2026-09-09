import { createFileRoute } from "@tanstack/react-router";
import { createAuthClient } from "better-auth/react";
import { useState } from "react";
import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { Button } from "@lootlog/ui/components/button";
import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
} from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { KeyManager } from "~/components/key-manager";
import { KeysSidebar } from "~/components/keys-sidebar";
import { getPortalEnvironment } from "~/lib/environment";
import { portalText as t } from "~/lib/translations";
export const Route = createFileRoute("/keys")({
  ssr: false,
  component: KeysPage,
});
function KeysPage() {
  const [auth] = useState(() =>
    createAuthClient({
      baseURL: `${getPortalEnvironment(location.hostname).auth}/idp`,
    }),
  );
  const session = auth.useSession();
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  async function login() {
    setPending(true);
    setError(false);
    try {
      const result = await auth.signIn.social({
        provider: "discord",
        callbackURL: `${location.origin}${import.meta.env.BASE_URL}keys`,
      });
      if (result.error) setError(true);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  async function logout() {
    setPending(true);
    setError(false);
    try {
      const result = await auth.signOut();
      if (result.error) setError(true);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="keys-layout">
      <KeysSidebar signedIn={Boolean(session.data)} />
      <main className="mx-auto w-full max-w-6xl flex flex-col gap-10 px-5 py-10 md:px-10 md:py-14">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex max-w-2xl flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t.developerTools}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {t.keys}
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              {t.keysDescription}
            </p>
          </div>
          {session.data && (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => void logout()}
            >
              {t.logout}
            </Button>
          )}
        </div>
        {session.isPending && (
          <div role="status">
            <span className="sr-only">{t.loading}</span>
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        )}
        {session.error && (
          <Alert variant="destructive">
            <AlertDescription>{t.error}</AlertDescription>
          </Alert>
        )}
        {!session.isPending && !session.data && (
          <Card className="max-w-xl">
            <CardHeader>
              <CardDescription>{t.signedOut}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                loading={pending}
                disabled={pending}
                onClick={() => void login()}
              >
                {t.login}
              </Button>
            </CardContent>
          </Card>
        )}
        {session.data && <KeyManager key={session.data.user.id} />}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{t.error}</AlertDescription>
          </Alert>
        )}
      </main>
    </div>
  );
}
