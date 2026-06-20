import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "@lootlog/ui/lib/utils";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { MenuItem } from "./types";
import { ThemeInteractiveFrame } from "@/themes";

export const SidebarNavItem = ({
  url,
  path,
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
  path: string;
  available: boolean;
  isActive: boolean;
  icon: React.ReactNode;
  label: string;
  badge?: MenuItem["badge"];
  highlight?: boolean;
  isRukiaTheme: boolean;
  isCatTheme: boolean;
  onItemClick: (e: React.MouseEvent) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const buttonContent = (
    <Button
      variant={isActive ? "default" : "ghost"}
      size="sm"
      className={cn(
        "justify-between w-full font-semibold transition-colors duration-200 relative",
        isActive && "shadow-[0_0_12px_var(--primary)/0.25]",
        !isActive &&
          "text-muted-foreground hover:text-primary hover:!bg-primary/10",
        highlight &&
          !isActive && [
            "overflow-hidden",
            "bg-yellow-500/10 hover:bg-yellow-500/20",
            "border border-yellow-500/30",
            "shadow-[0_0_12px_rgba(234,179,8,0.3)]",
            "animate-pulse",
            "text-foreground",
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
          variant={isActive ? "white" : (badge.variant ?? "default")}
          className="ml-auto"
        >
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
    <div
      className="relative w-full px-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isActive && !isRukiaTheme ? (
        <div className="absolute inset-x-2 inset-y-0 rounded-md bg-primary/5" />
      ) : null}
      <Link
        to={url}
        key={path}
        preload="intent"
        onClick={(e) => {
          if (!available) e.preventDefault();
          onItemClick(e);
        }}
        className={cn({
          "hover:cursor-not-allowed": !available,
        })}
      >
        <ThemeInteractiveFrame isHovered={isHovered} isActive={isActive}>
          {buttonContent}
        </ThemeInteractiveFrame>
      </Link>
    </div>
  );
};
