import { useGuildId } from "@/hooks/context/use-guild-id";
import { useNotificationsGuildControllerGetGuildJobs } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { refetchGuildJobsWhilePending } from "./notifications-api";
import { NotificationHistoryList } from "./components/notification-history-list";

export const NotificationsHistoryPage = () => {
  const { t } = useTranslation();
  const guildId = useGuildId() ?? "";

  const { data, isLoading, isError, isFetching, refetch } =
    useNotificationsGuildControllerGetGuildJobs(
      { guildId },
      {
        query: {
          enabled: Boolean(guildId),
          refetchInterval: refetchGuildJobsWhilePending,
        },
      },
    );

  return (
    <>
      <h1 className="sr-only">
        {t("settings.notifications.notificationsHistory.title")}
      </h1>
      <NotificationHistoryList
        historyJobs={data?.history ?? []}
        isLoading={isLoading}
        isError={isError && !data}
        isRetrying={isFetching}
        onRetry={() => void refetch()}
      />
    </>
  );
};
