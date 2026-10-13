import type { MemberStatusFilter } from "@/features/guild/settings/members/member-list-item.utils";

export const statusFilters: MemberStatusFilter[] = [
  "all",
  "active",
  "inactive",
  "online",
  "problems",
];

export const defaultStatusFilter: MemberStatusFilter = "active";

/** Column widths of the desktop members table, shared with its loading skeleton. */
export const memberTableColumnWidths = [
  ["member", "w-[360px]"],
  ["status", "w-[130px]"],
  ["discord", "w-[160px]"],
  ["activity", "w-[150px]"],
  ["visits", "w-[130px]"],
  ["actions", "w-16"],
] as const;
