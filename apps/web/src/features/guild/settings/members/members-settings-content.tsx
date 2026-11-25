import { ResultsSurface } from "@/components/common/results-surface";
import { KillStatsSearch } from "@/components/common/kill-stats-search";
import { FilterOptionCount } from "@/components/common/filter-option-count";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { UserRound } from "lucide-react";
import { OrganizationPresenceStatus } from "@/components/common/organization-presence-status";
import { useMemberActivity } from "@/features/guild/settings/members/use-member-activity";
import {
  defaultStatusFilter,
  statusFilters,
} from "@/features/guild/settings/members/members.constants";
import {
  buildGuildRolePositionById,
  computeMembersStats,
  getFilteredSortedMembers,
  memberMatchesSearch,
  type MemberStatusFilter,
} from "@/features/guild/settings/members/member-list-item.utils";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getPageScroller,
  usePageScrollsDocument,
} from "@lootlog/ui/hooks/use-page-scroll";
import {
  useGuildsControllerGetGuildById,
  useMembersControllerGetGuildMembers,
  useRolesControllerGetGuildRoles,
} from "@lootlog/client/main";
import { Capability } from "@lootlog/schema/permissions";
import { startTransition, useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingsListError } from "@/components/common/settings-list-error";
import { PageScrollerContext } from "@/components/layout/page-scroller-context";
import { MembersEmptyState } from "./members-empty-state";
import { MemberTileSkeleton } from "./member-tile-skeleton";
import { SettingsTabPage } from "@/components/common/settings-tab-page";
import { RefreshMembersButton } from "./components/refresh-members-button";
import { MembersList } from "./members-list";
import type { MembersStats } from "./members.types";

const STATUS_FILTER_COUNTS: Record<MemberStatusFilter, keyof MembersStats> = {
  all: "totalMembers",
  active: "activeMembers",
  inactive: "inactiveMembers",
  online: "onlineMembers",
  problems: "problematicMembers",
};

export const MembersSettingsContent = () => {
  const { t } = useTranslation();

  const [statusFilter, setStatusFilter] =
    useState<MemberStatusFilter>(defaultStatusFilter);

  const scrollElement = useContext(PageScrollerContext);

  const routeGuildId = useGuildId() ?? "";

  const {
    data: members,
    isError,
    isFetching,
    refetch,
  } = useMembersControllerGetGuildMembers(
    { guildId: routeGuildId },
    { includeInactive: true },
  );

  const [searchValue, setSearchValue] = useState("");

  const { data: guild } = useGuildsControllerGetGuildById({
    guildId: routeGuildId,
  });

  const { data: guildRoles } = useRolesControllerGetGuildRoles({
    guildId: routeGuildId,
  });

  const { data: accessPolicy } = useGuildPermissions();
  const resolvedGuildId = guild?.id ?? undefined;

  const {
    memberGamePresenceByDiscordId,
    memberWebPresenceByDiscordId,
    memberActivityStatsByDiscordIdAndSource,
  } = useMemberActivity(resolvedGuildId);

  const guildRolePositionById = buildGuildRolePositionById(guildRoles);
  const scrollsDocument = usePageScrollsDocument();

  const canManageMembers = Boolean(
    accessPolicy?.allows(Capability.ADMIN) ||
    accessPolicy?.allows(Capability.OWNER),
  );

  const searchedMembers = members?.filter((member) =>
    memberMatchesSearch({ member, search: searchValue }),
  );

  const memberStats = computeMembersStats({
    members: searchedMembers,
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

  const changeStatusFilter = (filter: MemberStatusFilter) => {
    getPageScroller(scrollElement, scrollsDocument)?.scrollTo({ top: 0 });
    startTransition(() => setStatusFilter(filter));
  };

  const statusLabel = (filter: MemberStatusFilter) =>
    t(`settings.members.filters.${filter}`);

  const renderContent = () => {
    if (!members && isError) {
      return (
        <SettingsListError
          title={t("settings.members.empty.loadError")}
          isRetrying={isFetching}
          onRetry={() => void refetch()}
        />
      );
    }

    if (!members) {
      return (
        <div aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => (
            <MemberTileSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (filteredMembers.length === 0) {
      return (
        <MembersEmptyState
          hasMembers={members.length > 0}
          searchMatchCount={memberStats.totalMembers}
          search={searchValue}
          statusFilter={statusFilter}
          onClearSearch={() => setSearchValue("")}
          onShowAll={() => changeStatusFilter("all")}
        />
      );
    }

    return (
      <MembersList
        members={filteredMembers}
        guildOwnerId={guild?.ownerId}
        activityStatsByDiscordIdAndSource={
          memberActivityStatsByDiscordIdAndSource
        }
        scrollElement={scrollElement}
        canManageMembers={canManageMembers}
        memberGamePresenceByDiscordId={memberGamePresenceByDiscordId}
        memberWebPresenceByDiscordId={memberWebPresenceByDiscordId}
        guildId={routeGuildId}
      />
    );
  };

  return (
    <SettingsTabPage title={t("settings.members.title")}>
      <ResultsSurface
        search={
          <KillStatsSearch
            value={searchValue}
            placeholder={t("settings.members.searchPlaceholder")}
            onChange={setSearchValue}
          />
        }
        filters={
          <>
            <FilterPopover
              options={statusFilters.map((filter) => {
                const count = memberStats[STATUS_FILTER_COUNTS[filter]];
                const label = statusLabel(filter);

                return {
                  value: filter,
                  label,
                  render: () => (
                    <FilterOptionCount
                      label={label}
                      count={count}
                      countClassName={
                        filter === "problems" && count > 0
                          ? "text-signal-timer"
                          : undefined
                      }
                    />
                  ),
                };
              })}
              value={statusFilter}
              onValueChange={changeStatusFilter}
              placeholder={t("settings.members.table.status")}
              icon={UserRound}
              showSearch={false}
              active={statusFilter !== defaultStatusFilter}
            />
            <RefreshMembersButton />
          </>
        }
        filtersLabel={t("settings.members.filtersLabel")}
        chips={
          statusFilter === defaultStatusFilter
            ? []
            : [
                {
                  id: statusFilter,
                  label: statusLabel(statusFilter),
                  onRemove: () => changeStatusFilter(defaultStatusFilter),
                },
              ]
        }
        clearFiltersLabel={t("common.actions.clearFilters")}
        onClearFilters={() => {
          setSearchValue("");
          changeStatusFilter(defaultStatusFilter);
        }}
      >
        <OrganizationPresenceStatus guildId={resolvedGuildId} />
        {renderContent()}
      </ResultsSurface>
    </SettingsTabPage>
  );
};
