import { OrganizationPresenceStatus } from "@/components/common/organization-presence-status";
import { useMemberActivity } from "@/features/guild/settings/members/use-member-activity";
import { MetaItem } from "@/components/common/meta-item";
import { ROUTES } from "@/config/routes";
import { SettingsDetailNotFound } from "@/components/common/settings-detail-not-found";
import { SettingsListError } from "@/components/common/settings-list-error";
import { MemberSettingsDetailSkeleton } from "./member-settings-detail-skeleton";
import { RefreshCw, UserRoundX } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Permission } from "@lootlog/schema/permissions";
import { getColorFromRole } from "@/utils/get-color-from-role";
import { MemberAvatar } from "@/components/common/member-avatar";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import {
  useGuildsControllerGetGuildById,
  useMembersControllerGetGuildMembers,
  type MemberResponseDto as GuildMember,
} from "@lootlog/client/main";

import { isMemberOnlineInGame } from "@/features/guild/settings/members/member-game-presence.utils";
import { isMemberOnlineOnWeb } from "@/lib/web-presence";
import { MemberData } from "@/features/guild/settings/members/components/member-data";
import { MemberSyncButton } from "@/features/guild/settings/members/components/member-sync-button";
import { MemberDeactivationButton } from "@/features/guild/settings/members/components/member-deactivation-button";
import { getMemberAccessState } from "@/features/guild/settings/members/member-list-item.utils";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { DetailPage } from "@/components/common/detail-page";
import { MemberAccessBadges } from "./member-access-badges";

export const MemberSettingsDetailPageContent = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { guildId, memberId } = useParams({
    from: "/_authenticated/$guildId/settings/members_/$memberId",
  });

  const {
    data: members,
    isError,
    isFetching,
    refetch,
  } = useMembersControllerGetGuildMembers(
    { guildId },
    {
      includeInactive: true,
    },
  );

  const { data: guild } = useGuildsControllerGetGuildById({ guildId });
  const { data: accessPolicy } = useGuildPermissions();
  const resolvedGuildId = guild?.id ?? undefined;

  const {
    memberGamePresenceByDiscordId,
    memberWebPresenceByDiscordId,
    memberActivityStatsByDiscordIdAndSource,
  } = useMemberActivity(resolvedGuildId);

  const queryMember =
    members?.find((member) => String(member.id) === memberId) ?? null;

  const [updatedMember, setUpdatedMember] = useState<GuildMember | null>(null);
  const member = updatedMember ?? queryMember;

  const canManageMembers = Boolean(
    accessPolicy?.allows(Permission.ADMIN) ||
    accessPolicy?.allows(Permission.OWNER),
  );

  const [previousMemberId, setPreviousMemberId] = useState(memberId);

  if (previousMemberId !== memberId) {
    setPreviousMemberId(memberId);
    setUpdatedMember(null);
  }

  const handleBack = () => {
    navigate({
      to: "/$guildId/settings/members",
      params: { guildId },
    });
  };

  const handleMemberUpdated = (nextMember: GuildMember | null) => {
    if (!nextMember) {
      handleBack();

      return;
    }

    setUpdatedMember(nextMember);
  };

  if (members && !member) {
    return (
      <SettingsDetailNotFound
        icon={UserRoundX}
        title={t("settings.members.memberNotFound")}
        description={t("settings.members.memberNotFoundDescription")}
        backTo={ROUTES.guild.settings.members(guildId)}
        backLabel={t("settings.members.backToList")}
      />
    );
  }

  // The route has no loader, so this page shows its own loading and failure.
  if (!member) {
    return isError ? (
      <SettingsListError
        title={t("settings.members.empty.loadError")}
        isRetrying={isFetching}
        onRetry={() => void refetch()}
      />
    ) : (
      <MemberSettingsDetailSkeleton />
    );
  }

  const memberColor = getColorFromRole(member.roles);

  const activityStats = memberActivityStatsByDiscordIdAndSource.get(
    member.userId,
  );

  const isOnlineInGame = isMemberOnlineInGame(
    memberGamePresenceByDiscordId,
    member.userId,
  );

  const isOnlineOnWeb = isMemberOnlineOnWeb(
    memberWebPresenceByDiscordId,
    member.userId,
  );

  return (
    <DetailPage
      name={member.name}
      media={
        <MemberAvatar
          userId={member.userId}
          avatar={member.avatar}
          name={member.name}
          imageSize={32}
          className="size-5"
        />
      }
      nameStyle={{ color: memberColor }}
      meta={
        <>
          <MemberAccessBadges
            accessState={getMemberAccessState({
              member,
              isOnline: isOnlineOnWeb || isOnlineInGame,
            })}
            isOnlineOnWeb={isOnlineOnWeb}
            isOnlineInGame={isOnlineInGame}
          />
          <MetaItem
            icon={RefreshCw}
            label={t("settings.members.table.discord")}
          >
            {member.lastDiscordSyncAt
              ? t("settings.members.discordSync.lastConfirmedCompact", {
                  time: getRelativeTime(member.lastDiscordSyncAt),
                })
              : t("settings.members.discordSync.neverSyncedCompact")}
          </MetaItem>
        </>
      }
      actions={
        <>
          <MemberSyncButton
            member={member}
            size="sm"
            variant="outline"
            onMemberUpdated={handleMemberUpdated}
          />
          {canManageMembers && (
            <MemberDeactivationButton
              member={member}
              size="sm"
              onDeactivated={(updatedMember) =>
                handleMemberUpdated(updatedMember)
              }
            />
          )}
        </>
      }
    >
      <OrganizationPresenceStatus guildId={resolvedGuildId} />
      <MemberData
        member={member}
        guildId={guildId}
        webActivityStats={activityStats?.WEB_APP}
        gameActivityStats={activityStats?.GAME}
        isOnlineInGame={isOnlineInGame}
        isOnlineOnWeb={isOnlineOnWeb}
      />
    </DetailPage>
  );
};
