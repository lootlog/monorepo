import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useTranslation } from "react-i18next";
import { MyReservationsCard } from "../reservations/my-reservations-card";
import { DashboardKillSummary } from "./components/dashboard-kill-summary";
import { DashboardLiveFeed } from "./feed/dashboard-live-feed";
import { DashboardActivity } from "./components/dashboard-activity";

export const Dashboard = () => {
  const { t } = useTranslation();
  return (
    <ScrollArea className="h-full min-h-0">
      <div className="@container/dashboard space-y-3 p-3">
        <h1 className="sr-only">{t("statistics.dashboard")}</h1>
        <DashboardKillSummary />
        <div className="grid items-start gap-3 @3xl/dashboard:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
          <div className="min-w-0 w-full space-y-3">
            <DashboardActivity />
            <aside
              aria-labelledby="dashboard-my-reservations-title"
              className="min-w-0"
            >
              <MyReservationsCard />
            </aside>
          </div>
          <DashboardLiveFeed />
        </div>
      </div>
    </ScrollArea>
  );
};
