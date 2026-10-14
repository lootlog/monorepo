import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getNotificationsGuildControllerGetGuildJobsQueryKey,
  useNotificationsGuildControllerGetGuildJobs,
} from "@lootlog/client/main";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useTranslation } from "react-i18next";
import { NotificationHistoryList } from "./components/notification-history-list";
import { NotificationsTabs } from "./components/notifications-tabs";

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
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">
        {t("settings.notifications.notificationsHistory.title")}
      </h1>
      <ScrollArea data-under-top-bar className="min-h-0 flex-1">
        <NotificationsTabs />
        <div>
          <NotificationHistoryList
            historyJobs={data?.history ?? []}
            isLoading={isLoading}
          />
        </div>
      </ScrollArea>
    </div>
  );
};
