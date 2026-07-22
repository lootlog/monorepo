import { Button } from "@/components/ui/button";
import { Popover, PopoverContent } from "@/components/ui/popover";
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
import type { StoredNotification } from "@/store/notifications.store";
import type { NotificationMutes, NotificationMutesPatch } from "@lootlog/types";
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
    <Button
      ref={muteButtonRef}
      variant="ghost"
      aria-expanded={open}
      aria-haspopup="menu"
      aria-label={t("actions.muteOptionsAria")}
      disabled={isDisabled}
      className="ll:size-7 ll:px-0"
      onClick={() => handleOpenChange(!open)}
    >
      <BellOff size={12} />
    </Button>
  );

  if (!open) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{muteButton}</TooltipTrigger>
        <TooltipContent side="top">
          {t("actions.muteOptionsAria")}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>{muteButton}</TooltipTrigger>
        <TooltipContent side="top">
          {t("actions.muteOptionsAria")}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        anchor={muteButtonRef}
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
