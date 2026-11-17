import { Link } from "@tanstack/react-router";
import {
  FullSearchTrigger,
  SearchTrigger,
} from "fumadocs-ui/layouts/shared/slots/search-trigger";
import { PortalHeader } from "@lootlog/ui/components/portal-header";
import {
  COMMUNITY_LINKS,
  PUBLIC_SITE_ORIGINS,
} from "@lootlog/domain/public-sites";
import { docsTranslations } from "@/lib/polish-translations";

const t = docsTranslations.header;

const links = [
  { id: "home", label: t.home, href: PUBLIC_SITE_ORIGINS.web },
  {
    id: "developers",
    label: t.developers,
    href: PUBLIC_SITE_ORIGINS.developer,
  },
  { id: "github", label: t.github, href: COMMUNITY_LINKS.github },
  { id: "discord", label: t.discord, href: COMMUNITY_LINKS.discord },
];

export function DocsHeader() {
  return (
    <PortalHeader
      title={docsTranslations.metadata.title}
      section={t.section}
      home={<Link to="/docs/$" params={{ _splat: "" }} />}
      links={links.map(({ href, ...link }) => ({
        ...link,
        render: <a href={href} />,
      }))}
      search={
        <FullSearchTrigger className="portal-header-search h-8 w-56 lg:w-64" />
      }
      compactSearch={<SearchTrigger />}
      labels={{
        skipToContent: t.skipToContent,
        navigation: t.navigation,
        menu: t.menu,
        closeNavigation: t.closeNavigation,
      }}
    />
  );
}
