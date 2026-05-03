import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  appendMutedNpc,
  appendMutedPlayer,
  createMutedNpcPreference,
  createMutedPlayerPreference,
} from "@/features/notifications/utils/notification-mutes";
import { useUpdateUserPreferences } from "@/hooks/api/use-user-preferences";
import { useCurrentUserNotificationMutes } from "@/hooks/use-current-user-notification-mutes";
import type { StoredNotification } from "@/store/notifications.store";
import { BellOff } from "lucide-react";
import { type FC, useState } from "react";
import { useTranslation } from "react-i18next";

type NotificationMuteMenuProps = {
  notification: StoredNotification;
  senderName: string;
  onOpenChange?: (open: boolean) => void;
  onMuted?: () => void;
};

export const NotificationMuteMenu: FC<NotificationMuteMenuProps> = ({
  notification,
  senderName,
  onOpenChange,
  onMuted,
}) => {
  const { t } = useTranslation("notifications");
  const [open, setOpen] = useState(false);
  const { isReady, mutes } = useCurrentUserNotificationMutes();
  const updateUserPreferences = useUpdateUserPreferences();
  const mutedNpc = createMutedNpcPreference(notification);
  const mutedPlayer = createMutedPlayerPreference(notification, senderName);
  const isDisabled = !isReady || updateUserPreferences.isPending;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const handleMutePlayer = () => {
    if (isDisabled) {
      return;
    }

    updateUserPreferences.mutate({
      mutes: {
        players: appendMutedPlayer(mutes, mutedPlayer),
      },
    });
    onMuted?.();
    handleOpenChange(false);
  };

  const handleMuteNpc = () => {
    if (isDisabled) {
      return;
    }

    if (!mutedNpc) {
      handleOpenChange(false);
      return;
    }

    updateUserPreferences.mutate({
      mutes: {
        npcs: appendMutedNpc(mutes, mutedNpc),
      },
    });
    onMuted?.();
    handleOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              aria-label={t("actions.muteOptionsAria")}
              disabled={isDisabled}
              className="ll:size-7 ll:px-0"
            >
              <BellOff size={12} />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">
          {t("actions.muteOptionsAria")}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        className="ll:w-52 ll:p-1 ll:flex ll:flex-col ll:gap-1"
      >
        <Button
          className="ll:h-auto ll:min-h-8 ll:justify-start ll:px-2 ll:py-1.5 ll:text-left ll:leading-4"
          disabled={isDisabled}
          onClick={handleMutePlayer}
        >
          {t("actions.mutePlayer")}
        </Button>
        {mutedNpc ? (
          <Button
            className="ll:h-auto ll:min-h-8 ll:justify-start ll:px-2 ll:py-1.5 ll:text-left ll:leading-4"
            disabled={isDisabled}
            onClick={handleMuteNpc}
          >
            {t("actions.muteNpc")}
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};
