import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { WindowMaxHeightAction } from "@/components/window-max-height-action";
import { NotificationsList } from "@/features/notifications/components/notifications-list";
import { useNotifications } from "@/features/notifications/hooks/use-notifications";
import { useVisibleNotifications } from "@/features/notifications/hooks/use-visible-notifications";
import { useNotificationsStore } from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const Notifications = () => {
  const { t } = useTranslation("notifications");
  useNotifications();
  const open = useWindowsStore((state) => state.notifications.open);
  const defaultWindowHeight = useWindowsStore(
    (state) => state.notifications.size.height,
  );
  const storedMaxContentHeight = useWindowsStore(
    (state) => state.notifications.maxContentHeight,
  );
  const setOpen = useWindowsStore((state) => state.setOpen);
  const setMaxContentHeight = useWindowsStore(
    (state) => state.setMaxContentHeight,
  );
  const { clearNotifications } = useNotificationsStore();
  const [isMaxHeightAdjustmentArmed, setIsMaxHeightAdjustmentArmed] =
    useState(false);
  const [resolvedMaxContentHeight, setResolvedMaxContentHeight] = useState(
    storedMaxContentHeight ?? defaultWindowHeight,
  );
  const { notifications: filteredNotifications } = useVisibleNotifications({
    autoCleanup: true,
  });

  useEffect(() => {
    if (storedMaxContentHeight === undefined) {
      return;
    }

    setResolvedMaxContentHeight(storedMaxContentHeight);
  }, [storedMaxContentHeight]);

  const handleClose = () => {
    setOpen("notifications", false);
    clearNotifications();
  };

  return (
    <AnimatedWindow
      isOpen={open && filteredNotifications.length > 0}
      windowKey="notifications"
    >
      <DraggableWindow
        id="notifications"
        title={t("window.title")}
        actions=<WindowMaxHeightAction
          currentMaxHeight={resolvedMaxContentHeight}
          isArmed={isMaxHeightAdjustmentArmed}
          onClick={() =>
            setIsMaxHeightAdjustmentArmed((currentValue) => !currentValue)
          }
        />
        onClose={handleClose}
        heightMode="auto-up-to-max"
        maxContentHeight={storedMaxContentHeight}
        isMaxHeightAdjustmentArmed={isMaxHeightAdjustmentArmed}
        onMaxHeightAdjustmentArmedChange={setIsMaxHeightAdjustmentArmed}
        onMaxContentHeightChange={(nextMaxContentHeight) =>
          setMaxContentHeight("notifications", nextMaxContentHeight)
        }
        onResolvedMaxContentHeightChange={setResolvedMaxContentHeight}
        resizable
        minHeight={64}
        maxHeight={600}
        minWidth={242}
      >
        <div className="ll:flex ll:h-full ll:w-full ll:flex-col ll:overflow-hidden">
          <NotificationsList notifications={filteredNotifications} />
        </div>
      </DraggableWindow>
    </AnimatedWindow>
  );
};
