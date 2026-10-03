import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
import { type MouseEvent, type ReactNode, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { MenuItem } from "./types";
import { ThemeInteractiveFrame } from "@/themes";

export const SidebarNavItem = ({
  url,
  available,
  isActive,
  icon,
  label,
  badge,
  highlight,
  isRukiaTheme,
  isCatTheme,
  onItemClick,
}: {
  url: string;
  available: boolean;
  isActive: boolean;
  icon: ReactNode;
  label: string;
  badge?: MenuItem["badge"];
  highlight?: boolean;
  isRukiaTheme: boolean;
  isCatTheme: boolean;
  onItemClick: (e: MouseEvent) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const badgeVariant = isActive ? "white" : (badge?.variant ?? "default");

  const buttonContent = (
    <Button
      variant={isActive ? "default" : "ghost"}
      size="sm"
      render={
        available ? (
          <Link
            to={url}
            preload="intent"
            aria-current={isActive ? "page" : undefined}
            onClick={onItemClick}
          />
        ) : undefined
      }
      nativeButton={!available}
      role={available ? "link" : undefined}
      className={cn(
        "justify-between w-full font-semibold transition-colors duration-200 relative",
        isActive && "shadow-[0_0_12px] shadow-primary/25",
        !isActive &&
          "text-muted-foreground hover:text-primary hover:!bg-primary/10",
        highlight &&
          !isActive && [
            "overflow-hidden",
            "bg-signal-timer/10 hover:bg-signal-timer/20",
            "border border-signal-timer/30",
            "shadow-[0_0_12px] shadow-signal-timer/30",
            "motion-safe:animate-pulse",
            "text-foreground",
          ],
      )}
      disabled={!available}
    >
      <div
        className={cn(
          "flex items-center",
          isActive && "[&_svg]:text-primary-foreground",
        )}
      >
        {icon}
        {label}
      </div>
      {badge && (
        <Badge variant={badgeVariant} className="ml-auto">
          {badge.content}
        </Badge>
      )}
      {isCatTheme && isHovered && !badge ? (
        <span
          className="absolute right-2 top-1/2 pointer-events-none"
          style={{ opacity: 0.5, transform: "translateY(-50%)" }}
        >
          <svg className="!size-6" viewBox="0 0 32 32">
            <ellipse cx="16" cy="22" rx="7" ry="5.5" fill="currentColor" />
            <circle cx="9" cy="12" r="3.2" fill="currentColor" />
            <circle cx="15" cy="8" r="2.8" fill="currentColor" />
            <circle cx="21" cy="8" r="2.8" fill="currentColor" />
            <circle cx="27" cy="12" r="3.2" fill="currentColor" />
          </svg>
        </span>
      ) : null}
    </Button>
  );

  return (
    <li
      className="relative w-full list-none px-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isActive && !isRukiaTheme ? (
        <div className="absolute inset-x-2 inset-y-0 rounded-md bg-primary/5" />
      ) : null}
      <ThemeInteractiveFrame isHovered={isHovered} isActive={isActive}>
        {buttonContent}
      </ThemeInteractiveFrame>
    </li>
  );
};
