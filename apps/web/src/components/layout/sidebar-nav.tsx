import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Separator } from "@lootlog/ui/components/separator";
import { cn } from "@lootlog/ui/lib/utils";
import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Fragment } from "react/jsx-runtime";

export interface MenuItem {
  label: string;
  icon: ReactNode;
  path: string;
  available: boolean;
  enabled: boolean;
  divided?: boolean;
  badge?: {
    content: string | number;
    variant?: "default" | "secondary" | "destructive" | "outline" | "white";
  };
  highlight?: boolean;
}

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

  return (
    <div className="flex flex-col w-full gap-1 flex-1">
      {header && (
        <div className="h-14 min-h-14 flex flex-row items-center justify-between border-b mb-2 px-2 font-semibold">
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
        }) => {
          const url = `${basePath}${path}`;
          const normalizedPathname = pathname.replace(/\/$/, "");
          const normalizedUrl = url.replace(/\/$/, "");
          const isActive =
            path === ""
              ? normalizedPathname === normalizedUrl
              : normalizedPathname === normalizedUrl ||
                pathname.startsWith(`${normalizedUrl}/`);

          return (
            enabled && (
              <Fragment key={path}>
                {divided && <Separator className="my-2" />}
                <div className="w-full px-2">
                  <Link
                    to={url}
                    key={path}
                    onClick={(e) => {
                      if (!available) e.preventDefault();
                      const item = items.find((item) => item.path === path);
                      if (item) {
                        onItemClick?.(item, e);
                      }
                    }}
                    className={cn({
                      "hover:cursor-not-allowed": !available,
                    })}
                  >
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "justify-between w-full font-semibold transition",
                        highlight &&
                          !isActive && [
                            "relative overflow-hidden",
                            "bg-yellow-500/10 hover:bg-yellow-500/20",
                            "border border-yellow-500/30",
                            "shadow-[0_0_12px_rgba(234,179,8,0.3)]",
                            "animate-pulse",
                          ],
                      )}
                      disabled={!available}
                    >
                      <div className="flex items-center">
                        {icon}
                        {label}
                      </div>
                      {badge && (
                        <Badge
                          variant={
                            isActive ? "white" : badge.variant || "default"
                          }
                          className="ml-auto"
                        >
                          {badge.content}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                </div>
              </Fragment>
            )
          );
        },
      )}
    </div>
  );
};
