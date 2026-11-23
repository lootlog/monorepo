import { Link } from "@tanstack/react-router";
import { PortalNotFound } from "@lootlog/ui/components/portal-not-found";
import { docsTranslations } from "@/lib/polish-translations";

const t = docsTranslations.status;

export function DocsNotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 md:px-6">
      <PortalNotFound
        home={<Link to="/docs/$" params={{ _splat: "" }} />}
        labels={{
          title: t.notFoundTitle,
          description: t.notFoundDescription,
          backHome: t.backHome,
        }}
      />
    </main>
  );
}
