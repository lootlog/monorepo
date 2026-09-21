import { EmptyState } from "@/components/common/empty-state";
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
import {
  buildGuildRolePositionById,
  computeMembersStats,
  getFilteredSortedMembers,
  type MemberStatusFilter,
} from "@/features/guild/settings/members/member-list-item.utils";
import { useMemberGamePresence } from "@/features/guild/settings/members/use-member-game-presence";
import { useMemberWebPresence } from "@/features/guild/settings/members/use-member-web-presence";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  useGuildsControllerGetGuildById,
  useMembersControllerGetGuildMembers,
  useRolesControllerGetGuildRoles,
} from "@lootlog/client/main";

import type { MembersStats } from "@/features/guild/settings/members/members.types";
import { AnimatedToggleGroup } from "@/components/ui/animated-toggle-group";
import { Permission } from "@lootlog/schema/permissions";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { FilterX, Users } from "lucide-react";
import { startTransition, useRef, useState } from "react";
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

  const memberActivityStatsByDiscordIdAndSource =
    mapMemberActivityStatsByDiscordIdAndSource(memberActivityStats);

  const guildRolePositionById = buildGuildRolePositionById(guildRoles);

  const isMobile = useIsMobile();

  const canManageMembers = Boolean(
    accessPolicy?.allows(Permission.ADMIN) ||
    accessPolicy?.allows(Permission.OWNER),
  );

  const memberStats: MembersStats = computeMembersStats({
    members,
    memberGamePresenceByDiscordId,
    memberWebPresenceByDiscordId,
  });

  const filteredMembers = getFilteredSortedMembers({
    members,
    guildRolePositionById,
    memberGamePresenceByDiscordId,
    memberWebPresenceByDiscordId,
    searchValue,
    statusFilter,
  });

  const hasActiveFilters =
    statusFilter !== defaultStatusFilter || searchValue.trim() !== "";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto px-3 pb-3 gap-3">
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
                    <EmptyState
                      className="min-h-80"
                      icon={Users}
                      title={
                        members?.length === 0
                          ? t("settings.members.emptyGuildTitle")
                          : t("settings.members.emptyTitle")
                      }
                      description={
                        hasActiveFilters
                          ? t("settings.members.emptyFilteredDescription")
                          : t("settings.members.emptyDescription")
                      }
                      action={
                        hasActiveFilters && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSearchValue("");
                              setStatusFilter(defaultStatusFilter);
                            }}
                          >
                            <FilterX className="size-4" />
                            {t("settings.members.resetFilters")}
                          </Button>
                        )
                      }
                    />
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
