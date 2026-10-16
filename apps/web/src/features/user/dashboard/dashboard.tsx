import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useTranslation } from "react-i18next";
import { MyReservationsCard } from "../reservations/my-reservations-card";
import { DashboardLiveFeed } from "./feed/dashboard-live-feed";
import { DashboardRecentBattles } from "./components/dashboard-recent-battles";
import { DashboardActivity } from "./components/dashboard-activity";
import { DashboardToday } from "./components/dashboard-today";
import { DashboardOnboarding } from "./onboarding/dashboard-onboarding";
import { DashboardColumns } from "./dashboard-columns";

export const Dashboard = () => {
  const { t } = useTranslation();

  return (
    <ScrollArea data-under-top-bar className="h-full min-h-0">
      <div className="min-w-0">
        <h1 className="sr-only">{t("statistics.dashboard")}</h1>
        <DashboardOnboarding />
        <DashboardToday />
        <DashboardColumns
          feed={<DashboardLiveFeed />}
          reservations={<MyReservationsCard />}
          aside={
            <>
              <DashboardRecentBattles />
              <DashboardActivity />
            </>
          }
        />
      </div>
    </ScrollArea>
  );
};
