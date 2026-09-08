import { Link } from "@tanstack/react-router";
import { portalText as t } from "~/lib/translations";
export function PortalNav() {
  return (
    <nav className="portal-nav" aria-label={t.title}>
      <strong>{t.title}</strong>
      <Link to="/docs/$" params={{ _splat: "" }}>
        {t.docs}
      </Link>
      <Link to="/reference">{t.reference}</Link>
      <Link to="/keys">{t.keys}</Link>
    </nav>
  );
}
