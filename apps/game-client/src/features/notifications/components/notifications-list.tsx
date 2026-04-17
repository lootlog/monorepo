import { ScrollArea } from "@/components/ui/scroll-area";
import { SingleNotification } from "@/features/notifications/components/single-notification";
import { getGuildNamesById, useGuilds } from "@/hooks/api/use-guilds";
import { AnimatePresence, motion } from "framer-motion";
import {
  type StoredNotification,
  useNotificationsStore,
} from "@/store/notifications.store";
import { type FC, useLayoutEffect, useRef } from "react";

type NotificationsListProps = {
  notifications?: StoredNotification[];
};

export const NotificationsList: FC<NotificationsListProps> = ({
  notifications,
}) => {
  const { data: guilds } = useGuilds();
  const guildNamesById = getGuildNamesById(guilds);
  const notificationsCount = notifications?.length ?? 0;
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const activeNotificationAnimations = useNotificationsStore(
    (state) => state.activeNotificationAnimations,
  );
  const latestNotificationAnimationCycle = useNotificationsStore(
    (state) => state.latestNotificationAnimationCycle,
  );

  useLayoutEffect(() => {
    if (latestNotificationAnimationCycle === 0) return;
    scrollViewportRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [latestNotificationAnimationCycle]);

  return (
    <ScrollArea
      ref={scrollViewportRef}
      className="ll:h-full ll:w-full ll:box-border"
      type="hover"
    >
      <motion.div
        layout
        className="ll:flex ll:w-full ll:flex-col ll:gap-1 ll:pt-1"
      >
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
                  notificationAnimationCycle={
                    activeNotificationAnimations[notification.listKey] ?? null
                  }
                  guildNamesById={guildNamesById}
                  showCloseButton={notificationsCount > 1}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </ScrollArea>
  );
};
