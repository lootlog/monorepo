import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "@lootlog/ui/lib/utils";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import type { MenuItem } from "./types";
import { RukiaBorderGlow } from "./rukia-border-glow";

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
        "justify-between w-full font-semibold transition relative",
        highlight &&
          !isActive && [
            "overflow-hidden",
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
          variant={isActive ? "white" : (badge.variant ?? "default")}
          className="ml-auto"
        >
          {badge.content}
        </Badge>
      )}
      <AnimatePresence>
        {isCatTheme && isHovered && !badge && (
          <motion.span
            className="absolute right-2 top-1/2 pointer-events-none"
            initial={{ opacity: 0, scale: 0.8, y: "-50%" }}
            animate={{ opacity: 0.5, scale: 1, y: "-50%" }}
            exit={{ opacity: 0, scale: 0.8, y: "-50%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <svg className="!size-6" viewBox="0 0 32 32">
              <ellipse cx="16" cy="22" rx="7" ry="5.5" fill="currentColor" />
              <circle cx="9" cy="12" r="3.2" fill="currentColor" />
              <circle cx="15" cy="8" r="2.8" fill="currentColor" />
              <circle cx="21" cy="8" r="2.8" fill="currentColor" />
              <circle cx="27" cy="12" r="3.2" fill="currentColor" />
            </svg>
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );

  return (
    <div
      className="w-full px-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        to={url}
        key={path}
        onClick={(e) => {
          if (!available) e.preventDefault();
          onItemClick(e);
        }}
        className={cn({
          "hover:cursor-not-allowed": !available,
        })}
      >
        {isRukiaTheme ? (
          <RukiaBorderGlow isHovered={isHovered} isActive={isActive}>
            {buttonContent}
          </RukiaBorderGlow>
        ) : (
          buttonContent
        )}
      </Link>
    </div>
  );
};
