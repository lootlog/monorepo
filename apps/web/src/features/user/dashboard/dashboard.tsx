import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useTranslation } from "react-i18next";
import { MyReservationsCard } from "../reservations/my-reservations-card";
import { DashboardKillSummary } from "./components/dashboard-kill-summary";
import { DashboardLiveFeed } from "./feed/dashboard-live-feed";
import { DashboardActivity } from "./components/dashboard-activity";

export const Dashboard = () => {
  const { t } = useTranslation();
  return (
    <ScrollArea className="h-full min-h-0 [&>[data-slot=scroll-area-viewport]>div]:h-full">
      <div className="@container/dashboard flex min-h-full flex-col gap-3 p-3">
        <h1 className="sr-only">{t("statistics.dashboard")}</h1>
        <DashboardKillSummary />
        <div className="grid flex-1 gap-3 @3xl/dashboard:min-h-0 @3xl/dashboard:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] @3xl/dashboard:grid-rows-[minmax(36rem,1fr)]">
          <DashboardLiveFeed />
          <div className="min-w-0 w-full space-y-3">
            <DashboardActivity />
            <aside
              aria-labelledby="dashboard-my-reservations-title"
              className="min-w-0"
            >
              <MyReservationsCard />
            </aside>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};
