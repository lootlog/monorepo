import type { MemberResponseDto as GuildMember } from "@/lib/api/generated/main/model";
import type { MemberActivityStats } from "@/features/guild/settings/members/member-activity-stats-api";
import type { ReactNode } from "react";
import { Permission } from "@lootlog/types";
import { useTranslation } from "react-i18next";
import { cn } from "@lootlog/ui/lib/utils";
import { PERMISSION_CATEGORIES } from "@/features/guild/settings/roles/constants/permission-categories";
import { Badge } from "@lootlog/ui/components/badge";
import { Card } from "@lootlog/ui/components/card";
import { format } from "date-fns";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Globe2,
  MousePointerClick,
  ShieldCheck,
  UserMinus,
} from "lucide-react";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import {
  getMemberAccessState,
  isMemberProblematic,
} from "@/features/guild/settings/members/member-list-item.utils";
import { getMemberDiscordSyncPresentation } from "@/features/guild/settings/members/member-discord-sync.utils";
import { getColorFromRoleColor } from "@/utils/get-color-from-role";

export type MemberDataProps = {
  member: GuildMember;
  webActivityStats?: MemberActivityStats;
  gameActivityStats?: MemberActivityStats;
  isOnlineOnWeb?: boolean;
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

const formatDateTime = (
  timestamp: string | null | undefined,
  fallback: string,
) => {
  if (!timestamp) {
    return fallback;
  }

  return `${getRelativeTime(timestamp)} (${format(new Date(timestamp), "yyyy-MM-dd HH:mm")})`;
};

const DetailSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <Card className="gap-0 px-4 py-4">
    <section>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  </Card>
);

const DetailField = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="grid grid-cols-[minmax(8rem,0.75fr)_minmax(0,1fr)] gap-3 py-2 text-sm">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="min-w-0 break-words text-xs font-medium">{value}</dd>
  </div>
);

