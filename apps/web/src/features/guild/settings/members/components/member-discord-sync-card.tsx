import type { MemberResponseDto as GuildMember } from "@lootlog/api-client/models/main/member-response-dto";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { Badge } from "@lootlog/ui/components/badge";
import { Card } from "@lootlog/ui/components/card";
import { cn } from "@lootlog/ui/lib/utils";
import { format } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Info,
} from "lucide-react";
import { type FC } from "react";
import { useTranslation } from "react-i18next";
import {
  getMemberDiscordSyncPresentation,
  type MemberDiscordSyncTone,
} from "../member-discord-sync.utils";

export type MemberDiscordSyncCardProps = {
  member: GuildMember;
};

const iconContainerClassNames: Record<MemberDiscordSyncTone, string> = {
  success: "bg-emerald-500/10 text-emerald-500",
  warning: "bg-amber-500/10 text-amber-500",
  danger: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

const badgeClassNames: Record<MemberDiscordSyncTone, string> = {
  success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-500",
  warning: "border-amber-500/25 bg-amber-500/10 text-amber-500",
  danger: "border-destructive/25 bg-destructive/10 text-destructive",
  neutral: "border-border bg-background text-muted-foreground",
};

const iconByTone = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
  neutral: Info,
} satisfies Record<MemberDiscordSyncTone, typeof Info>;

const formatSyncTimestamp = (
  timestamp: string | null | undefined,
  emptyLabel: string,
) => {
  if (!timestamp) {
    return emptyLabel;
  }

  return `${getRelativeTime(timestamp)} (${format(new Date(timestamp), "yyyy-MM-dd HH:mm")})`;
};

export const MemberDiscordSyncCard: FC<MemberDiscordSyncCardProps> = ({
  member,
}) => {
  const { t } = useTranslation();
  const presentation = getMemberDiscordSyncPresentation(member);
  const Icon = iconByTone[presentation.tone];
  const emptyValueLabel = t("settings.members.discordSync.values.notAvailable");

  const rows = [
    {
      label: t("settings.members.discordSync.fields.technicalStatus"),
      value: member.lastDiscordStatus ?? emptyValueLabel,
    },
    {
      label: t("settings.members.discordSync.fields.lastAttemptAt"),
      value: formatSyncTimestamp(member.lastDiscordAttemptAt, emptyValueLabel),
    },
    {
      label: t("settings.members.discordSync.fields.lastConfirmedAt"),
      value: formatSyncTimestamp(member.lastDiscordSyncAt, emptyValueLabel),
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
            value: formatSyncTimestamp(member.nextRefreshAt, emptyValueLabel),
          },
        ]
      : []),
  ];

  return (
    <Card className="bg-card  border-border p-4 gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "rounded-xl p-2.5  shrink-0",
              iconContainerClassNames[presentation.tone],
            )}
          >
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm font-semibold">
              {t("settings.members.discordSync.title")}
            </h3>
            <p className="text-xs font-medium">
              {t(
                `settings.members.discordSync.status.${presentation.copyKey}.title`,
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(
                `settings.members.discordSync.status.${presentation.copyKey}.description`,
              )}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 self-start",
            badgeClassNames[presentation.tone],
          )}
        >
          {t(`settings.members.discordSync.badges.${presentation.badgeKey}`)}
        </Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-lg border border-border/60 bg-background px-3 py-2"
          >
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {row.label}
            </p>
            <p className="mt-1 break-words text-xs font-medium">{row.value}</p>
          </div>
        ))}
      </div>

      {member.isStale && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-500">
          <Clock3 className="mt-0.5 size-3.5 shrink-0" />
          <p>{t("settings.members.discordSync.staleAccessHint")}</p>
        </div>
      )}
    </Card>
  );
};
