import { ConnectionStatusStrip } from "@/components/connection-status-strip";
import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { IconButton } from "@/components/ui/icon-button";
import { WindowMaxHeightAction } from "@/components/draggable-window/window-max-height-action";
import { NotificationsList } from "@/features/notifications/components/notifications-list";
import { useNotifications } from "@/features/notifications/hooks/use-notifications";
import { useVisibleNotifications } from "@/features/notifications/hooks/use-visible-notifications";
import { useNotificationsStore } from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import { ListX } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNpcTypeColors } from "@/features/settings/persistence/use-appearance-settings";

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

  // Closing only hides the window: notifications stay until they auto-hide,
  // are dismissed or cleared, and the next notification reopens the window
  // with them.
  const handleClose = () => setOpen("notifications", false);

  return (
    <DraggableWindow
      isOpen={open && filteredNotifications.length > 0}
      id="notifications"
      title={t("window.title")}
      actions=<>
        <IconButton label={t("actions.clearAll")} onClick={clearNotifications}>
          <ListX size={14} aria-hidden="true" />
        </IconButton>
        <WindowMaxHeightAction
          currentMaxHeight={resolvedMaxContentHeight}
          isArmed={isMaxHeightAdjustmentArmed}
          onClick={() =>
            setIsMaxHeightAdjustmentArmed((currentValue) => !currentValue)
          }
        />
      </>
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
      {/* A grid, not a flex column: the list's scroll viewport needs the
          definite height of its grid area to stay within the window's max
          height while the status strip takes its row. */}
      <div className="ll:grid ll:max-h-[inherit] ll:grid-rows-[auto_minmax(0,1fr)]">
        <ConnectionStatusStrip hasData={filteredNotifications.length > 0} />
        <div className="ll:row-start-2 ll:min-h-0">
          <NotificationsList
            npcTypeColors={npcTypeColors}
            notifications={filteredNotifications}
            settings={settings}
          />
        </div>
      </div>
    </DraggableWindow>
  );
};
