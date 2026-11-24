import { Link } from "@tanstack/react-router";
import { PortalFooter } from "@lootlog/ui/components/portal-footer";
import { PORTAL_LEGAL_PAGES } from "@lootlog/ui/lib/portal-sites";
import { t } from "@/i18n/messages";
import { wikiSiteNames } from "./wiki-site-names";

const legalLinks = [
  {
    id: "privacy",
    label: t("footer.privacy"),
    render: <a href={PORTAL_LEGAL_PAGES.privacy} />,
  },
  {
    id: "terms",
    label: t("footer.terms"),
    render: <a href={PORTAL_LEGAL_PAGES.terms} />,
  },
];

const copyrightYear = new Date().getFullYear();

export function WikiFooter({
  containerClassName,
}: {
  containerClassName: string;
}) {
  return (
    <PortalFooter
      site="wiki"
      home={<Link to="/" />}
      containerClassName={containerClassName}
      legalLinks={legalLinks}
      labels={{
        brand: t("header.brand"),
        tagline: t("footer.tagline"),
        navigation: t("footer.navigation"),
        sites: t("footer.sites"),
        community: t("footer.community"),
        copyright: t("footer.copyright", { year: copyrightYear }),
        legalNotice: t("footer.legalNotice"),
        siteNames: wikiSiteNames,
      }}
    />
  );
}
