import { Capability } from "@lootlog/schema/permissions";
import {
  KeyRound,
  Shield,
  Package,
  Clock,
  CalendarCheck,
  FileText,
  MessageCircle,
  Bell,
  Users,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type PermissionCategory = {
  groupKey: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  permissions: Capability[];
};

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    groupKey: "access",
    icon: KeyRound,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/20",
    permissions: [Capability.LOOTLOG_ACCESS],
  },
  {
    groupKey: "admin",
    icon: Shield,
    color: "text-red-500",
    bgColor: "bg-red-500/20",
    permissions: [Capability.ADMIN, Capability.LOOTLOG_MANAGE],
  },
  {
    groupKey: "loots",
    icon: Package,
    color: "text-amber-500",
    bgColor: "bg-amber-500/20",
    permissions: [
      Capability.LOOTLOG_LOOTS_READ,
      Capability.LOOTLOG_LOOTS_WRITE,
      Capability.LOOTLOG_LOOTS_ARCHIVE,
      Capability.LOOTLOG_LOOTS_TITANS_READ,
      Capability.LOOTLOG_LOOTS_HEROES_READ,
    ],
  },
  {
    groupKey: "timers",
    icon: Clock,
    color: "text-blue-500",
    bgColor: "bg-blue-500/20",
    permissions: [
      Capability.LOOTLOG_TIMERS_READ,
      Capability.LOOTLOG_TIMERS_WRITE,
      Capability.LOOTLOG_TIMERS_RESET,
      Capability.LOOTLOG_TIMERS_DELETE,
      Capability.LOOTLOG_TIMERS_TITANS_READ,
      Capability.LOOTLOG_TIMERS_HEROES_READ,
    ],
  },
  {
    groupKey: "reservations",
    icon: CalendarCheck,
    color: "text-purple-500",
    bgColor: "bg-purple-500/20",
    permissions: [
      Capability.LOOTLOG_RESERVATIONS_READ,
      Capability.LOOTLOG_RESERVATIONS_WRITE,
    ],
  },
  {
    groupKey: "docs",
    icon: FileText,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/20",
    permissions: [Capability.LOOTLOG_DOCS_READ, Capability.LOOTLOG_DOCS_WRITE],
  },
  {
    groupKey: "members",
    icon: Users,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/20",
    permissions: [
      Capability.LOOTLOG_MEMBERS_READ,
      Capability.LOOTLOG_ONLINE_PLAYERS_READ,
      Capability.LOOTLOG_PRESENCE_LOCATION_READ,
    ],
  },
  {
    groupKey: "chat",
    icon: MessageCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/20",
    permissions: [
      Capability.LOOTLOG_CHAT_READ,
      Capability.LOOTLOG_CHAT_WRITE,
      Capability.LOOTLOG_CHAT_TITANS_READ,
      Capability.LOOTLOG_CHAT_HEROES_READ,
    ],
  },
  {
    groupKey: "notifications",
    icon: Bell,
    color: "text-orange-500",
    bgColor: "bg-orange-500/20",
    permissions: [
      Capability.LOOTLOG_NOTIFICATIONS_READ,
      Capability.LOOTLOG_NOTIFICATIONS_SEND,
      Capability.LOOTLOG_NOTIFICATIONS_TITANS_READ,
      Capability.LOOTLOG_NOTIFICATIONS_HEROES_READ,
    ],
  },
  {
    groupKey: "events",
    icon: Trophy,
    color: "text-fuchsia-500",
    bgColor: "bg-fuchsia-500/20",
    permissions: [
      Capability.LOOTLOG_EVENTS_READ,
      Capability.LOOTLOG_EVENTS_WRITE,
      Capability.LOOTLOG_EVENTS_MANAGE,
    ],
  },
];
