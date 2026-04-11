import { Permission } from "@lootlog/types";
import {
  KeyRound,
  Shield,
  Package,
  Clock,
  CalendarCheck,
  MessageCircle,
  Bell,
  Users,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type PermissionCategory = {
  name: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  permissions: Permission[];
};

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    name: "Dostęp",
    icon: KeyRound,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/20",
    permissions: [Permission.LOOTLOG_ACCESS],
  },
  {
    name: "Administracja",
    icon: Shield,
    color: "text-red-500",
    bgColor: "bg-red-500/20",
    permissions: [Permission.ADMIN, Permission.LOOTLOG_MANAGE],
  },
  {
    name: "Łupy",
    icon: Package,
    color: "text-amber-500",
    bgColor: "bg-amber-500/20",
    permissions: [
      Permission.LOOTLOG_LOOTS_READ,
      Permission.LOOTLOG_LOOTS_WRITE,
      Permission.LOOTLOG_LOOTS_TITANS_READ,
      Permission.LOOTLOG_LOOTS_HEROES_READ,
    ],
  },
  {
    name: "Timery",
    icon: Clock,
    color: "text-blue-500",
    bgColor: "bg-blue-500/20",
    permissions: [
      Permission.LOOTLOG_TIMERS_READ,
      Permission.LOOTLOG_TIMERS_WRITE,
      Permission.LOOTLOG_TIMERS_RESET,
      Permission.LOOTLOG_TIMERS_DELETE,
      Permission.LOOTLOG_TIMERS_TITANS_READ,
      Permission.LOOTLOG_TIMERS_HEROES_READ,
    ],
  },
  {
    name: "Rezerwacje",
    icon: CalendarCheck,
    color: "text-purple-500",
    bgColor: "bg-purple-500/20",
    permissions: [
      Permission.LOOTLOG_RESERVATIONS_READ,
      Permission.LOOTLOG_RESERVATIONS_WRITE,
    ],
  },
  {
    name: "Członkowie",
    icon: Users,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/20",
    permissions: [Permission.LOOTLOG_MEMBERS_READ],
  },
  {
    name: "Czat",
    icon: MessageCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/20",
    permissions: [
      Permission.LOOTLOG_CHAT_READ,
      Permission.LOOTLOG_CHAT_WRITE,
      Permission.LOOTLOG_CHAT_TITANS_READ,
      Permission.LOOTLOG_CHAT_HEROES_READ,
    ],
  },
  {
    name: "Powiadomienia",
    icon: Bell,
    color: "text-orange-500",
    bgColor: "bg-orange-500/20",
    permissions: [
      Permission.LOOTLOG_NOTIFICATIONS_READ,
      Permission.LOOTLOG_NOTIFICATIONS_SEND,
      Permission.LOOTLOG_NOTIFICATIONS_TITANS_READ,
      Permission.LOOTLOG_NOTIFICATIONS_HEROES_READ,
    ],
  },
  {
    name: "Eventy",
    icon: Trophy,
    color: "text-fuchsia-500",
    bgColor: "bg-fuchsia-500/20",
    permissions: [
      Permission.LOOTLOG_EVENTS_READ,
      Permission.LOOTLOG_EVENTS_WRITE,
      Permission.LOOTLOG_EVENTS_MANAGE,
    ],
  },
];
