import { KpiCard } from "@/components/common/kpi-card";
import { formatPoints } from "../../utils/format-points";
import { PageHeader } from "@/components/common/page-header";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import {
  Clock,
  Gauge,
  Moon,
  Sparkles,
  Swords,
  Timer,
  UserRound,
} from "lucide-react";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { formatDurationHuman } from "../../utils/format-duration";
import { EventHeroContext } from "../shared/event-hero-context";
import {
  type MemberIdentity,
  type MemberStatsSummary,
  formatPercentage,
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
      icon: Swords,
      label: t("events.kills.kpiKills"),
      value: contextStats.totalKills,
    },
    {
      icon: Sparkles,
      label: t("events.kills.kpiPoints"),
      value: formatPoints(contextStats.totalPoints),
    },
    {
      icon: Clock,
      label: t("events.kills.kpiTotalTime"),
      value: formatDurationHuman(contextStats.totalTimeSeconds),
    },
    {
      icon: Moon,
      label: t("events.kills.kpiAvgAfk"),
      value: formatPercentage(contextStats.avgAfkPercentage),
    },
    {
      icon: Gauge,
      label: t("events.kills.kpiAvgPointsPerKill"),
      value: formatPoints(contextStats.avgPointsPerKill),
    },
    {
      icon: Timer,
      label: t("events.kills.kpiAvgTimePerKill"),
      value: formatDurationHuman(
        Math.round(contextStats.avgTimePerKillSeconds),
      ),
    },
  ];

  return (
    <>
      <PageHeader
        icon={UserRound}
        title={member?.name ?? `#${memberId}`}
        description={eventName}
        metadata={
          <>
            <span className="inline-flex items-center gap-1.5">
              <Avatar className="size-4 rounded-full bg-muted">
                <AvatarImage src={avatarUrl} alt="" />
                <AvatarFallback className="text-[9px]">
                  {member?.name?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              {t("events.kills.memberStatsTitle")}
            </span>
            <EventHeroContext heroName={selectedHeroName} />
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => (
          <KpiCard
            key={metric.label}
            icon={metric.icon}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </div>
    </>
  );
};
