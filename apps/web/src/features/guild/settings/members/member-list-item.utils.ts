import { cn } from "cn";
import type { MemberResponseDto as GuildMember } from "@lootlog/client/main";
import { getMemberDiscordSyncPresentation } from "@/features/guild/settings/members/member-discord-sync.utils";
import {
  isMemberOnlineInGame,
  type MemberGamePresenceByDiscordId,
} from "@/features/guild/settings/members/member-game-presence.utils";
import {
  isMemberOnlineOnWeb,
  type MemberWebPresenceByDiscordId,
} from "@/lib/web-presence";
import type { MembersStats } from "@/features/guild/settings/members/members.types";

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

export const compareMemberListSortValues = (
  first: MemberListSortValue,
  second: MemberListSortValue,
) => {
  if (first.rolePosition !== second.rolePosition) {
    return second.rolePosition - first.rolePosition;
  }

  return first.name.localeCompare(second.name, "pl", { sensitivity: "base" });
};

export const buildGuildRolePositionById = (
  guildRoles: { id: string; position?: number | null }[] | undefined,
) => {
  const rolePositions = new Map<string, number>();

  for (const role of guildRoles ?? []) {
    rolePositions.set(role.id, role.position ?? 0);
  }

  return rolePositions;
};

type MemberPresenceInput = {
  members: GuildMember[] | undefined;
  memberGamePresenceByDiscordId: MemberGamePresenceByDiscordId | undefined;
  memberWebPresenceByDiscordId: MemberWebPresenceByDiscordId | undefined;
};

const isMemberOnline = (
  member: GuildMember,
  {
    memberGamePresenceByDiscordId,
    memberWebPresenceByDiscordId,
  }: Omit<MemberPresenceInput, "members">,
) =>
  isMemberOnlineOnWeb(memberWebPresenceByDiscordId, member.userId) ||
  isMemberOnlineInGame(memberGamePresenceByDiscordId, member.userId);

export const computeMembersStats = ({
  members,
  memberGamePresenceByDiscordId,
  memberWebPresenceByDiscordId,
}: MemberPresenceInput): MembersStats => {
  const stats: MembersStats = {
    totalMembers: 0,
    activeMembers: 0,
    inactiveMembers: 0,
    onlineMembers: 0,
    problematicMembers: 0,
  };

  for (const member of members ?? []) {
    stats.totalMembers += 1;

    if (member.active) {
      stats.activeMembers += 1;
    } else {
      stats.inactiveMembers += 1;
    }

    if (
      isMemberOnline(member, {
        memberGamePresenceByDiscordId,
        memberWebPresenceByDiscordId,
      })
    ) {
      stats.onlineMembers += 1;
    }

    if (isMemberProblematic(member)) {
      stats.problematicMembers += 1;
    }
  }

  return stats;
};

export const getFilteredSortedMembers = ({
  members,
  guildRolePositionById,
  memberGamePresenceByDiscordId,
  memberWebPresenceByDiscordId,
  searchValue,
  statusFilter,
}: MemberPresenceInput & {
  guildRolePositionById: Map<string, number>;
  searchValue: string;
  statusFilter: MemberStatusFilter;
}) => {
  if (!members) return [];

  const getMemberSortRolePosition = (member: GuildMember) => {
    let highestRolePosition = 0;

    for (const role of member.roles) {
      const rolePosition =
        guildRolePositionById.get(role.id) ?? role.position ?? 0;

      if (rolePosition > highestRolePosition) {
        highestRolePosition = rolePosition;
      }
    }

    return highestRolePosition;
  };

  const filtered = members.filter(
    (member) =>
      memberMatchesSearch({ member, search: searchValue }) &&
      memberMatchesStatusFilter({
        member,
        filter: statusFilter,
        isOnline: isMemberOnline(member, {
          memberGamePresenceByDiscordId,
          memberWebPresenceByDiscordId,
        }),
      }),
  );

  return [...filtered].sort((firstMember, secondMember) =>
    compareMemberListSortValues(
      {
        rolePosition: getMemberSortRolePosition(firstMember),
        name: firstMember.name,
      },
      {
        rolePosition: getMemberSortRolePosition(secondMember),
        name: secondMember.name,
      },
    ),
  );
};
