import { DashboardActivitySkeleton } from "./dashboard-activity-skeleton";
import { Activity } from "lucide-react";
import { useState, type CSSProperties } from "react";
import "./dashboard-activity.css";
import { useTranslation } from "react-i18next";
import { useKillsControllerGetUserKillActivity } from "@lootlog/client/main";
import { useUsersActivityControllerGetOnline } from "@lootlog/client/activity";
import { AnimatedToggleGroup } from "@/components/ui/animated-toggle-group";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { ActivityHeatmap } from "@/components/common/activity-heatmap/activity-heatmap";
import {
  calendarOffset,
  calendarRange,
} from "@/components/common/activity-heatmap/activity-calendar";
import { StatisticsQueryState } from "@/features/user/statistics/statistics-query-state";

export function DashboardActivity() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"online" | "kills">("online");
  const [range] = useState(() => calendarRange(new Date(), 112));
  const calendarStyle: CSSProperties & { "--activity-weeks": number } = {
    containerType: "inline-size",
    "--activity-weeks": Math.ceil((112 + calendarOffset(range.from)) / 7),
  };
  const online = useUsersActivityControllerGetOnline(range, {
    query: { enabled: mode === "online", staleTime: 60_000 },
  });
  const kills = useKillsControllerGetUserKillActivity(undefined, {
    query: { enabled: mode === "kills", staleTime: 60_000 },
  });
  const isInRange = ({ date }: { date: string }) =>
    date >= range.from && date <= range.to;
  return (
    <SectionCard className="w-full" style={calendarStyle}>
      <SectionCardHeader
        className="shrink-0"
        icon={Activity}
        title={t("statistics.activity")}
        actions={
          <AnimatedToggleGroup
            label={t("statistics.activity")}
            value={mode}
            onValueChange={setMode}
            options={[
              { value: "online", label: t("statistics.online") },
              { value: "kills", label: t("statistics.kills") },
            ]}
          />
        }
      />
      <SectionCardContent className="dashboard-activity-content flex min-h-0 flex-col overflow-y-auto">
        {mode === "online" ? (
          <StatisticsQueryState
            query={online}
            centered
            loading={<DashboardActivitySkeleton />}
          >
            {online.data && (
              <>
                {online.data.status === "stale" && (
                  <p
                    role="status"
                    className="mb-3 text-sm text-muted-foreground"
                  >
                    {t("statistics.onlineStale")}
                  </p>
                )}
                <ActivityHeatmap
                  fill
                  days={online.data.days.filter(isInRange).map((day) => ({
                    date: day.date,
                    value: day.onlineSeconds,
                    partial: day.partial,
                  }))}
                  label={t("statistics.online")}
                  formatValue={(seconds) =>
                    t("statistics.duration", {
                      hours: Math.floor(seconds / 3600),
                      minutes: Math.floor((seconds % 3600) / 60),
                    })
                  }
                />
              </>
            )}
          </StatisticsQueryState>
        ) : (
          <StatisticsQueryState
            query={kills}
            centered
            loading={<DashboardActivitySkeleton />}
          >
            {kills.data && (
              <>
                {kills.data.meta.coverage !== "complete" && (
                  <p
                    role="status"
                    className="mb-3 text-sm text-muted-foreground"
                  >
                    {t("statistics.partialHistory")}
                  </p>
                )}
                <ActivityHeatmap
                  fill
                  days={kills.data.daily.filter(isInRange).map((day) => ({
                    date: day.date,
                    value: day.kills,
                    partial: day.partial,
                  }))}
                  label={t("statistics.kills")}
                  formatValue={(value) =>
                    t("statistics.count", { count: value })
                  }
                />
              </>
            )}
          </StatisticsQueryState>
        )}
      </SectionCardContent>
    </SectionCard>
  );
}
