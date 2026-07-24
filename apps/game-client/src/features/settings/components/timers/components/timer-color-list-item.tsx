import { TimerTileView } from "@/features/timers/components/timer-tile-view";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import type { ColorEditData } from "./color-utils";
import { TimerColorActionsPopover } from "./timer-color-actions-popover";
import { TimerColorQuickPopover } from "./timer-color-quick-popover";

type TimerColorListItemProps = {
  color?: string;
  customBackgroundColor?: string;
  customBorderColor?: string;
  data: ColorEditData;
  isDefault: boolean;
  isModified: boolean;
  itemKey: string;
  openPopover: string | null;
  onOpenPopoverChange: (popover: string | null) => void;
  onCommit: (data: ColorEditData) => void;
  onNameCommit: (name: string) => void;
  onReset: () => void;
  onDelete: () => void;
};

export const TimerColorListItem: FC<TimerColorListItemProps> = ({
  color,
  customBackgroundColor,
  customBorderColor,
  data,
  isDefault,
  isModified,
  itemKey,
  openPopover,
  onOpenPopoverChange,
  onCommit,
  onNameCommit,
  onReset,
  onDelete,
}) => {
  const { t } = useTranslation();
  const quickPopoverKey = `${itemKey}:quick`;
  const actionsPopoverKey = `${itemKey}:actions`;

  return (
    <div className="ll:flex ll:min-w-0 ll:items-center ll:gap-1.5 ll:rounded-sm ll:border ll:border-solid ll:border-gray-500/40 ll:bg-black/15 ll:p-1.5">
      <TimerColorQuickPopover
        data={data}
        open={openPopover === quickPopoverKey}
        onOpenChange={(open) =>
          onOpenPopoverChange(open ? quickPopoverKey : null)
        }
        onCommit={onCommit}
      >
        <button
          type="button"
          className="ll:flex ll:min-w-0 ll:flex-1 ll:appearance-none ll:items-center ll:gap-2 ll:rounded-sm ll:border-0 ll:bg-transparent ll:p-0 ll:text-left ll:outline-none focus-visible:ll:ring-1 focus-visible:ll:ring-purple-400 ll-custom-cursor-pointer"
          aria-label={`${t("settings.timers.colors.editColorAria")}: ${data.name}`}
        >
          <span className="ll:w-20 ll:shrink-0">
            <TimerTileView
              color={color}
              customBorderColor={customBorderColor}
              customBackgroundColor={customBackgroundColor}
              displayMode="row"
              fontSize={9}
              label="NPC"
              timeLabel="04:32"
            />
          </span>
          <span className="ll:min-w-0 ll:flex-1 ll:truncate ll:text-xs ll:text-white">
            {data.name}
          </span>
          {isModified ? (
            <span
              className="ll:size-1.5 ll:shrink-0 ll:rounded-full ll:bg-purple-400"
              title={t("settings.timers.colors.modified")}
            />
          ) : null}
        </button>
      </TimerColorQuickPopover>

      <TimerColorActionsPopover
        isDefault={isDefault}
        isModified={isModified}
        name={data.name}
        open={openPopover === actionsPopoverKey}
        onOpenChange={(open) =>
          onOpenPopoverChange(open ? actionsPopoverKey : null)
        }
        onNameCommit={onNameCommit}
        onReset={onReset}
        onDelete={onDelete}
      />
    </div>
  );
};
