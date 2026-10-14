import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getNotificationsGuildControllerGetGuildJobsQueryKey,
  useNotificationsGuildControllerGetGuildJobs,
} from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { NotificationHistoryList } from "./components/notification-history-list";

export const NotificationsHistoryPage = () => {
  const { t } = useTranslation();
  const guildId = useGuildId() ?? "";

  const { data, isLoading } = useNotificationsGuildControllerGetGuildJobs(
    { guildId },
    {
      query: {
        enabled: Boolean(guildId),
        queryKey: getNotificationsGuildControllerGetGuildJobsQueryKey({
          guildId,
        }),
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
      />
    </>
  );
};
