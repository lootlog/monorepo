import { Link } from "@tanstack/react-router";
import {
  FullSearchTrigger,
  SearchTrigger,
} from "fumadocs-ui/layouts/shared/slots/search-trigger";
import { PortalHeader } from "@lootlog/ui/components/portal-header";
import { docsTranslations } from "@/lib/polish-translations";

const t = docsTranslations.header;

export function DocsHeader() {
  return (
    <PortalHeader
      title={docsTranslations.metadata.title}
      section={t.section}
      home={<Link to="/docs/$" params={{ _splat: "" }} />}
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
