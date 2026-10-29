import type { ComponentProps, ReactElement, ReactNode } from "react";
import { cn } from "cn";
import { Badge } from "./badge";
import { Button } from "./button";

export type SidebarNavBadge = {
  content: ReactNode;
  variant?: ComponentProps<typeof Badge>["variant"];
};

type SidebarNavButtonProps = {
  /** The router link the item renders as; an unavailable item has none. */
  link?: ReactElement;
  isActive: boolean;
  icon: ReactNode;
  label: string;
  badge?: SidebarNavBadge;
  /** Decoration drawn over the button, such as a theme's hover mark. */
  children?: ReactNode;
};

/** One page in a sidebar's navigation column. */
export const SidebarNavButton = ({
  link,
  isActive,
  icon,
  label,
  badge,
  children,
}: SidebarNavButtonProps) => (
  <Button
    variant="ghost"
    render={link}
    nativeButton={!link}
    role={link ? "link" : undefined}
    className={cn(
      "justify-between w-full transition-colors duration-200 relative",
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
