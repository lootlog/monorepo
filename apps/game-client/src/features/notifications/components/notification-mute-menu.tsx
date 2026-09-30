import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Popover, PopoverContent } from "@/components/ui/popover";
import {
  appendMutedNpc,
  appendMutedPlayer,
  createMutedNpcPreference,
  createMutedPlayerPreference,
} from "@/features/notifications/utils/notification-mutes";
import type { StoredNotification } from "@/store/notifications.store";
import type {
  NotificationMutes,
  NotificationMutesPatch,
} from "@lootlog/schema/user-preferences";
import { BellOff } from "lucide-react";
import { type FC, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type NotificationMuteMenuProps = {
  notification: StoredNotification;
  senderName: string;
  isReady: boolean;
  isPending: boolean;
  mutes: NotificationMutes;
  onUpdateMutes: (mutes: NotificationMutesPatch) => void;
  onOpenChange?: (open: boolean) => void;
  onMuted?: () => void;
};

export const NotificationMuteMenu: FC<NotificationMuteMenuProps> = ({
  notification,
  senderName,
  isReady,
  isPending,
  mutes,
  onUpdateMutes,
  onOpenChange,
  onMuted,
}) => {
  const { t } = useTranslation("notifications");
  const [open, setOpen] = useState(false);
  const muteButtonRef = useRef<HTMLButtonElement>(null);
  const mutedNpc = createMutedNpcPreference(notification);
  const mutedPlayer = createMutedPlayerPreference(notification, senderName);
  const isDisabled = !isReady || isPending;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const handleMutePlayer = () => {
    if (isDisabled) {
      return;
    }

    onUpdateMutes({
      players: appendMutedPlayer(mutes, mutedPlayer),
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

    onUpdateMutes({
      npcs: appendMutedNpc(mutes, mutedNpc),
    });
    onMuted?.();
    handleOpenChange(false);
  };

  const muteButton = (
    <IconButton
      ref={muteButtonRef}
      aria-expanded={open}
      aria-haspopup="menu"
      label={t("actions.muteOptionsAria")}
      disabled={isDisabled}
      onClick={() => handleOpenChange(!open)}
    >
      <BellOff aria-hidden />
    </IconButton>
  );

  if (!open) {
    return muteButton;
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      {muteButton}
      <PopoverContent
        anchor={muteButtonRef}
        align="end"
        className="ll-action-menu ll:w-52 ll:p-0 ll:flex ll:flex-col ll:gap-0 ll:overflow-hidden"
      >
        <Button
          size="xs"
          variant="menu"
          className="ll:h-auto ll:min-h-8 ll:justify-start ll:px-2 ll:py-1.5 ll:text-left ll:leading-4"
          disabled={isDisabled}
          onClick={handleMutePlayer}
        >
          {t("actions.mutePlayer")}
        </Button>
        {mutedNpc ? (
          <Button
            size="xs"
            variant="menu"
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
