import { Separator } from "@lootlog/ui/components/separator";
import type { MouseEvent, ReactNode } from "react";
import type { MenuItem } from "./types";
import { SidebarNavItem } from "./sidebar-nav-item";
import { useWarmRouteChunks } from "@/lib/router/use-warm-route-chunks";
import { ThemeSidebarFooterDecoration, useThemeMeta } from "@/themes";

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
  const { isCatTheme } = useThemeMeta();

  useWarmRouteChunks(
    items
      .filter((item) => item.enabled && item.available)
      .map((item) => `${basePath}${item.path}`),
  );

  return (
    <div
      data-slot="sidebar-nav"
      className="relative flex flex-col w-full gap-1.5 flex-1 overflow-hidden"
    >
      {header && (
        <div
          data-slot="sidebar-nav-header"
          className="relative h-14 min-h-14 flex flex-row items-center justify-between border-b mb-2 px-2 font-semibold"
        >
          {header}
        </div>
      )}
      {beforeItems}
      <div key={basePath} className="flex flex-col gap-1.5">
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
            <div key={path}>
              {divided && <Separator className="mb-1.5" />}
              <SidebarNavItem
                url={url}
                available={available}
                isActive={active}
                icon={icon}
                label={label}
                badge={badge}
                highlight={highlight}
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
