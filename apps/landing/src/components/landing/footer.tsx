import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PortalFooter } from "@lootlog/ui/components/portal-footer";
import { PortalSiteLink } from "@lootlog/ui/components/portal-site-link";
import { links } from "@/config/links";
import { useSiteNames } from "@/hooks/use-site-names";

const copyrightYear = new Date().getFullYear();

export function LandingFooter() {
  const { t } = useTranslation();
  const siteNames = useSiteNames();

  return (
    <PortalFooter
      site="lootlog"
      home={<Link to="/" />}
      containerClassName="landing-container"
      resources={{
        title: t("landing.footer.resourcesHeading"),
        links: [
          {
            id: "blog",
            label: t("landing.footer.blog"),
            render: <Link to="/blog" />,
          },
          {
            id: "support",
            label: t("landing.footer.support"),
            render: (
              <PortalSiteLink
                site={{ href: links.support, thirdParty: true }}
              />
            ),
          },
        ],
      }}
      legalLinks={[
        {
          id: "privacy",
          label: t("landing.footer.privacy"),
          render: <Link to="/privacy-policy" />,
        },
        {
          id: "terms",
          label: t("landing.footer.terms"),
          render: <Link to="/terms-of-service" />,
        },
      ]}
      labels={{
        brand: t("landing.header.brand"),
        tagline: t("landing.footer.tagline"),
        navigation: t("landing.footer.navigationLabel"),
        sites: t("landing.footer.sitesHeading"),
        community: t("landing.footer.communityHeading"),
        copyright: t("landing.footer.copyright", { year: copyrightYear }),
        legalNotice: t("landing.footer.legalNotice"),
        siteNames,
      }}
    />
  );
}
