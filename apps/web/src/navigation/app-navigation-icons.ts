import {
  BarChart3,
  BarChart4,
  BellRing,
  CalendarClock,
  ClipboardList,
  Clock,
  FileText,
  LayoutDashboard,
  Logs,
  Settings,
  ShieldHalf,
  Swords,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { AppNavigationItemId } from "./app-navigation";

/** One icon per section, shared by the sidebar, the top bar, and search. */
export const APP_NAVIGATION_ICONS: Record<AppNavigationItemId, LucideIcon> = {
  "user-dashboard": LayoutDashboard,
  "user-statistics": BarChart3,
  "user-battles": Swords,
  "user-faction-war": ShieldHalf,
  "user-notifications": BellRing,
  "user-settings": Settings,
  "organization-loots": ClipboardList,
  "organization-timers": Clock,
  "organization-reservations": CalendarClock,
  "organization-docs": FileText,
  "organization-events": Trophy,
  "organization-stats": BarChart4,
  "organization-activity": Logs,
  "organization-notifications": BellRing,
  "organization-settings": Settings,
};
