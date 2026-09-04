import { SearchInput } from "@/components/ui/search-input";
import { MembersSettingsHeader } from "@/features/guild/settings/members/members-settings-header";
import { MembersTable } from "@/features/guild/settings/members/members-table";
import {
  defaultStatusFilter,
  statusFilters,
} from "@/features/guild/settings/members/members.constants";
import { memberActivityStatsQueryOptions } from "@/features/guild/settings/members/member-activity-stats-api";
import { mapMemberActivityStatsByDiscordIdAndSource } from "@/features/guild/settings/members/member-activity-stats.utils";
import {
  isMemberOnlineInGame,
  resolveMemberPresenceGuildId,
} from "@/features/guild/settings/members/member-game-presence.utils";
import { isMemberOnlineOnWeb } from "@/features/guild/settings/members/member-web-presence.utils";
import {
  compareMemberListSortValues,
  isMemberProblematic,
  memberMatchesSearch,
  memberMatchesStatusFilter,
  type MemberStatusFilter,
} from "@/features/guild/settings/members/member-list-item.utils";
import { useMemberGamePresence } from "@/features/guild/settings/members/use-member-game-presence";
import { useMemberWebPresence } from "@/features/guild/settings/members/use-member-web-presence";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildsControllerGetGuildById } from "@lootlog/client/main";
import { useMembersControllerGetGuildMembers } from "@lootlog/client/main";
import { useRolesControllerGetGuildRoles } from "@lootlog/client/main";
import type {
  GuildMember,
  MembersStats,
} from "@/features/guild/settings/members/members.types";
import { cn } from "cn";
import { Permission } from "@lootlog/schema/permissions";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { FilterX, Users } from "lucide-react";
import { startTransition, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@lootlog/ui/components/card";

export const MembersSettingsContent = () => {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] =
    useState<MemberStatusFilter>(defaultStatusFilter);
  const scrollElementRef = useRef<HTMLDivElement | null>(null);
  const routeGuildId = useGuildId();
  const { data: members } = useMembersControllerGetGuildMembers(
    { guildId: routeGuildId ?? "" },
    {
      includeInactive: true,
    },
  );
  const [searchValue, setSearchValue] = useState("");
  const { data: guild } = useGuildsControllerGetGuildById({
    guildId: routeGuildId ?? "",
  });
  const { data: guildRoles } = useRolesControllerGetGuildRoles({
    guildId: routeGuildId ?? "",
  });
  const { data: accessPolicy } = useGuildPermissions();
  const resolvedGuildId = resolveMemberPresenceGuildId(guild);
  const { data: memberActivityStats } = useQuery(
    memberActivityStatsQueryOptions(resolvedGuildId),
  );
  const memberGamePresenceByDiscordId = useMemberGamePresence(resolvedGuildId);
  const memberWebPresenceByDiscordId = useMemberWebPresence(resolvedGuildId);
  const memberActivityStatsByDiscordIdAndSource = useMemo(
    () => mapMemberActivityStatsByDiscordIdAndSource(memberActivityStats),
    [memberActivityStats],
  );
  const guildRolePositionById = useMemo(() => {
    const rolePositions = new Map<string, number>();

    for (const role of guildRoles ?? []) {
      rolePositions.set(role.id, role.position ?? 0);
    }

    return rolePositions;
  }, [guildRoles]);
  const isMobile = useIsMobile();
  const canManageMembers = Boolean(
    accessPolicy?.allows(Permission.ADMIN) ||
    accessPolicy?.allows(Permission.OWNER),
  );

  const memberStats = useMemo<MembersStats>(() => {
    const stats = {
      totalMembers: 0,
      activeMembers: 0,
      inactiveMembers: 0,
      onlineMembers: 0,
      problematicMembers: 0,
    };

    for (const member of members ?? []) {
      const isOnline =
        isMemberOnlineOnWeb(memberWebPresenceByDiscordId, member.userId) ||
        isMemberOnlineInGame(memberGamePresenceByDiscordId, member.userId);

      stats.totalMembers += 1;
      if (member.active) {
        stats.activeMembers += 1;
      } else {
        stats.inactiveMembers += 1;
      }

      if (isOnline) {
        stats.onlineMembers += 1;
      }

      if (isMemberProblematic(member)) {
        stats.problematicMembers += 1;
      }
    }

    return stats;
  }, [memberGamePresenceByDiscordId, memberWebPresenceByDiscordId, members]);

  const filteredMembers = useMemo(() => {
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
    const filtered = members.filter((member) => {
      const isOnline =
        isMemberOnlineOnWeb(memberWebPresenceByDiscordId, member.userId) ||
        isMemberOnlineInGame(memberGamePresenceByDiscordId, member.userId);

      return (
        memberMatchesSearch({ member, search: searchValue }) &&
        memberMatchesStatusFilter({
          member,
          filter: statusFilter,
          isOnline,
        })
      );
    });

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
  }, [
    guildRolePositionById,
    memberGamePresenceByDiscordId,
    memberWebPresenceByDiscordId,
    members,
    searchValue,
    statusFilter,
  ]);

  const hasActiveFilters =
    statusFilter !== defaultStatusFilter || searchValue.trim() !== "";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background px-3 gap-3">
      <MembersSettingsHeader
        {...memberStats}
        onProblemsClick={() => {
          scrollElementRef.current?.scrollTo({ top: 0 });
          startTransition(() => setStatusFilter("problems"));
        }}
      />
      <Card className="p-0 gap-0">
        <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
          <SearchInput
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={t("settings.members.searchPlaceholder")}
            className="h-9"
            wrapperClassName="w-full xl:max-w-md 2xl:max-w-xl"
          />
          <div className="flex flex-wrap items-center gap-1.5 xl:justify-end">
            {statusFilters.map((filter) => (
              <Button
                key={filter}
                type="button"
                size="sm"
                variant={statusFilter === filter ? "secondary" : "ghost"}
                className={cn(
                  "h-8 px-2.5 text-xs",
                  statusFilter === filter && "bg-primary/10 text-primary",
                )}
                onClick={() => {
                  scrollElementRef.current?.scrollTo({ top: 0 });
                  startTransition(() => setStatusFilter(filter));
                }}
              >
                {t(`settings.members.filters.${filter}`)}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="h-full flex-1" ref={scrollElementRef}>
              <div className="w-full max-w-full min-w-0">
                {filteredMembers.length > 0 && (
                  <MembersTable
                    members={filteredMembers}
                    guildOwnerId={guild?.ownerId}
                    activityStatsByDiscordIdAndSource={
                      memberActivityStatsByDiscordIdAndSource
                    }
                    scrollElementRef={scrollElementRef}
                    isMobile={isMobile}
                    canManageMembers={canManageMembers}
                    memberGamePresenceByDiscordId={
                      memberGamePresenceByDiscordId
                    }
                    memberWebPresenceByDiscordId={memberWebPresenceByDiscordId}
                    guildId={routeGuildId ?? ""}
                  />
                )}
                {filteredMembers.length === 0 && (
                  <div className="flex min-h-80 flex-col items-center justify-center px-4 py-12 text-center text-muted-foreground">
                    <Users className="mb-4 size-12 opacity-30" />
                    <p className="text-sm font-medium">
                      {members?.length === 0
                        ? t("settings.members.emptyGuildTitle")
                        : t("settings.members.emptyTitle")}
                    </p>
                    <p className="mt-1 text-xs">
                      {hasActiveFilters
                        ? t("settings.members.emptyFilteredDescription")
                        : t("settings.members.emptyDescription")}
                    </p>
                    {hasActiveFilters && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                          setSearchValue("");
                          setStatusFilter(defaultStatusFilter);
                        }}
                      >
                        <FilterX className="size-3.5" />
                        {t("settings.members.resetFilters")}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </Card>
    </div>
  );
};
