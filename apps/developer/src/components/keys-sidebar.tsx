import { Link } from "@tanstack/react-router";
import { portalText as t } from "~/lib/translations";

export function KeysSidebar({ signedIn }: { signedIn: boolean }) {
  return (
    <aside className="keys-sidebar">
      <nav aria-label={t.developerTools}>
        <p>{t.developerTools}</p>
        <Link to="/keys" aria-current="page" className="font-medium">
          {t.keys}
        </Link>
        {signedIn && (
          <>
            <a href="#key-list-title">{t.yourKeys}</a>
          </>
        )}
        <p>{t.resources}</p>
        <Link to="/docs/$" params={{ _splat: "keys" }}>
          {t.keyGuide}
        </Link>
        <Link to="/docs/$" params={{ _splat: "http" }}>
          {t.httpGuide}
        </Link>
        <Link to="/docs/$" params={{ _splat: "sdk" }}>
          {t.sdk}
        </Link>
      </nav>
    </aside>
  );
}
