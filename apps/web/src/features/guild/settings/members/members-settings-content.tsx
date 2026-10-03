import { useMemberActivity } from "@/features/guild/settings/members/use-member-activity";
import { RefreshMembersButton } from "./components/refresh-members-button";
import { SettingsTableCard } from "@/features/guild/settings/components/settings-table-card";
import { MembersSettingsFooter } from "@/features/guild/settings/members/members-settings-footer";
import { MembersTable } from "@/features/guild/settings/members/members-table";
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

import type { MembersStats } from "@/features/guild/settings/members/members.types";
import { AnimatedToggleGroup } from "@/components/ui/animated-toggle-group";
import { Permission } from "@lootlog/schema/permissions";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { Users } from "lucide-react";
import { startTransition, useState } from "react";
import { useTranslation } from "react-i18next";

export const MembersSettingsContent = () => {
  const { t } = useTranslation();

  const [statusFilter, setStatusFilter] =
    useState<MemberStatusFilter>(defaultStatusFilter);

  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null,
  );

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

  const {
    memberGamePresenceByDiscordId,
    memberWebPresenceByDiscordId,
    memberActivityStatsByDiscordIdAndSource,
  } = useMemberActivity(resolvedGuildId);

  const guildRolePositionById = buildGuildRolePositionById(guildRoles);

  const isMobile = useIsMobile();
  const scrollsDocument = usePageScrollsDocument();

  const scrollToTop = () =>
    getPageScroller(scrollElement, scrollsDocument)?.scrollTo({
      top: 0,
    });

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
    <SettingsTableCard
      title={t("settings.members.title")}
      search={{
        value: searchValue,
        placeholder: t("settings.members.searchPlaceholder"),
        onChange: setSearchValue,
      }}
      toolbarEnd={
        <>
          <ScrollArea
            orientation="horizontal"
            className="w-full min-w-0 max-w-full sm:w-auto"
          >
            <AnimatedToggleGroup
              size="large"
              value={statusFilter}
              onValueChange={(filter) => {
                scrollToTop();
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
        </>
      }
      isEmpty={filteredMembers.length === 0}
      empty={{
        icon: Users,
        title:
          members?.length === 0
            ? t("settings.members.emptyGuildTitle")
            : t("settings.members.emptyTitle"),
        description: hasActiveFilters
          ? t("settings.members.emptyFilteredDescription")
          : t("settings.members.emptyDescription"),
      }}
      hasActiveFilters={hasActiveFilters}
      onResetFilters={() => {
        setSearchValue("");
        setStatusFilter(defaultStatusFilter);
      }}
      scrollRef={setScrollElement}
      footer={
        <MembersSettingsFooter
          {...memberStats}
          onProblemsClick={() => {
            scrollToTop();
            startTransition(() => setStatusFilter("problems"));
          }}
        />
      }
    >
      <MembersTable
        members={filteredMembers}
        guildOwnerId={guild?.ownerId}
        activityStatsByDiscordIdAndSource={
          memberActivityStatsByDiscordIdAndSource
        }
        scrollElement={scrollElement}
        isMobile={isMobile}
        canManageMembers={canManageMembers}
        memberGamePresenceByDiscordId={memberGamePresenceByDiscordId}
        memberWebPresenceByDiscordId={memberWebPresenceByDiscordId}
        guildId={routeGuildId ?? ""}
      />
    </SettingsTableCard>
  );
};
