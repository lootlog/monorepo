import { OrganizationPresenceStatus } from "@/components/common/organization-presence-status";
import { useMemberActivity } from "@/features/guild/settings/members/use-member-activity";
import { MetaItem } from "@/components/common/meta-item";
import { EmptyState } from "@/components/common/empty-state";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { RefreshCw, UserRoundX } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Permission } from "@lootlog/schema/permissions";
import { getColorFromRole } from "@/utils/get-color-from-role";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import {
  useGuildsControllerGetGuildById,
  useMembersControllerGetGuildMembers,
  type MemberResponseDto as GuildMember,
} from "@lootlog/client/main";

import { isMemberOnlineInGame } from "@/features/guild/settings/members/member-game-presence.utils";
import { isMemberOnlineOnWeb } from "@/lib/web-presence";
import { MemberData } from "@/features/guild/settings/members/components/member-data";
import { RefreshStatusProvider } from "@/features/guild/settings/members/contexts/refresh-status-provider";
import { MemberSyncButton } from "@/features/guild/settings/members/components/member-sync-button";
import { MemberDeactivationButton } from "@/features/guild/settings/members/components/member-deactivation-button";
import { getMemberAccessState } from "@/features/guild/settings/members/member-list-item.utils";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { SettingsDetailPage } from "../components/settings-detail-page";
import { MemberAccessBadges } from "./member-access-badges";

const MemberSettingsDetailPageContent = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { guildId, memberId } = useParams({
    from: "/_authenticated/$guildId/settings/members_/$memberId",
  });

  const { data: members } = useMembersControllerGetGuildMembers(
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
      <EmptyState
        icon={UserRoundX}
        title={t("settings.members.memberNotFound")}
        description={t("settings.members.memberNotFoundDescription")}
        className="h-full"
      />
    );
  }

  if (!member) {
    return null;
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
    <SettingsDetailPage
      name={member.name}
      media={
        <Avatar className="size-5 shrink-0 rounded-md" aria-hidden>
          <AvatarImage
            src={getDiscordAvatarUrl(member.userId, member.avatar)}
            alt=""
          />
          <AvatarFallback className="rounded-md text-[10px]">
            {member.name.slice(0, 1)}
          </AvatarFallback>
        </Avatar>
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
    </SettingsDetailPage>
  );
};

export const MemberSettingsDetailPage = () => (
  <RefreshStatusProvider>
    <MemberSettingsDetailPageContent />
  </RefreshStatusProvider>
);
