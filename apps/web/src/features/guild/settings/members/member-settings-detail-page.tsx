import { Button } from "@lootlog/ui/components/button";
import { Avatar, AvatarImage } from "@lootlog/ui/components/avatar";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, UserRoundX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Permission } from "@lootlog/types";
import { getColorFromRole } from "@/utils/get-color-from-role";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useGuildsControllerGetGuildById } from "@lootlog/api-client/react-query/main/guilds";
import { useMembersControllerGetGuildMembers } from "@lootlog/api-client/react-query/main/members";
import type { MemberResponseDto as GuildMember } from "@lootlog/api-client/models/main/member-response-dto";
import { memberActivityStatsQueryOptions } from "@/features/guild/settings/members/member-activity-stats-api";
import { mapMemberActivityStatsByDiscordIdAndSource } from "@/features/guild/settings/members/member-activity-stats.utils";
import {
  isMemberOnlineInGame,
  resolveMemberPresenceGuildId,
} from "@/features/guild/settings/members/member-game-presence.utils";
import { isMemberOnlineOnWeb } from "@/features/guild/settings/members/member-web-presence.utils";
import { useMemberGamePresence } from "@/features/guild/settings/members/use-member-game-presence";
import { useMemberWebPresence } from "@/features/guild/settings/members/use-member-web-presence";
import { MemberData } from "@/features/guild/settings/members/components/member-data";
import { RefreshStatusProvider } from "@/features/guild/settings/members/contexts/refresh-status-context";
import { MemberSyncButton } from "@/features/guild/settings/members/components/member-sync-button";
import { MemberDeactivationButton } from "@/features/guild/settings/members/components/member-deactivation-button";
import { Card } from "@lootlog/ui/components/card";

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
  const { data: permissions } = useGuildPermissions();
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
  const queryMember = useMemo(
    () => members?.find((member) => String(member.id) === memberId) ?? null,
    [memberId, members],
  );
  const [updatedMember, setUpdatedMember] = useState<GuildMember | null>(null);
  const member = updatedMember ?? queryMember;
  const canManageMembers = Boolean(
    permissions?.includes(Permission.ADMIN) ||
    permissions?.includes(Permission.OWNER),
  );

  useEffect(() => {
    setUpdatedMember(null);
  }, [memberId]);

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
      <div className="flex h-full min-h-0 flex-col bg-background">
        <header className="shrink-0 border-b border-border bg-background px-4 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="size-4" />
            {t("settings.members.backToMembers")}
          </Button>
        </header>
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div className="max-w-sm text-muted-foreground">
            <UserRoundX className="mx-auto mb-3 size-10 opacity-50" />
            <p className="text-sm font-medium text-foreground">
              {t("settings.members.memberNotFound")}
            </p>
            <p className="mt-1 text-xs">
              {t("settings.members.memberNotFoundDescription")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!member) {
    return null;
  }

  const memberColor = getColorFromRole(member.roles);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 bg-background px-3">
      <Card className="shrink-0 border-b border-t border-border px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleBack}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <Avatar className="size-10 shrink-0 rounded-lg">
              <AvatarImage
                src={getDiscordAvatarUrl(member.userId, member.avatar)}
              />
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {t("settings.members.details")}
              </p>
              <h2
                className="truncate text-base font-semibold leading-tight"
                style={{ color: `#${memberColor}` }}
              >
                {member.name}
              </h2>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 pl-12 sm:pl-0">
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
          </div>
        </div>
      </Card>
      <ScrollArea className="min-h-0 flex-1">
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
