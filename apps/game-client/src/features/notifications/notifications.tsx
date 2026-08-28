import { DraggableWindow } from "@/components/draggable-window";
import { WindowMaxHeightAction } from "@/components/window-max-height-action";
import { NotificationsList } from "@/features/notifications/components/notifications-list";
import { useNotifications } from "@/features/notifications/hooks/use-notifications";
import { useVisibleNotifications } from "@/features/notifications/hooks/use-visible-notifications";
import { useNotificationsStore } from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNpcTypeColors } from "@/hooks/api/use-settings-documents";

export const Notifications = () => {
  const { t } = useTranslation("notifications");
  const { npcTypeColors } = useNpcTypeColors();
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
  const clearNotifications = useNotificationsStore(
    (state) => state.clearNotifications,
  );
  const [isMaxHeightAdjustmentArmed, setIsMaxHeightAdjustmentArmed] =
    useState(false);
  const resolvedMaxContentHeight =
    storedMaxContentHeight ?? defaultWindowHeight;
  const { notifications: filteredNotifications, settings } =
    useVisibleNotifications({
      autoCleanup: true,
    });

  const handleClose = () => {
    setOpen("notifications", false);
    clearNotifications();
  };

  return (
    <DraggableWindow
      isOpen={open && filteredNotifications.length > 0}
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
      heightMode="css-auto-up-to-max"
      maxContentHeight={resolvedMaxContentHeight}
      isMaxHeightAdjustmentArmed={isMaxHeightAdjustmentArmed}
      onMaxHeightAdjustmentArmedChange={setIsMaxHeightAdjustmentArmed}
      onMaxContentHeightChange={(nextMaxContentHeight) =>
        setMaxContentHeight("notifications", nextMaxContentHeight)
      }
      resizable
      minHeight={64}
      maxHeight={600}
      minWidth={242}
    >
      <NotificationsList
        npcTypeColors={npcTypeColors}
        notifications={filteredNotifications}
        settings={settings}
      />
    </DraggableWindow>
  );
};
