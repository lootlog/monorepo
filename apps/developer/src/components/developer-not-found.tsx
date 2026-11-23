import { Link } from "@tanstack/react-router";
import { PortalNotFound } from "@lootlog/ui/components/portal-not-found";
import { portalText } from "@/lib/translations";

const t = portalText.status;

export function DeveloperNotFound() {
  return (
    <main className="portal-page">
      <PortalNotFound
        home={<Link to="/" />}
        labels={{
          title: t.notFoundTitle,
          description: t.notFoundDescription,
          backHome: t.backHome,
        }}
      />
    </main>
  );
}
