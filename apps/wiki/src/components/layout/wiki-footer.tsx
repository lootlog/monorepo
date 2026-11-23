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

export function WikiFooter() {
  return (
    <PortalFooter
      site="wiki"
      home={<Link to="/" />}
      legalLinks={legalLinks}
      labels={{
        brand: t("header.brand"),
        tagline: t("footer.tagline"),
        navigation: t("footer.navigation"),
        copyright: t("footer.copyright", { year: copyrightYear }),
        legalNotice: t("footer.legalNotice"),
        siteNames: wikiSiteNames,
      }}
    />
  );
}
