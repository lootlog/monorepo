import { X } from "lucide-react";
import { useId, type FC, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { WindowActionButton } from "@/components/draggable-window/window-action-button";
import {
  toolbarStripClassName,
  toolbarStripRowClassName,
} from "@/components/ui/toolbar-strip";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { AddTimerForm } from "./add-timer-form";

type AddTimerPanelProps = {
  guildId?: string;
  onClose: () => void;
  className?: string;
};

const ICON_SIZE = 14;

/**
 * Overlay that covers the timers list while the user adds a manual timer. It
 * stays inside the window, so the title bar and the "+" action remain reachable
 * and the target Lootlog is the one the window already shows.
 */
export const AddTimerPanel: FC<AddTimerPanelProps> = ({
  guildId,
  onClose,
  className,
}) => {
  const { t } = useTranslation(["timers", "common"]);
  const titleId = useId();
  const { visibleGuilds } = useLootlogGuilds();
  const guildName = visibleGuilds.find((guild) => guild.id === guildId)?.name;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-labelledby={titleId}
      onKeyDown={handleKeyDown}
      className={cn(
        "ll:absolute ll:inset-0 ll:z-20 ll:flex ll:flex-col ll:overflow-hidden ll:bg-black/90",
        className,
      )}
    >
      <div
        className={cn(
          toolbarStripClassName,
          toolbarStripRowClassName,
          "ll:-mt-px ll:shrink-0 ll:items-center ll:justify-between ll:gap-2 ll:px-2",
        )}
      >
        <span
          id={titleId}
          className="ll:flex ll:min-w-0 ll:items-baseline ll:gap-1.5 ll:text-xs ll:font-semibold ll:text-gray-100"
        >
          {t("timers:window.addTitle")}
          {guildName ? (
            <span className="ll:truncate ll:text-[11px] ll:font-normal ll:text-gray-400">
              {guildName}
            </span>
          ) : null}
        </span>
        <WindowActionButton label={t("common:actions.close")} onClick={onClose}>
          <X size={ICON_SIZE} aria-hidden="true" />
        </WindowActionButton>
      </div>
      <AddTimerForm guildId={guildId} onClose={onClose} />
    </div>
  );
};
