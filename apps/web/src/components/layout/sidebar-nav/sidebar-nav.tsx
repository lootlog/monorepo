import { Separator } from "@lootlog/ui/components/separator";
import { Fragment, type ReactNode } from "react";
import { useSidebar } from "@lootlog/ui/components/sidebar";
import type { MenuItem } from "./types";
import { SidebarNavItem } from "./sidebar-nav-item";
import { useWarmRouteChunks } from "@/lib/router/use-warm-route-chunks";
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
  ariaLabel: string;
}

export const SidebarNav = ({
  items,
  basePath = "",
  header,
  beforeItems,
  footer,
  ariaLabel,
}: SidebarNavProps) => {
  const { isRukiaTheme, isCatTheme } = useThemeMeta();
  const { isMobile, setOpenMobile } = useSidebar();

  useWarmRouteChunks(
    items
      .filter((item) => item.enabled && item.available)
      .map((item) => `${basePath}${item.path}`),
  );

  return (
    <div className="relative flex flex-col w-full gap-1.5 flex-1 overflow-hidden">
      <ThemeSidebarBackground />
      {header && (
        <div className="relative h-14 min-h-14 flex flex-row items-center justify-between border-b mb-2 px-2 font-semibold">
          {header}
        </div>
      )}
      {beforeItems}
      <nav key={basePath} aria-label={ariaLabel}>
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => {
            const {
              active,
              divided,
              icon,
              path,
              label,
              available,
              enabled,
              badge,
              highlight,
            } = item;

            if (!enabled) return null;

            const url = `${basePath}${path}`;

            return (
              <Fragment key={path}>
                {divided && (
                  <li aria-hidden className="list-none">
                    <Separator />
                  </li>
                )}
                <SidebarNavItem
                  url={url}
                  available={available}
                  isActive={active}
                  icon={icon}
                  label={label}
                  badge={badge}
                  highlight={highlight}
                  isRukiaTheme={isRukiaTheme}
                  isCatTheme={isCatTheme}
                  onItemClick={() => {
                    if (isMobile) setOpenMobile(false);
                  }}
                />
              </Fragment>
            );
          })}
        </ul>
      </nav>
      {footer ? (
        <div className="relative mt-auto px-2 pb-2">{footer}</div>
      ) : null}
      <ThemeSidebarFooterDecoration />
    </div>
  );
};
