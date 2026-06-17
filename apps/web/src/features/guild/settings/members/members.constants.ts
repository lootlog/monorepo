import type { MemberStatusFilter } from "@/features/guild/settings/members/member-list-item.utils";

export const statusFilters: MemberStatusFilter[] = [
  "all",
  "active",
  "inactive",
  "online",
  "problems",
];

export const defaultStatusFilter: MemberStatusFilter = "active";
