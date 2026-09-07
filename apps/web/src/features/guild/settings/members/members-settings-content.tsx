import { RefreshMembersButton } from "./components/refresh-members-button";
import { TableFilterToolbar } from "@/components/ui/table-filter-toolbar";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SearchInput } from "@/components/ui/search-input";
import { MembersSettingsFooter } from "@/features/guild/settings/members/members-settings-footer";
import { MembersTable } from "@/features/guild/settings/members/members-table";
import {
  defaultStatusFilter,
  statusFilters,
} from "@/features/guild/settings/members/members.constants";
import { memberActivityStatsQueryOptions } from "@/features/guild/settings/members/member-activity-stats-api";
import { mapMemberActivityStatsByDiscordIdAndSource } from "@/features/guild/settings/members/member-activity-stats.utils";
import { isMemberOnlineInGame } from "@/features/guild/settings/members/member-game-presence.utils";
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
import { AnimatedToggleGroup } from "@/components/ui/animated-toggle-group";
import { Permission } from "@lootlog/schema/permissions";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { FilterX, Users } from "lucide-react";
import { startTransition, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

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
  const resolvedGuildId = guild?.id ?? undefined;
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
    <div className="flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto bg-background px-3 pb-3 gap-3">
      <h1 className="sr-only">{t("settings.members.title")}</h1>
      <SectionCard className="max-h-full shrink-0">
        <SectionCardContent className="flex min-h-0 flex-col gap-0 p-0">
          <TableFilterToolbar>
            <SearchInput
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={t("settings.members.searchPlaceholder")}
              className="h-9"
              wrapperClassName="w-full min-w-0 sm:min-w-[200px] sm:flex-1"
            />
            <ScrollArea
              orientation="horizontal"
              className="min-w-0 max-w-full w-full sm:w-auto"
            >
              <AnimatedToggleGroup
                size="default"
                value={statusFilter}
                onValueChange={(filter) => {
                  scrollElementRef.current?.scrollTo({ top: 0 });
                  startTransition(() => setStatusFilter(filter));
                }}
                label={t("settings.members.table.status")}
                options={statusFilters.map((filter) => ({
                  value: filter,
                  label: t(`settings.members.filters.${filter}`),
                }))}
                className="w-max min-w-full max-w-none"
              />
            </ScrollArea>
            <RefreshMembersButton />
          </TableFilterToolbar>

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
                      memberWebPresenceByDiscordId={
                        memberWebPresenceByDiscordId
                      }
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
        </SectionCardContent>
        <MembersSettingsFooter
          {...memberStats}
          onProblemsClick={() => {
            scrollElementRef.current?.scrollTo({ top: 0 });
            startTransition(() => setStatusFilter("problems"));
          }}
        />
      </SectionCard>
    </div>
  );
};
