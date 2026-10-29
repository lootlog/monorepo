import { SidebarNavButton } from "@lootlog/ui/components/sidebar-nav-button";
import { type MouseEvent, type ReactNode, useState } from "react";
import { Link } from "@tanstack/react-router";
import * as m from "framer-motion/m";
import type { Variants } from "framer-motion";
import type { MenuItem } from "./types";
import { ThemeInteractiveFrame } from "@/themes";

// Follows the variants of an appearing sidebar group; static otherwise.
const itemVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 500, damping: 40 },
  },
};

export const SidebarNavItem = ({
  url,
  available,
  isActive,
  icon,
  label,
  badge,
  isCatTheme,
  onItemClick,
}: {
  url: string;
  available: boolean;
  isActive: boolean;
  icon: ReactNode;
  label: string;
  badge?: MenuItem["badge"];
  isCatTheme: boolean;
  onItemClick: (e: MouseEvent) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const buttonContent = (
    <SidebarNavButton
      link={
        available ? (
          <Link
            to={url}
            preload="intent"
            aria-current={isActive ? "page" : undefined}
            onClick={onItemClick}
          />
        ) : undefined
      }
      isActive={isActive}
      icon={icon}
      label={label}
      badge={badge}
    >
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
    </SidebarNavButton>
  );

  return (
    <m.li
      variants={itemVariants}
      className="relative w-full list-none px-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <ThemeInteractiveFrame isHovered={isHovered} isActive={isActive}>
        {buttonContent}
      </ThemeInteractiveFrame>
    </m.li>
  );
};
