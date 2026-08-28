import {
  BellRing,
  LayoutDashboard,
  Settings,
  Swords,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ThemePreviewAccountFooter } from "./theme-preview-account-footer";
import { ThemePreviewNavigationItem } from "./theme-preview-navigation-item";
import type { ThemePreviewNavigationKey } from "./theme-builder-preview-types";

interface ThemePreviewUserNavigationProps {
  activeNavigation: ThemePreviewNavigationKey;
}

interface UserNavigationItem {
  Icon: LucideIcon;
  badgeKey?: string;
  divided?: boolean;
  key: ThemePreviewNavigationKey;
  labelKey: string;
}

const USER_ITEMS: UserNavigationItem[] = [
  { Icon: LayoutDashboard, key: "dashboard", labelKey: "dashboard" },
  {
    Icon: Swords,
    key: "battle-panel",
    labelKey: "battlePanel",
    badgeKey: "settings.appearance.preview.shell.beta",
  },
  {
    Icon: BellRing,
    key: "notifications",
    labelKey: "notifications",
    divided: true,
  },
  { Icon: Settings, key: "settings", labelKey: "settings" },
];

export const ThemePreviewUserNavigation = ({
  activeNavigation,
}: ThemePreviewUserNavigationProps) => {
  const { t } = useTranslation();
  const [activeItem, setActiveItem] =
    useState<ThemePreviewNavigationKey>(activeNavigation);

  useEffect(() => setActiveItem(activeNavigation), [activeNavigation]);

  return (
    <div
      data-slot="preview-sidebar-navigation"
      className="flex min-w-0 flex-1 flex-col bg-sidebar"
    >
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-3">
        <span className="truncate text-sm font-semibold">
          {t("settings.appearance.preview.shell.greeting")}
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1.5 overflow-hidden px-2 py-2">
        {USER_ITEMS.map(({ Icon, badgeKey, divided, key, labelKey }) => (
          <div
            key={key}
            className={
              divided ? "mt-1 border-t border-sidebar-border pt-2" : undefined
            }
          >
            <ThemePreviewNavigationItem
              Icon={Icon}
              active={activeItem === key}
              badge={badgeKey ? t(badgeKey) : undefined}
              label={t(`layout.navigation.${labelKey}`)}
              onClick={() => setActiveItem(key)}
            />
          </div>
        ))}
      </nav>
      <ThemePreviewAccountFooter />
    </div>
  );
};
