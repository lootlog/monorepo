import { authClient } from "@/lib/auth-client";

const LOCAL_WEB_APP_URL = "http://localhost";

export function SessionStatus() {
  const session = authClient.useSession();

  let status = "Checking session…";

  if (!session.isPending) {
    status = session.data
      ? `Signed in as ${session.data.user.name}`
      : "No session: API and gateway calls will fail";
  }

  return (
    <section className="sbx-section">
      <h2>Session</h2>
      <p className="sbx-muted">{status}</p>
      {!session.isPending && !session.data ? (
        <a href={LOCAL_WEB_APP_URL} target="_blank" rel="noreferrer">
          Sign in on the local Web app, then reload
        </a>
      ) : null}
    </section>
  );
}
