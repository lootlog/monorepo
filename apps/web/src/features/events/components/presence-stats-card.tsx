import { Card } from "@lootlog/ui/components/card";
import { Users, Clock } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@lootlog/ui/components/avatar";
import type { TFunction } from "i18next";
import type { MemberPresenceStat } from "../hooks/queries/use-hero-presence-stats";

interface PresenceStatsCardProps {
  totalCoverageSeconds: number;
  totalEventSeconds: number;
  presencePercentage: number;
  memberStats: MemberPresenceStat[];
  t: TFunction;
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const getPercentageColor = (percentage: number): string => {
  if (percentage >= 80) return "text-green-500";
  if (percentage >= 50) return "text-yellow-500";
  return "text-red-500";
};

const getPercentageBgColor = (percentage: number): string => {
  if (percentage >= 80) return "bg-green-500/10 border-green-500/20";
  if (percentage >= 50) return "bg-yellow-500/10 border-yellow-500/20";
  return "bg-red-500/10 border-red-500/20";
};

export const PresenceStatsCard = ({
  totalCoverageSeconds,
  totalEventSeconds,
  presencePercentage,
  memberStats,
  t,
}: PresenceStatsCardProps) => {
  if (memberStats.length === 0 && totalCoverageSeconds === 0) {
    return null;
  }

  return (
    <Card className="p-3 bg-card/40 backdrop-blur-sm border-border">
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <Users className="w-4 h-4" />
        {t("events.presenceStats.title", "Statystyki obecności")}
      </h3>

      <div className="space-y-3">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`p-2.5 rounded-lg border ${getPercentageBgColor(presencePercentage)}`}
          >
            <div className="text-xs text-muted-foreground mb-0.5">
              {t("events.presenceStats.coverage", "Pokrycie")}
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-lg font-bold ${getPercentageColor(presencePercentage)}`}
              >
                {presencePercentage.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
            <div className="text-xs text-muted-foreground mb-0.5">
              {t("events.presenceStats.totalTime", "Łączny czas")}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold">
                {formatDuration(totalCoverageSeconds)}
              </span>
              <span className="text-xs text-muted-foreground">
                / {formatDuration(totalEventSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Member breakdown */}
        {memberStats.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {t("events.presenceStats.memberBreakdown", "Czas na mapach")}
            </h4>
            <div className="space-y-1">
              {memberStats.slice(0, 10).map((stat) => (
                <div
                  key={stat.memberId}
                  className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="w-5 h-5">
                      {stat.memberAvatar ? (
                        <AvatarImage src={stat.memberAvatar} />
                      ) : (
                        <AvatarFallback className="text-[10px]">
                          {stat.memberName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="truncate max-w-[120px]">
                      {stat.memberName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-mono font-medium">
                      {formatDuration(stat.totalTimeSeconds)}
                    </span>
                    {stat.afkPercentage > 0 && (
                      <span className="text-muted-foreground">
                        ({stat.afkPercentage.toFixed(0)}% AFK)
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {memberStats.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{memberStats.length - 10}{" "}
                  {t("events.presenceStats.more", "więcej")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
