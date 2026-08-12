import { useTranslation } from "react-i18next";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { cn } from "@lootlog/ui/lib/utils";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { formatDurationHuman } from "../../utils/format-duration";
import {
  type MemberIdentity,
  type MemberStatsSummary,
  formatPercentage,
  formatPoints,
} from "./member-kills-view-model";

type MemberSummaryStripProps = {
  member?: MemberIdentity;
  memberId?: string;
  eventName: string;
  selectedHeroName?: string;
  contextStats: MemberStatsSummary;
};

export const MemberSummaryStrip = ({
  member,
  memberId,
  eventName,
  selectedHeroName,
  contextStats,
}: MemberSummaryStripProps) => {
  const { t } = useTranslation();
  const avatarUrl = member
    ? getDiscordAvatarUrl(member.userId, member.avatar ?? null, 96)
    : undefined;
  const metrics = [
    {
      label: t("events.kills.kpiKills"),
      value: contextStats.totalKills,
    },
    {
      label: t("events.kills.kpiPoints"),
      value: formatPoints(contextStats.totalPoints),
      valueClassName: "text-primary",
    },
    {
      label: t("events.kills.kpiTotalTime"),
      value: formatDurationHuman(contextStats.totalTimeSeconds),
    },
    {
      label: t("events.kills.kpiAvgAfk"),
      value: formatPercentage(contextStats.avgAfkPercentage),
    },
    {
      label: t("events.kills.kpiAvgPointsPerKill"),
      value: formatPoints(contextStats.avgPointsPerKill),
    },
    {
      label: t("events.kills.kpiAvgTimePerKill"),
      value: formatDurationHuman(
        Math.round(contextStats.avgTimePerKillSeconds),
      ),
    },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card">
      <div className="flex min-w-0 items-center gap-3 p-3 md:px-4">
        <Avatar className="size-10 shrink-0 rounded-xl bg-muted ring-1 ring-border/70">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="rounded-xl text-sm">
            {member?.name?.[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium leading-none text-muted-foreground">
            {t("events.kills.memberStatsTitle")}
          </p>
          <h1 className="mt-1 truncate text-base font-semibold leading-none">
            {member?.name ?? `#${memberId}`}
          </h1>
          <p className="mt-1 truncate text-xs leading-none text-muted-foreground">
            {selectedHeroName ? `${selectedHeroName} · ` : ""}
            {eventName}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-3 border-t border-border/70 bg-muted/20 md:grid-cols-6">
        {metrics.map((metric, metricIndex) => (
          <div
            key={metric.label}
            className={cn(
              "min-w-0 border-border/70 px-3 py-2.5",
              metricIndex % 3 !== 0 && "border-l",
              metricIndex >= 3 && "border-t",
              "md:border-l md:border-t-0 md:first:border-l-0",
            )}
          >
            <dt className="truncate text-[11px] leading-tight text-muted-foreground">
              {metric.label}
            </dt>
            <dd
              className={cn(
                "mt-1 truncate text-base font-semibold leading-none tabular-nums",
                metric.valueClassName,
              )}
            >
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
