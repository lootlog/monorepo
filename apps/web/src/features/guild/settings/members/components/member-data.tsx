import type { MemberResponseDto as GuildMember } from "@/lib/api/generated/main/model";
import type { MemberActivityStats } from "@/features/guild/settings/members/member-activity-stats-api";
import { Permission } from "@lootlog/types";
import { useTranslation } from "react-i18next";
import { Card } from "@lootlog/ui/components/card";
import { cn } from "@lootlog/ui/lib/utils";
import { PERMISSION_CATEGORIES } from "@/features/guild/settings/roles/constants/permission-categories";
import { Badge } from "@lootlog/ui/components/badge";
import { MemberLootlogConfigCard } from "@/features/guild/settings/members/components/member-lootlog-config-card";
import { MemberSyncButton } from "@/features/guild/settings/members/components/member-sync-button";
import { MemberDeactivationButton } from "@/features/guild/settings/members/components/member-deactivation-button";
import { useSelectorPanel } from "@/components/selector-panel";
import { MemberDiscordSyncCard } from "@/features/guild/settings/members/components/member-discord-sync-card";
import { isMemberOnlineOnWeb } from "@/features/guild/settings/members/member-activity-stats.utils";
import { format } from "date-fns";
import { Activity, Globe2, MousePointerClick } from "lucide-react";

export type MemberDataProps = {
  member: GuildMember;
  canManageMembers: boolean;
  webActivityStats?: MemberActivityStats;
  gameActivityStats?: MemberActivityStats;
  isOnlineInGame?: boolean;
};
const getPermissionStyle = (permission: Permission) => {
  const category = PERMISSION_CATEGORIES.find((cat) =>
    cat.permissions.includes(permission),
  );
  return category
    ? { icon: category.icon, color: category.color, bgColor: category.bgColor }
    : null;
};

