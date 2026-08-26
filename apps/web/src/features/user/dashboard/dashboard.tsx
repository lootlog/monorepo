import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { DashboardStatisticsPanel } from "./components/dashboard-statistics-panel";
import { MyReservationsCard } from "../reservations/my-reservations-card";

export const Dashboard: React.FC = () => {
  return (
    <ScrollArea className="h-full">
      <div className="@container/dashboard px-3 py-3">
        <div className="grid items-start gap-4 @5xl/dashboard:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
          <DashboardStatisticsPanel />
          <aside
            aria-labelledby="dashboard-my-reservations-title"
            className="min-w-0"
          >
            <MyReservationsCard />
          </aside>
        </div>
      </div>
    </ScrollArea>
  );
};
