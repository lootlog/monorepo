import { useSidebar } from "@lootlog/ui/components/sidebar";
import { TabBar } from "@lootlog/ui/components/tab-bar";
import { Link } from "@tanstack/react-router";
import { Ellipsis } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  AppNavigationItemId,
  AppTabBarSections,
} from "@/navigation/app-navigation";
import { APP_NAVIGATION_ICONS } from "@/navigation/app-navigation-icons";

type AppTabBarProps = {
  sections: AppTabBarSections;
  /** Counts shown on sections, such as the events running now. */
  badges?: Partial<Record<AppNavigationItemId, number>>;
  /** The shell's search, as a circle at the bar's trailing end. */
  onSearch?: () => void;
};

/**
 * The app's phone navigation: the first sections and "More", which opens the
 * full navigation sheet and shows the open section when it is one of those
 * behind it.
 */
export const AppTabBar = ({ sections, badges, onSearch }: AppTabBarProps) => {
  const { t } = useTranslation();
  const { setOpenMobile } = useSidebar();

  // An open section behind "More" takes the tab's place, so the bar always
  // shows where the reader is instead of hiding it behind a generic label.
  const activeOverflow = sections.overflow.find((section) => section.active);

  return (
    <TabBar
      ariaLabel={t("layout.navigation.tabBar.ariaLabel")}
      tabs={sections.tabs.map((section) => ({
        id: section.id,
        label: section.label,
        shortLabel: section.shortLabel,
        icon: APP_NAVIGATION_ICONS[section.id],
        active: section.active,
        badge: badges?.[section.id],
        render: <Link to={section.href} />,
      }))}
      more={{
        shortLabel:
          activeOverflow?.shortLabel ?? t("layout.navigation.tabBar.more"),
        icon: activeOverflow
          ? APP_NAVIGATION_ICONS[activeOverflow.id]
          : Ellipsis,
        active: activeOverflow !== undefined,
        activeLabel: activeOverflow?.label,
        ariaLabel: activeOverflow
          ? t("layout.navigation.tabBar.moreWithSection", {
              section: activeOverflow.label,
            })
          : undefined,
        badged: sections.overflow.some(
          (section) => (badges?.[section.id] ?? 0) > 0,
        ),
        onOpen: () => setOpenMobile(true),
      }}
      search={
        onSearch
          ? { ariaLabel: t("layout.navigation.search"), onOpen: onSearch }
          : undefined
      }
      expandLabel={(section) =>
        t("layout.navigation.tabBar.expand", { section })
      }
    />
  );
};
