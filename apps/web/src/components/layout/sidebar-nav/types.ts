import type { ReactNode } from "react";
import type { SidebarNavBadge } from "@lootlog/ui/components/sidebar-nav-button";

export interface MenuItem {
  active: boolean;
  label: string;
  icon: ReactNode;
  path: string;
  available: boolean;
  enabled: boolean;
  group?: string;
  badge?: SidebarNavBadge;
}
