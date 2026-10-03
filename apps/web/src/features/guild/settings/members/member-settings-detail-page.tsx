import { useMemberActivity } from "@/features/guild/settings/members/use-member-activity";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { UserRoundX } from "lucide-react";
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

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 custom-scrollbar [scrollbar-gutter:stable]">
      <PageHeader
        media={
          <Avatar className="size-9 shrink-0 rounded-lg" aria-hidden>
            <AvatarImage
              src={getDiscordAvatarUrl(member.userId, member.avatar)}
              alt=""
            />
            <AvatarFallback className="rounded-lg">
              {member.name.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
        }
        title={<span style={{ color: memberColor }}>{member.name}</span>}
        description={t("settings.members.details")}
        actions={
          <>
            <MemberSyncButton
              member={member}
              variant="secondary"
              onMemberUpdated={handleMemberUpdated}
            />
            {canManageMembers && (
              <MemberDeactivationButton
                member={member}
                onDeactivated={(updatedMember) =>
                  handleMemberUpdated(updatedMember)
                }
              />
            )}
          </>
        }
      />
      <ScrollArea className="min-h-48 flex-1">
        <div className="mx-auto w-full">
          <MemberData
            member={member}
            webActivityStats={
              memberActivityStatsByDiscordIdAndSource.get(member.userId)
                ?.WEB_APP
            }
            gameActivityStats={
              memberActivityStatsByDiscordIdAndSource.get(member.userId)?.GAME
            }
            isOnlineInGame={isMemberOnlineInGame(
              memberGamePresenceByDiscordId,
              member.userId,
            )}
            isOnlineOnWeb={isMemberOnlineOnWeb(
              memberWebPresenceByDiscordId,
              member.userId,
            )}
          />
        </div>
      </ScrollArea>
    </div>
  );
};

export const MemberSettingsDetailPage = () => (
  <RefreshStatusProvider>
    <MemberSettingsDetailPageContent />
  </RefreshStatusProvider>
);
