import { Link, useHydrated, useRouterState } from "@tanstack/react-router";
import {
  FullSearchTrigger,
  SearchTrigger,
} from "fumadocs-ui/layouts/shared/slots/search-trigger";
import { Badge } from "@lootlog/ui/components/badge";
import { PortalHeader } from "@lootlog/ui/components/portal-header";
import { getPortalEnvironment } from "~/lib/environment";
import { portalText as t } from "~/lib/translations";

const sections = [
  { to: "/", label: t.overview, section: "overview" },
  { to: "/docs/$", label: t.docs, section: "docs" },
  { to: "/reference", label: t.reference, section: "reference" },
  { to: "/keys", label: t.keys, section: "keys" },
] as const;

export function PortalNav() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const hydrated = useHydrated();
  const environment = hydrated ? getPortalEnvironment(location.hostname) : null;

  const activeSection =
    pathname
      .split("/")
      .filter(Boolean)
      .find((segment) =>
        sections.some((section) => section.section === segment),
      ) ?? "overview";

  return (
    <PortalHeader
      title={t.title}
      section={t.developers}
      home=<Link to="/" />
      links={sections.map((section) => ({
        id: section.section,
        label: section.label,
        active: activeSection === section.section,
        render: (
          <Link to={section.to} params={{ _splat: "" }} preload="intent" />
        ),
      }))}
      search=<FullSearchTrigger className="portal-header-search h-8 w-56 lg:w-64" />
      compactSearch=<SearchTrigger />
      status={
        environment && (
          <Badge variant={environment.production ? "outline" : "timer"}>
            {environment.production ? t.production : t.dev}
          </Badge>
        )
      }
      labels={{
        skipToContent: t.skipToContent,
        navigation: t.navigation,
        menu: t.menu,
        closeNavigation: t.closeNavigation,
      }}
    />
  );
}
