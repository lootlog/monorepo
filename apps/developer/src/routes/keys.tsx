import { createFileRoute } from "@tanstack/react-router";
import { createAuthClient } from "better-auth/react";
import { useState } from "react";
import { PortalNav } from "~/components/portal-nav";
import { KeyManager } from "~/components/key-manager";
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
        callbackURL: `${location.origin}/keys`,
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
    <main className="portal-page">
      <PortalNav />
      <h1>{t.keys}</h1>
      <p>
        {getPortalEnvironment(location.hostname).production
          ? t.production
          : t.dev}
      </p>
      {session.isPending && <p role="status">{t.loading}</p>}
      {session.error && <p role="alert">{t.error}</p>}
      {!session.isPending && !session.data && (
        <>
          <p>{t.signedOut}</p>
          <button disabled={pending} onClick={() => void login()}>
            {t.login}
          </button>
        </>
      )}
      {session.data && (
        <>
          <button disabled={pending} onClick={() => void logout()}>
            {t.logout}
          </button>
          <KeyManager key={session.data.user.id} />
        </>
      )}
      {error && (
        <p role="alert" className="portal-error">
          {t.error}
        </p>
      )}
    </main>
  );
}
