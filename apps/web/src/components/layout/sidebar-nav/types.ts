import type { ReactNode } from "react";
import type { SidebarNavBadge } from "@/components/layout/sidebar-nav/sidebar-nav-button";

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
