import { ActivityLogsFilters } from "./components/activity-logs-filters";
import { ActivityLogsList } from "./components/activity-logs-list";

export const ActivityLogs: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col">
      <ActivityLogsFilters />
      <ActivityLogsList />
    </div>
  );
};
