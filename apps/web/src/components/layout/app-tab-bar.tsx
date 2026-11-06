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
 * full navigation sheet and is marked current while the open section is one
 * of those behind it.
 */
export const AppTabBar = ({ sections, badges, onSearch }: AppTabBarProps) => {
  const { t } = useTranslation();
  const { setOpenMobile } = useSidebar();

  // "More" keeps its name and icon even while a section behind it is open,
  // so it still reads as the way to the rest of the navigation; the page
  // title and the collapsed pill name the open section.
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
        shortLabel: t("layout.navigation.tabBar.more"),
        icon: Ellipsis,
        activeSection: activeOverflow && {
          icon: APP_NAVIGATION_ICONS[activeOverflow.id],
          label: activeOverflow.label,
        },
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