export const MemberData = ({
  member,
  webActivityStats,
  gameActivityStats,
  isOnlineOnWeb = false,
  isOnlineInGame = false,
}: MemberDataProps) => {
  const { t } = useTranslation();
  const isOnline = isOnlineOnWeb || isOnlineInGame;
  const accessState = getMemberAccessState({ member, isOnline });
  const hasProblem = isMemberProblematic(member);
  const syncPresentation = getMemberDiscordSyncPresentation(member);
  const emptyValueLabel = t("settings.members.discordSync.values.notAvailable");
  const webLastSeenAt = formatDateTime(
    webActivityStats?.lastSeenAt,
    emptyValueLabel,
  );
  const gameLastSeenAt = formatDateTime(
    gameActivityStats?.lastSeenAt,
    emptyValueLabel,
  );
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

  const lastActivityLabel = webActivityStats?.lastSeenAt
    ? getRelativeTime(webActivityStats.lastSeenAt)
    : t("settings.members.webActivity.noData");
  const accessSummary = {
    active: {
      label: t("settings.members.access.ok"),
      description: t("settings.members.access.okDescription"),
      icon: ShieldCheck,
      className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-500",
    },
    inactive: {
      label: t("settings.members.access.inactive"),
      description: t("settings.members.access.inactiveDescription"),
      icon: UserMinus,
      className: "border-border bg-background/40 text-muted-foreground",
    },
    online: {
      label: t("settings.members.access.ok"),
      description: t("settings.members.access.onlineDescription"),
      icon: CheckCircle2,
      className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-500",
    },
    problem: {
      label: t("settings.members.access.problem"),
      description: t("settings.members.access.problemDescription"),
      icon: AlertTriangle,
      className: "border-amber-500/25 bg-amber-500/10 text-amber-500",
    },
  }[accessState];
  const AccessIcon = accessSummary.icon;
  const syncRows = [
    {
      label: t("settings.members.discordSync.fields.technicalStatus"),
      value: member.lastDiscordStatus ?? emptyValueLabel,
    },
    {
      label: t("settings.members.discordSync.fields.lastAttemptAt"),
      value: formatDateTime(member.lastDiscordAttemptAt, emptyValueLabel),
    },
    {
      label: t("settings.members.discordSync.fields.lastConfirmedAt"),
      value: formatDateTime(member.lastDiscordSyncAt, emptyValueLabel),
    },
    ...(member.refreshQueued
      ? [
          {
            label: t("settings.members.discordSync.fields.refreshQueue"),
            value: t("settings.members.discordSync.values.queued"),
          },
        ]
      : []),
    ...(member.nextRefreshAt
      ? [
          {
            label: t("settings.members.discordSync.fields.nextRefreshAt"),
            value: formatDateTime(member.nextRefreshAt, emptyValueLabel),
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-full space-y-3 pb-3">
      <Card className="gap-0 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn("gap-1.5", accessSummary.className)}
          >
            <AccessIcon className="size-3.5" />
            {accessSummary.label}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "border-border bg-background/40 text-muted-foreground",
              isOnline &&
                "border-emerald-500/25 bg-emerald-500/10 text-emerald-500",
            )}
          >
            {onlineStatusLabel}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {accessSummary.description}
        </p>
        {(!member.active || hasProblem) && (
          <p className="mt-3 flex items-start gap-2 border-l-2 border-amber-500/60 bg-amber-500/5 px-3 py-2 text-xs text-amber-500">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {member.active
              ? t("settings.members.syncProblemHint")
              : t("settings.members.reactivateHint")}
          </p>
        )}
      </Card>

      <DetailSection title={t("settings.members.access.title")}>
        <dl className="divide-y divide-border/60">
          <DetailField
            label={t("settings.members.access.status")}
            value={
              member.active
                ? t("settings.members.statusActive")
                : t("settings.members.statusInactive")
            }
          />
          <DetailField
            label={t("settings.members.access.discord")}
            value={t(
              `settings.members.discordSync.status.${syncPresentation.copyKey}.title`,
            )}
          />
          <DetailField
            label={t("settings.members.access.lastActivity")}
            value={lastActivityLabel}
          />
          <DetailField
            label={t("settings.members.table.roles")}
            value={member.roles.length}
          />
        </dl>
      </DetailSection>

      <DetailSection title={t("settings.members.discordSync.title")}>
        <dl className="divide-y divide-border/60">
          {syncRows.map((row) => (
            <DetailField key={row.label} label={row.label} value={row.value} />
          ))}
        </dl>
        {member.isStale && (
          <p className="mt-3 flex items-start gap-2 border-l-2 border-amber-500/60 bg-amber-500/5 px-3 py-2 text-xs text-amber-500">
            <Clock3 className="mt-0.5 size-3.5 shrink-0" />
            {t("settings.members.discordSync.staleAccessHint")}
          </p>
        )}
      </DetailSection>

      <DetailSection title={t("settings.members.webActivity.title")}>
        <dl className="divide-y divide-border/60">
          <DetailField
            label={t("settings.members.webActivity.fields.lastSeenAt")}
            value={webLastSeenAt}
          />
          <DetailField
            label={t("settings.members.webActivity.fields.lastSeenInGameAt")}
            value={gameLastSeenAt}
          />
          <DetailField
            label={t("settings.members.webActivity.fields.webVisitCount")}
            value={
              <span className="inline-flex items-center gap-1.5">
                <MousePointerClick className="size-3.5 text-muted-foreground" />
                {webActivityStats?.visitCount ?? 0}
              </span>
            }
          />
          <DetailField
            label={t("settings.members.webActivity.fields.gameVisitCount")}
            value={
              <span className="inline-flex items-center gap-1.5">
                <MousePointerClick className="size-3.5 text-muted-foreground" />
                {gameActivityStats?.visitCount ?? 0}
              </span>
            }
          />
          <DetailField
            label={t("settings.members.webActivity.fields.webStatus")}
            value={
              <span className="inline-flex items-center gap-1.5">
                <Activity className="size-3.5 text-muted-foreground" />
                {isOnlineOnWeb
                  ? t("settings.members.webActivity.onlineSources.web")
                  : t("settings.members.webActivity.offline")}
              </span>
            }
          />
          <DetailField
            label={t("settings.members.webActivity.fields.gameStatus")}
            value={
              <span className="inline-flex items-center gap-1.5">
                <Globe2 className="size-3.5 text-muted-foreground" />
                {isOnlineInGame
                  ? t("settings.members.webActivity.onlineSources.game")
                  : t("settings.members.webActivity.offline")}
              </span>
            }
          />
        </dl>
      </DetailSection>

      <DetailSection title={t("settings.members.rolesTitle")}>
        {member.roles.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("settings.members.noRoles")}
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {member.roles.map((role) => {
              const color = getColorFromRoleColor(role.color);
              const filteredPermissions = role.permissions.filter(
                (permission) => permission !== "OWNER",
              ) as Permission[];

              return (
                <div key={role.id} className="py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: `#${color}` }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="truncate text-sm font-semibold"
                          style={{ color: `#${color}` }}
                        >
                          {role.name}
                        </span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {role.lvlRangeFrom} - {role.lvlRangeTo}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t("settings.members.permissionsCount", {
                          count: filteredPermissions.length,
                        })}
                      </p>
                    </div>
                  </div>
                  {filteredPermissions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 pl-5">
                      {filteredPermissions.map((permission) => {
                        const style = getPermissionStyle(permission);
                        const IconComponent = style?.icon;

                        return (
                          <span
                            key={permission}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/30 px-2 py-1 text-[11px] text-muted-foreground"
                          >
                            {IconComponent && (
                              <IconComponent
                                className={cn("size-3", style?.color)}
                              />
                            )}
                            {t(`permissions.${permission}`)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DetailSection>
    </div>
  );
};
