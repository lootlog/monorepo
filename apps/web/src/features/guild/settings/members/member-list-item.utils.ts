import { cn } from "cn";
import { Permission } from "@lootlog/schema/permissions";
import type { MemberResponseDto as GuildMember } from "@lootlog/client/main";
import { getMemberDiscordSyncPresentation } from "@/features/guild/settings/members/member-discord-sync.utils";

export type MemberOnlineSource = "web" | "game";
export type MemberStatusFilter =
  | "all"
  | "active"
  | "inactive"
  | "online"
  | "problems";
export type MemberAccessState = "active" | "inactive" | "online" | "problem";

export type MemberListSortValue = {
  rolePosition: number;
  name: string;
};

export const getMemberListItemClassName = ({
  isOnline,
  isActive,
}: {
  isOnline: boolean;
  isActive: boolean;
}) => cn(isOnline && "border-emerald-500/50", !isActive && "opacity-50");

export const getMemberOnlineSources = ({
  isOnlineOnWeb,
  isOnlineInGame,
}: {
  isOnlineOnWeb: boolean;
  isOnlineInGame: boolean;
}): MemberOnlineSource[] => {
  const sources: MemberOnlineSource[] = [];

  if (isOnlineOnWeb) {
    sources.push("web");
  }

  if (isOnlineInGame) {
    sources.push("game");
  }

  return sources;
};

export const isMemberProblematic = (member: GuildMember) => {
  const presentation = getMemberDiscordSyncPresentation(member);

  return (
    presentation.showListIndicator ||
    presentation.tone === "danger" ||
    presentation.tone === "warning" ||
    Boolean(member.isStale) ||
    Boolean(member.refreshQueued)
  );
};

export const getMemberAccessState = ({
  member,
  isOnline,
}: {
  member: GuildMember;
  isOnline: boolean;
}): MemberAccessState => {
  if (!member.active) {
    return "inactive";
  }

  if (isMemberProblematic(member)) {
    return "problem";
  }

  if (isOnline) {
    return "online";
  }

  return "active";
};

export const memberMatchesSearch = ({
  member,
  search,
}: {
  member: GuildMember;
  search: string;
}) => {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return (
    member.name.toLowerCase().includes(normalizedSearch) ||
    member.userId.includes(normalizedSearch)
  );
};

export const memberMatchesStatusFilter = ({
  member,
  filter,
  isOnline,
}: {
  member: GuildMember;
  filter: MemberStatusFilter;
  isOnline: boolean;
}) => {
  if (filter === "all") {
    return true;
  }

  if (filter === "active") {
    return member.active;
  }

  if (filter === "inactive") {
    return !member.active;
  }

  if (filter === "online") {
    return isOnline;
  }

  return isMemberProblematic(member);
};

export const memberHasAdminPermission = (member: GuildMember) =>
  member.roles.some((role) => role.permissions.includes(Permission.ADMIN));

export const compareMemberListSortValues = (
  first: MemberListSortValue,
  second: MemberListSortValue,
) => {
  if (first.rolePosition !== second.rolePosition) {
    return second.rolePosition - first.rolePosition;
  }

  return first.name.localeCompare(second.name, "pl", { sensitivity: "base" });
};
