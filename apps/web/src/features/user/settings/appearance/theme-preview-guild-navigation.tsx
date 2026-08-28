import {
  BarChart4,
  BellRing,
  CalendarClock,
  ClipboardList,
  Clock,
  FileText,
  Logs,
  Settings,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ThemePreviewAccountFooter } from "./theme-preview-account-footer";
import { ThemePreviewNavigationItem } from "./theme-preview-navigation-item";
import type { ThemePreviewNavigationKey } from "./theme-builder-preview-types";

interface ThemePreviewGuildNavigationProps {
  activeNavigation: ThemePreviewNavigationKey;
}

interface GuildNavigationItem {
  Icon: LucideIcon;
  badge?: string;
  divided?: boolean;
  key: ThemePreviewNavigationKey;
  labelKey: string;
}

const GUILD_ITEMS: GuildNavigationItem[] = [
  { Icon: ClipboardList, key: "lootlog", labelKey: "lootlog" },
  { Icon: Clock, key: "timers", labelKey: "timers" },
  { Icon: CalendarClock, key: "reservations", labelKey: "reservations" },
  { Icon: FileText, key: "docs", labelKey: "docs" },
  { Icon: Trophy, key: "events", labelKey: "events", badge: "2" },
  { Icon: BarChart4, key: "stats", labelKey: "stats" },
  { Icon: Logs, key: "activity-logs", labelKey: "activityLogs", divided: true },
  { Icon: BellRing, key: "guild-notifications", labelKey: "notifications" },
  { Icon: Settings, key: "guild-settings", labelKey: "settings" },
];

export const ThemePreviewGuildNavigation = ({
  activeNavigation,
}: ThemePreviewGuildNavigationProps) => {
  const { t } = useTranslation();
  const [activeItem, setActiveItem] =
    useState<ThemePreviewNavigationKey>(activeNavigation);

  useEffect(() => setActiveItem(activeNavigation), [activeNavigation]);

  return (
    <div
      data-slot="preview-sidebar-navigation"
      className="flex min-w-0 flex-1 flex-col bg-sidebar"
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-sidebar-border bg-secondary text-xs font-bold">
          {t("settings.appearance.preview.shell.organizationInitials")}
        </div>
        <span className="truncate text-sm font-semibold">
          {t("settings.appearance.preview.shell.organizationName")}
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1.5 overflow-hidden px-2 py-2">
        {GUILD_ITEMS.map(({ Icon, badge, divided, key, labelKey }) => (
          <div
            key={key}
            className={
              divided ? "mt-1 border-t border-sidebar-border pt-2" : undefined
            }
          >
            <ThemePreviewNavigationItem
              Icon={Icon}
              active={activeItem === key}
              badge={badge}
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
