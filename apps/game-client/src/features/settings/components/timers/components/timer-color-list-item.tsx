import { SettingsColorRow } from "@/components/settings/settings-color-row";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { alphaToHex, type ColorEditData } from "./color-utils";
import { TimerColorActionsPopover } from "./timer-color-actions-popover";
import { TimerColorQuickPopover } from "./timer-color-quick-popover";

type TimerColorListItemProps = {
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
    <SettingsColorRow
      name={data.name}
      borderColor={data.borderColor}
      backgroundColor={`${data.backgroundColor}${alphaToHex(
        data.backgroundAlpha,
      )}`}
      modified={isModified}
      modifiedLabel={t("settings.timers.colors.modified")}
      editLabel={`${t("settings.timers.colors.editColorAria")}: ${data.name}`}
      editTrigger={(trigger) => (
        <TimerColorQuickPopover
          data={data}
          open={openPopover === quickPopoverKey}
          onOpenChange={(open) =>
            onOpenPopoverChange(open ? quickPopoverKey : null)
          }
          onCommit={onCommit}
        >
          {trigger}
        </TimerColorQuickPopover>
      )}
    >
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
    </SettingsColorRow>
  );
};
