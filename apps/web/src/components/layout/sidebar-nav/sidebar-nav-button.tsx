import type { ComponentProps, ReactElement, ReactNode } from "react";
import { cn } from "cn";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";

export type SidebarNavBadge = {
  content: ReactNode;
  variant?: ComponentProps<typeof Badge>["variant"];
};

type SidebarNavButtonProps = {
  link?: ReactElement;
  isActive: boolean;
  icon: ReactNode;
  label: string;
  badge?: SidebarNavBadge;
  size?: "default" | "touch";
  children?: ReactNode;
};

export const SidebarNavButton = ({
  link,
  isActive,
  icon,
  label,
  badge,
  size = "default",
  children,
}: SidebarNavButtonProps) => (
  <Button
    variant="ghost"
    render={link}
    nativeButton={!link}
    role={link ? "link" : undefined}
    className={cn(
      "justify-between w-full transition-colors duration-200 relative",
      size === "touch" && "h-11",
      isActive
        ? "!bg-primary/12 font-semibold text-primary hover:!bg-primary/15 hover:text-primary"
        : "font-medium text-muted-foreground hover:text-primary hover:!bg-primary/10",
    )}
    disabled={!link}
  >
    <div
      className={cn("flex items-center", isActive && "[&_svg]:text-primary")}
    >
      {icon}
      {label}
    </div>
    {badge && (
      <Badge variant={badge.variant ?? "default"} className="ml-auto">
        {badge.content}
      </Badge>
    )}
    {children}
  </Button>
);
