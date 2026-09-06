import {
  calendarOffset,
  calendarRange,
} from "@/components/common/activity-heatmap/activity-calendar";
import type { CSSProperties } from "react";
import "./components/dashboard-activity.css";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { useTranslation } from "react-i18next";

export function DashboardPageSkeleton() {
  const { t } = useTranslation();
  const calendarStyle: CSSProperties & { "--activity-weeks": number } = {
    containerType: "inline-size",
    "--activity-weeks": Math.ceil(
      (112 + calendarOffset(calendarRange(new Date(), 112).from)) / 7,
    ),
  };
  return (
    <ScrollArea className="h-full min-h-0 [&>[data-slot=scroll-area-viewport]>div]:h-full">
      <div
        className="@container/dashboard flex min-h-full flex-col gap-3 p-3"
        role="status"
        aria-label={t("common.loading")}
      >
        <SectionCard>
          <SectionCardContent>
            <Skeleton className="h-20 w-full" />
          </SectionCardContent>
        </SectionCard>
        <div className="grid flex-1 gap-3 @3xl/dashboard:min-h-0 @3xl/dashboard:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] @3xl/dashboard:grid-rows-[minmax(36rem,1fr)]">
          <Skeleton className="h-[36rem] w-full @3xl/dashboard:h-full" />
          <div className="space-y-3">
            <div style={calendarStyle}>
              <Skeleton className="dashboard-activity-content dashboard-activity-placeholder w-full" />
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
