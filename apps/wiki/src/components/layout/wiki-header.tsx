import { Link, useLocation } from "@tanstack/react-router";
import { PortalHeader } from "@lootlog/ui/components/portal-header";
import { t } from "@/i18n/messages";
import { findWikiSection, WIKI_NAVIGATION } from "@/navigation/wiki-navigation";
import { WikiHeaderSearch } from "./wiki-header-search";
import { WikiMark } from "./wiki-mark";
import { WikiUserMenu } from "./wiki-user-menu";

// The home page is the brand's link; the bar lists the sections.
const sections = WIKI_NAVIGATION.filter(({ link }) => link.to !== "/");

/**
 * The bar the public portals share: the wiki, its sections, the search and
 * the account. The sections sit in the bar from `lg`; narrower screens open
 * them from the menu, so the bar stays one row.
 */
export function WikiHeader() {
  const { pathname } = useLocation();
  const activeSection = findWikiSection(pathname);

  return (
    <PortalHeader
      title={`${t("header.brand")} ${t("header.brandSuffix")}`}
      section={t("header.brandSuffix")}
      home={<Link to="/" />}
      mark={<WikiMark className="size-7 rounded-lg" />}
      inlineFrom="lg"
      links={sections.map((section) => ({
        id: section.link.to,
        label: t(section.labelKey),
        active: section === activeSection,
        render: <Link {...section.link} />,
      }))}
      search={<WikiHeaderSearch variant="field" />}
      compactSearch={<WikiHeaderSearch variant="icon" />}
      actions={<WikiUserMenu />}
      labels={{
        skipToContent: t("navigation.skipToContent"),
        navigation: t("navigation.ariaLabel"),
        menu: t("navigation.menu"),
        closeNavigation: t("navigation.closeMenu"),
      }}
    />
  );
}
