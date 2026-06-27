import { ScrollArea } from "@/components/ui/scroll-area";
import { SingleNotification } from "@/features/notifications/components/single-notification";
import { getGuildNamesById } from "@/lib/api/generated-helpers";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@/lib/api/generated/main/users/users";
import { AnimatePresence, motion } from "framer-motion";
import {
  type StoredNotification,
  useNotificationsStore,
} from "@/store/notifications.store";
import { useSettingsStore } from "@/store/settings.store";
import { type FC, useLayoutEffect, useRef } from "react";

type NotificationsListProps = {
  notifications?: StoredNotification[];
};

export const NotificationsList: FC<NotificationsListProps> = ({
  notifications,
}) => {
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds({
    query: {
      queryKey: getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      refetchOnMount: false,
      staleTime: 1000 * 60 * 5,
    },
  });
  const guildNamesById = getGuildNamesById(guilds);
  const notificationsCount = notifications?.length ?? 0;
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const latestNotificationAnimationCycle = useNotificationsStore(
    (state) => state.latestNotificationAnimationCycle,
  );
  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );

  useLayoutEffect(() => {
    if (latestNotificationAnimationCycle === 0) return;
    scrollViewportRef.current?.scrollTo({
      top: 0,
      behavior: animationEffectsEnabled ? "smooth" : "auto",
    });
  }, [animationEffectsEnabled, latestNotificationAnimationCycle]);

  return (
    <ScrollArea
      ref={scrollViewportRef}
      className="ll:h-full ll:w-full ll:box-border"
      type="hover"
    >
      {animationEffectsEnabled ? (
        <motion.div className="ll:flex ll:w-full ll:flex-col ll:gap-1 ll:pt-1">
          <AnimatePresence initial={false}>
            {notifications?.map((notification) => {
              return (
                <motion.div
                  key={notification.listKey}
                  layout="position"
                  className="ll:w-full"
                  exit={{
                    opacity: 0,
                    y: -16,
                    scale: 0.98,
                  }}
                  transition={{
                    layout: {
                      type: "spring",
                      stiffness: 420,
                      damping: 32,
                      mass: 0.72,
                    },
                    opacity: { duration: 0.18 },
                  }}
                >
                  <SingleNotification
                    notification={notification}
                    guildNamesById={guildNamesById}
                    showCloseButton={notificationsCount > 1}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="ll:flex ll:w-full ll:flex-col ll:gap-1 ll:pt-1">
          {notifications?.map((notification) => {
            return (
              <div key={notification.listKey} className="ll:w-full">
                <SingleNotification
                  notification={notification}
                  guildNamesById={guildNamesById}
                  showCloseButton={notificationsCount > 1}
                />
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea>
  );
};
