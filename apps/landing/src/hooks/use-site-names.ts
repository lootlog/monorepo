import { useTranslation } from "react-i18next";
import type { PortalSiteLabels } from "@lootlog/ui/lib/portal-sites";

export const useSiteNames = (): PortalSiteLabels => {
  const { t } = useTranslation();

  return {
    lootlog: t("landing.sites.lootlog"),
    docs: t("landing.sites.docs"),
    wiki: t("landing.sites.wiki"),
    developer: t("landing.sites.developer"),
    github: t("landing.sites.github"),
    discord: t("landing.sites.discord"),
  };
};
