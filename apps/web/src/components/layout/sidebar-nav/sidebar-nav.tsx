import { Separator } from "@lootlog/ui/components/separator";
import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { Fragment } from "react/jsx-runtime";
import { useTheme } from "@/hooks/context/use-theme";
import type { MenuItem } from "./types";
import { FrozenSidebarBackground } from "./frozen-sidebar-background";
import { SidebarNavItem } from "./sidebar-nav-item";
import { SidebarCatAnimation } from "./sidebar-cat-animation";

interface SidebarNavProps {
  items: MenuItem[];
  basePath?: string;
  header?: ReactNode;
  beforeItems?: ReactNode;
  onItemClick?: (item: MenuItem, event: React.MouseEvent) => void;
}

export const SidebarNav = ({
  items,
  basePath = "",
  header,
  beforeItems,
  onItemClick,
}: SidebarNavProps) => {
  const { pathname } = useLocation();
  const { theme } = useTheme();
  const isRukiaTheme = theme === "rukia";
  const isCatTheme = theme.startsWith("cat-");

  return (
    <div className="relative flex flex-col w-full gap-1 flex-1 overflow-hidden">
      {isRukiaTheme && <FrozenSidebarBackground />}
      {header && (
        <div className="relative h-14 min-h-14 flex flex-row items-center justify-between border-b mb-2 px-2 font-semibold">
          {header}
        </div>
      )}
      {beforeItems}
      {items.map(
        ({
          divided,
          icon,
          path,
          label,
          available,
          enabled,
          badge,
          highlight,
          childPaths,
        }) => {
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
            enabled && (
              <Fragment key={path}>
                {divided && <Separator className="my-2" />}
                <SidebarNavItem
                  url={url}
                  path={path}
                  available={available}
                  isActive={isActive}
                  icon={icon}
                  label={label}
                  badge={badge}
                  highlight={highlight}
                  isRukiaTheme={isRukiaTheme}
                  isCatTheme={isCatTheme}
                  onItemClick={(e) => {
                    const item = items.find((item) => item.path === path);
                    if (item) {
                      onItemClick?.(item, e);
                    }
                  }}
                />
              </Fragment>
            )
          );
        },
      )}
      {isCatTheme && <SidebarCatAnimation theme={theme} />}
    </div>
  );
};