export const MemberData = ({
  member,
  canManageMembers,
  webActivityStats,
  gameActivityStats,
  isOnlineInGame = false,
}: MemberDataProps) => {
  const { t } = useTranslation();
  const { setSelectedItem } = useSelectorPanel<GuildMember>();
  const isOnlineOnWeb = isMemberOnlineOnWeb(webActivityStats);
  const isOnline = isOnlineOnWeb || isOnlineInGame;
  const webLastSeenAt = webActivityStats?.lastSeenAt
    ? format(new Date(webActivityStats.lastSeenAt), "yyyy-MM-dd HH:mm")
    : t("settings.members.webActivity.noVisits");
  const gameLastSeenAt = gameActivityStats?.lastSeenAt
    ? format(new Date(gameActivityStats.lastSeenAt), "yyyy-MM-dd HH:mm")
    : t("settings.members.webActivity.noVisits");
  let onlineStatusLabel = t("settings.members.webActivity.offline");

  if (isOnlineOnWeb && isOnlineInGame) {
    onlineStatusLabel = t(
      "settings.members.webActivity.onlineSources.webAndGame",
    );
  } else if (isOnlineOnWeb) {
    onlineStatusLabel = t("settings.members.webActivity.onlineSources.web");
  } else if (isOnlineInGame) {
    onlineStatusLabel = t("settings.members.webActivity.onlineSources.game");
  }

  return (
    <div className="p-3 space-y-3">
      <Card className="bg-card/50 backdrop-blur-sm border-border p-4 gap-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">
                {t("settings.members.actionsTitle")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {member.active
                  ? t("settings.members.statusActiveDescription")
                  : t("settings.members.statusInactiveDescription")}
              </p>
            </div>
            <div>
              <Badge variant={member.active ? "green" : "outline"}>
                {member.active
                  ? t("settings.members.statusActive")
                  : t("settings.members.statusInactive")}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:self-start">
            <MemberSyncButton member={member} />
            {canManageMembers && (
              <MemberDeactivationButton
                member={member}
                onDeactivated={(updatedMember) =>
                  setSelectedItem(updatedMember)
                }
              />
            )}
          </div>
        </div>
        {!member.active && (
          <p className="text-xs text-muted-foreground">
            {t("settings.members.reactivateHint")}
          </p>
        )}
      </Card>

      <MemberDiscordSyncCard member={member} />

      <Card className="bg-card/50 backdrop-blur-sm border-border p-4 gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={cn(
                "rounded-xl p-2.5 shadow-inner shrink-0",
                isOnline
                  ? "bg-emerald-500/10 text-emerald-500 shadow-emerald-500/10"
                  : "bg-muted text-muted-foreground shadow-muted/10",
              )}
            >
              <Globe2 className="size-4" />
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="text-sm font-semibold">
                {t("settings.members.webActivity.title")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("settings.members.webActivity.description")}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 self-start",
              isOnline
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-500"
                : "border-border bg-background/40 text-muted-foreground",
            )}
          >
            {onlineStatusLabel}
          </Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-background/30 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {t("settings.members.webActivity.fields.lastSeenAt")}
            </p>
            <p className="mt-1 break-words text-xs font-medium">
              {webLastSeenAt}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/30 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {t("settings.members.webActivity.fields.lastSeenInGameAt")}
            </p>
            <p className="mt-1 break-words text-xs font-medium">
              {gameLastSeenAt}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/30 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {t("settings.members.webActivity.fields.webVisitCount")}
            </p>
            <p className="mt-1 flex items-center gap-1.5 break-words text-xs font-medium">
              <MousePointerClick className="size-3.5 text-muted-foreground" />
              {t("settings.members.webActivity.visitCount", {
                count: webActivityStats?.visitCount ?? 0,
              })}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/30 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {t("settings.members.webActivity.fields.gameVisitCount")}
            </p>
            <p className="mt-1 flex items-center gap-1.5 break-words text-xs font-medium">
              <MousePointerClick className="size-3.5 text-muted-foreground" />
              {t("settings.members.webActivity.visitCount", {
                count: gameActivityStats?.visitCount ?? 0,
              })}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/30 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {t("settings.members.webActivity.fields.activeWebSessions")}
            </p>
            <p className="mt-1 flex items-center gap-1.5 break-words text-xs font-medium">
              <Activity className="size-3.5 text-muted-foreground" />
              {t("settings.members.webActivity.activeSessions", {
                count: webActivityStats?.activeSessionCount ?? 0,
              })}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/30 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {t("settings.members.webActivity.fields.activeGameSessions")}
            </p>
            <p className="mt-1 flex items-center gap-1.5 break-words text-xs font-medium">
              <Activity className="size-3.5 text-muted-foreground" />
              {t("settings.members.webActivity.activeSessions", {
                count: gameActivityStats?.activeSessionCount ?? 0,
              })}
            </p>
          </div>
        </div>
      </Card>

      <MemberLootlogConfigCard
        member={member}
        canManageMembers={canManageMembers}
      />

      <Card className="bg-card/50 backdrop-blur-sm border-border p-4 gap-1">
        <h3 className="text-sm font-semibold">
          {t("settings.members.rolesTitle")}
        </h3>
        {member.roles.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {t("settings.members.noRoles")}
          </p>
        )}
      </Card>

      {member.roles.map((role) => {
        const roleColor = role.color ?? 0;
        const color =
          roleColor === 0 ? "FFF" : roleColor.toString(16).padStart(6, "0");
        const filteredPermissions = role.permissions.filter(
          (permission) => permission !== "OWNER",
        ) as Permission[];

        return (
          <Card
            key={role.id}
            className="bg-card/50 backdrop-blur-sm border-border overflow-hidden p-0 gap-0"
          >
            <div className="p-3">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `#${color}20` }}
                >
                  <div
                    className="size-4 rounded-full"
                    style={{ backgroundColor: `#${color}` }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-semibold text-sm truncate"
                      style={{ color: `#${color}` }}
                    >
                      {role.name}
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {role.lvlRangeFrom} - {role.lvlRangeTo}
                    </span>
                  </div>
                  {filteredPermissions.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("settings.members.permissionsCount", {
                        count: filteredPermissions.length,
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {filteredPermissions.length > 0 && (
              <div className="border-t border-border/50 divide-y divide-border/50">
                {filteredPermissions.map((permission) => {
                  const style = getPermissionStyle(permission);
                  const IconComponent = style?.icon;

                  return (
                    <div
                      key={permission}
                      className={cn(
                        "flex items-center gap-3 py-2.5 px-4 pl-6",
                        "transition-colors hover:bg-muted/20",
                      )}
                    >
                      {IconComponent ? (
                        <div className={cn("p-1 rounded", style?.bgColor)}>
                          <IconComponent
                            className={cn("size-3", style?.color)}
                          />
                        </div>
                      ) : (
                        <div className="size-5" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {t(`permissions.${permission}`)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
