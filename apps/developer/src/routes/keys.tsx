import { createFileRoute, Link } from "@tanstack/react-router";
import { createAuthClient } from "better-auth/react";
import { useState } from "react";
import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { Button } from "@lootlog/ui/components/button";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { QueryClientProvider } from "@tanstack/react-query";
import { KeyManager } from "~/components/key-manager";
import { createKeyQueryClient } from "~/lib/key-queries";
import { PortalFooter } from "~/components/portal-footer";
import { getPortalEnvironment } from "~/lib/environment";
import { pageHead } from "~/lib/seo";
import { portalText as t } from "~/lib/translations";

const guides = [
  { slug: "keys", label: t.keyGuide },
  { slug: "http", label: t.httpGuide },
  { slug: "errors", label: t.errorsGuide },
  { slug: "sdk", label: t.sdk },
] as const;

export const Route = createFileRoute("/keys")({
  ssr: false,
  head: () =>
    pageHead({
      path: "/keys",
      title: t.keys,
      description: t.keysDescriptionMeta,
      noindex: true,
    }),
  component: KeysPage,
});

function KeysPage() {
  const [auth] = useState(() =>
    createAuthClient({
      baseURL: `${getPortalEnvironment(location.hostname).auth}/idp`,
    }),
  );

  const session = auth.useSession();
  const [queryClient] = useState(createKeyQueryClient);
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
    <>
      <div className="portal-page grid gap-10 lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-14">
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
                disabled={pending}
                onClick={() => void logout()}
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
                loading={pending}
                disabled={pending}
                onClick={() => void login()}
              >
                {t.login}
              </Button>
            </section>
          )}
          {session.data && (
            <QueryClientProvider client={queryClient}>
              <KeyManager
                key={session.data.user.id}
                userId={session.data.user.id}
              />
            </QueryClientProvider>
          )}
          {(error || (session.error && !session.data)) && (
            <Alert variant="destructive">
              <AlertDescription>{t.error}</AlertDescription>
            </Alert>
          )}
        </main>
        <aside aria-labelledby="key-guides" className="lg:pt-2">
          <h2
            id="key-guides"
            className="mb-3 text-xs font-semibold text-muted-foreground"
          >
            {t.guides}
          </h2>
          <ul className="flex flex-col">
            {guides.map((guide) => (
              <li key={guide.slug}>
                <Link
                  to="/docs/$"
                  params={{ _splat: guide.slug }}
                  className="block rounded-md py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {guide.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
      <PortalFooter />
    </>
  );
}
