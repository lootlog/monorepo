import { Separator } from "@lootlog/ui/components/separator";
import type { MouseEvent, ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import type { MenuItem } from "./types";
import { SidebarNavItem } from "./sidebar-nav-item";
import {
  ThemeSidebarBackground,
  ThemeSidebarFooterDecoration,
  useThemeMeta,
} from "@/themes";

interface SidebarNavProps {
  items: MenuItem[];
  basePath?: string;
  header?: ReactNode;
  beforeItems?: ReactNode;
  footer?: ReactNode;
  onItemClick?: (item: MenuItem, event: MouseEvent) => void;
}

export const SidebarNav = ({
  items,
  basePath = "",
  header,
  beforeItems,
  footer,
  onItemClick,
}: SidebarNavProps) => {
  const { pathname } = useLocation();
  const { isRukiaTheme, isCatTheme } = useThemeMeta();

  return (
    <div className="relative flex flex-col w-full gap-1.5 flex-1 overflow-hidden">
      <ThemeSidebarBackground />
      {header && (
        <div className="relative h-14 min-h-14 flex flex-row items-center justify-between border-b mb-2 px-2 font-semibold">
          {header}
        </div>
      )}
      {beforeItems}
      <div key={basePath} className="flex flex-col gap-1.5">
        {items.map((item) => {
          const {
            divided,
            icon,
            path,
            label,
            available,
            enabled,
            badge,
            highlight,
            childPaths,
          } = item;

          if (!enabled) return null;

          const url = `${basePath}${path}`;
          const normalizedPathname = pathname.replace(/\/$/, "");
          const normalizedUrl = url.replace(/\/$/, "");
          const isActive =
            path === ""
              ? normalizedPathname === normalizedUrl ||
                (childPaths?.some(
                  (cp) =>
                    normalizedPathname === `${normalizedUrl}${cp}` ||
                    pathname.startsWith(`${normalizedUrl}${cp}/`),
                ) ??
                  false)
              : normalizedPathname === normalizedUrl ||
                pathname.startsWith(`${normalizedUrl}/`);

          return (
            <div key={path}>
              {divided && <Separator className="mb-1.5" />}
              <SidebarNavItem
                url={url}
                available={available}
                isActive={isActive}
                icon={icon}
                label={label}
                badge={badge}
                highlight={highlight}
                isRukiaTheme={isRukiaTheme}
                isCatTheme={isCatTheme}
                onItemClick={(e) => {
                  onItemClick?.(item, e);
                }}
              />
            </div>
          );
        })}
      </div>
      {footer ? (
        <div className="relative mt-auto px-2 pb-2">{footer}</div>
      ) : null}
      <ThemeSidebarFooterDecoration />
    </div>
  );
};
