import { Link } from "@tanstack/react-router";
import { COMMUNITY_LINKS } from "@lootlog/domain/public-sites";
import { PortalFooter } from "@lootlog/ui/components/portal-footer";
import { PortalSiteLink } from "@lootlog/ui/components/portal-site-link";
import { PORTAL_LEGAL_PAGES } from "@lootlog/ui/lib/portal-sites";
import { portalText } from "@/lib/translations";

const t = portalText.footer;

const links = [
  {
    id: "npm",
    label: t.npm,
    render: (
      <PortalSiteLink
        site={{ href: COMMUNITY_LINKS.sdkPackage, thirdParty: true }}
      />
    ),
  },
];

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

export function DeveloperFooter() {
  return (
    <PortalFooter
      site="developer"
      home={<Link to="/" />}
      links={links}
      legalLinks={legalLinks}
      labels={{
        brand: t.brand,
        tagline: t.tagline,
        navigation: t.navigation,
        copyright: t.copyright(copyrightYear),
        siteNames: portalText.siteNames,
      }}
    />
  );
}
