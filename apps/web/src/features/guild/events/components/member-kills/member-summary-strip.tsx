import { KpiCard } from "@/components/common/kpi-card";
import { RankBadge } from "@/components/common/rank-badge";
import { formatPoints } from "../../utils/format-points";
import { PageHeader } from "@/components/common/page-header";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Clock, Moon, Sparkles, Swords } from "lucide-react";
import type { ReactNode } from "react";
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
  roleColor?: string;
  /** The place in the shown hero's ranking; absent across several heroes. */
  rankingPlace?: { position: number; playerCount: number };
  /** Kills of the shown heroes in the whole event, for the participation share. */
  eventKillCount?: number;
  /** Controls that narrow both the KPIs and the history, such as hero tabs. */
  filters?: ReactNode;
};

/** A thin bar with a caption, for KPIs that are a share of something. */
const ShareDetail = ({ share, label }: { share: number; label: string }) => (
  <span className="flex min-w-0 items-center gap-2">
    <span
      aria-hidden
      className="relative h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-muted"
    >
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-primary"
        style={{ width: `${Math.min(100, Math.max(0, share))}%` }}
      />
    </span>
    <span className="truncate">{label}</span>
  </span>
);

export const MemberSummaryStrip = ({
  member,
  memberId,
  eventName,
  selectedHeroName,
  contextStats,
  roleColor,
  rankingPlace,
  eventKillCount,
  filters,
}: MemberSummaryStripProps) => {
  const { t } = useTranslation();

  const avatarUrl = member
    ? getDiscordAvatarUrl(member.userId, member.avatar ?? null, 128)
    : undefined;

  const participationShare =
    eventKillCount && eventKillCount > 0
      ? Math.round((contextStats.totalKills / eventKillCount) * 100)
      : null;

  const activeShare =
    contextStats.totalKills > 0 ? 100 - contextStats.avgAfkPercentage : null;

  return (
    <>
      <PageHeader
        media={
          <Avatar className="size-14 shrink-0 rounded-xl bg-muted">
            <AvatarImage src={avatarUrl} alt="" />
            <AvatarFallback className="rounded-xl text-lg font-semibold">
              {member?.name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
        }
        title={
          <span style={roleColor ? { color: roleColor } : undefined}>
            {member?.name ?? `#${memberId}`}
          </span>
        }
        description={eventName}
        metadata={
          <>
            {rankingPlace ? (
              <span className="inline-flex items-center gap-1.5">
                <RankBadge rank={rankingPlace.position} className="size-5" />
                {t("events.kills.memberRankingPlace", {
                  count: rankingPlace.playerCount,
                })}
              </span>
            ) : null}
            <EventHeroContext heroName={selectedHeroName} />
          </>
        }
      />
      {filters}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={Swords}
          label={t("events.kills.kpiKills")}
          value={contextStats.totalKills}
          detail={
            participationShare !== null ? (
              <ShareDetail
                share={participationShare}
                label={t("events.kills.kpiShareOfEventKills", {
                  percentage: participationShare,
                })}
              />
            ) : null
          }
        />
        <KpiCard
          icon={Sparkles}
          label={t("events.kills.kpiPoints")}
          value={
            <>
              {formatPoints(contextStats.totalPoints)}
              <span className="ml-1 text-sm font-medium text-primary/75">
                {t("events.common.pointsShort")}
              </span>
            </>
          }
          valueClassName="text-primary"
          detail={t("events.kills.kpiPerKill", {
            value: formatPoints(contextStats.avgPointsPerKill),
          })}
        />
        <KpiCard
          icon={Clock}
          label={t("events.kills.kpiTotalTime")}
          value={formatDurationHuman(contextStats.totalTimeSeconds)}
          detail={t("events.kills.kpiPerKill", {
            value: formatDurationHuman(
              Math.round(contextStats.avgTimePerKillSeconds),
            ),
          })}
        />
        <KpiCard
          icon={Moon}
          label={t("events.kills.kpiAvgAfk")}
          value={formatPercentage(contextStats.avgAfkPercentage)}
          detail={
            activeShare !== null ? (
              <ShareDetail
                share={activeShare}
                label={t("events.kills.kpiActiveShare", {
                  percentage: formatPoints(activeShare),
                })}
              />
            ) : null
          }
        />
      </div>
    </>
  );
};
