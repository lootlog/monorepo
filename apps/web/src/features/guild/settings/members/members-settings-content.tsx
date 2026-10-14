import { FILTER_PILL_CLASS } from "@/components/common/filter-pill";
import { ListToolbar } from "@/components/common/list-toolbar";
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
  type MemberStatusFilter,
} from "@/features/guild/settings/members/member-list-item.utils";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getPageScroller,
  usePageScrollsDocument,
} from "@/hooks/utils/use-page-scroll";
import {
  useGuildsControllerGetGuildById,
  useMembersControllerGetGuildMembers,
  useRolesControllerGetGuildRoles,
} from "@lootlog/client/main";
import { Permission } from "@lootlog/schema/permissions";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { cn } from "cn";
import { Users } from "lucide-react";
import { startTransition, useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingsListEmpty } from "../components/settings-list-empty";
import { SettingsTabPage } from "../components/settings-tab-page";
import { RefreshMembersButton } from "./components/refresh-members-button";
import { MembersList } from "./members-list";
import type { MembersStats } from "./members.types";

/** How many members each status filter holds. */
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

  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null,
  );

  const routeGuildId = useGuildId() ?? "";

  const { data: members } = useMembersControllerGetGuildMembers(
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
    accessPolicy?.allows(Permission.ADMIN) ||
    accessPolicy?.allows(Permission.OWNER),
  );

  const memberStats = computeMembersStats({
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

  const changeStatusFilter = (filter: MemberStatusFilter) => {
    // The list starts over, so its top stays under the toolbar.
    getPageScroller(scrollElement, scrollsDocument)?.scrollTo({ top: 0 });
    startTransition(() => setStatusFilter(filter));
  };

  return (
    <SettingsTabPage
      title={t("settings.members.title")}
      scrollRef={setScrollElement}
    >
      <ListToolbar
        search={searchValue}
        onSearchChange={setSearchValue}
        placeholder={t("settings.members.searchPlaceholder")}
        label={t("settings.members.searchPlaceholder")}
        clearLabel={t("settings.clearFilter")}
        disabled={!members}
      >
        {/* On phones the pills scroll sideways in one row under the filter. */}
        <div className="max-sm:order-last max-sm:-mx-3 max-sm:w-[calc(100%+1.5rem)] max-sm:overflow-x-auto max-sm:px-3 max-sm:[scrollbar-width:none]">
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={1.5}
            value={[statusFilter]}
            // One status is always chosen: pressing it again keeps it.
            onValueChange={([pressed]) => {
              const filter = statusFilters.find((value) => value === pressed);

              if (filter) changeStatusFilter(filter);
            }}
            aria-label={t("settings.members.table.status")}
            className="flex-wrap max-sm:w-max max-sm:flex-nowrap"
          >
            {statusFilters.map((filter) => {
              const count = memberStats[STATUS_FILTER_COUNTS[filter]];

              return (
                <ToggleGroupItem
                  key={filter}
                  value={filter}
                  className={FILTER_PILL_CLASS}
                >
                  {t(`settings.members.filters.${filter}`)}
                  <span
                    className={cn(
                      "text-muted-foreground tabular-nums",
                      filter === "problems" && count > 0 && "text-signal-timer",
                    )}
                  >
                    {count}
                  </span>
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </div>
        <RefreshMembersButton />
      </ListToolbar>
      <OrganizationPresenceStatus guildId={resolvedGuildId} />
      {members && filteredMembers.length === 0 ? (
        <SettingsListEmpty
          icon={Users}
          title={
            members.length === 0
              ? t("settings.members.emptyGuildTitle")
              : t("settings.members.emptyTitle")
          }
          description={
            hasActiveFilters
              ? t("settings.members.emptyFilteredDescription")
              : t("settings.members.emptyDescription")
          }
          hasActiveFilters={hasActiveFilters}
          onResetFilters={() => {
            setSearchValue("");
            setStatusFilter(defaultStatusFilter);
          }}
        />
      ) : (
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
      )}
    </SettingsTabPage>
  );
};
