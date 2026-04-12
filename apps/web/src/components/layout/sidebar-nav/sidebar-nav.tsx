import { Separator } from "@lootlog/ui/components/separator";
import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
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
  const { isRukiaTheme, isCatTheme } = useThemeMeta();

  let enabledIndex = 0;

  return (
    <div className="relative flex flex-col w-full gap-1.5 flex-1 overflow-hidden">
      <ThemeSidebarBackground />
      {header && (
        <div className="relative h-14 min-h-14 flex flex-row items-center justify-between border-b mb-2 px-2 font-semibold">
          {header}
        </div>
      )}
      {beforeItems}
      <AnimatePresence mode="wait">
        <motion.div
          key={basePath}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="flex flex-col gap-1.5"
        >
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

              const staggerIndex = enabledIndex++;

              return (
                <motion.div
                  key={path}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: 0.2,
                    delay: staggerIndex * 0.03,
                    ease: "easeOut",
                  }}
                >
                  {divided && <Separator className="mb-1.5" />}
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
                </motion.div>
              );
            },
          )}
        </motion.div>
      </AnimatePresence>
      <ThemeSidebarFooterDecoration />
    </div>
  );
};
