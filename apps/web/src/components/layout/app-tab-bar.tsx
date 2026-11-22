import { useSidebar } from "@lootlog/ui/components/sidebar";
import { TabBar } from "@/components/layout/tab-bar";
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
  badges?: Partial<Record<AppNavigationItemId, number>>;
  onSearch?: () => void;
};

export const AppTabBar = ({ sections, badges, onSearch }: AppTabBarProps) => {
  const { t } = useTranslation();
  const { setOpenMobile } = useSidebar();

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
