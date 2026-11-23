import { Link } from "@tanstack/react-router";
import { PortalFooter } from "@lootlog/ui/components/portal-footer";
import { PORTAL_LEGAL_PAGES } from "@lootlog/ui/lib/portal-sites";
import { docsTranslations } from "@/lib/polish-translations";

const t = docsTranslations.footer;

const legalLinks = [
  {
    id: "privacy",
    label: t.privacy,
    render: <a href={PORTAL_LEGAL_PAGES.privacy} />,
  },
  {
    id: "terms",
    label: t.terms,
    render: <a href={PORTAL_LEGAL_PAGES.terms} />,
  },
];

const copyrightYear = new Date().getFullYear();

export function DocsFooter() {
  return (
    <PortalFooter
      site="docs"
      home={<Link to="/docs/$" params={{ _splat: "" }} />}
      legalLinks={legalLinks}
      labels={{
        brand: t.brand,
        tagline: t.tagline,
        navigation: t.navigation,
        copyright: t.copyright(copyrightYear),
        legalNotice: t.legalNotice,
        siteNames: docsTranslations.siteNames,
      }}
    />
  );
}
