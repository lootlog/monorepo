import { SettingsColorRow } from "@/components/settings/settings-color-row";
import { SettingsIconButton } from "@/components/settings/settings-icon-button";
import { RotateCcw, Trash2 } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { alphaToHex, type ColorEditData } from "./color-utils";
import { TimerColorEditorPopover } from "./timer-color-editor-popover";
import { TimerColorPreviewChip } from "./timer-color-preview-chip";

type TimerColorListItemProps = {
  data: ColorEditData;
  isDefault: boolean;
  isModified: boolean;
  itemKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: ColorEditData) => void;
  onCommit: (draft: ColorEditData) => void;
  onReset: () => void;
  onDelete: () => void;
};

export const TimerColorListItem: FC<TimerColorListItemProps> = ({
  data,
  isDefault,
  isModified,
  itemKey,
  open,
  onOpenChange,
  onDraftChange,
  onCommit,
  onReset,
  onDelete,
}) => {
  const { t } = useTranslation();

  const backgroundColor = `${data.backgroundColor}${alphaToHex(
    data.backgroundAlpha,
  )}`;

  const preview = (
    <TimerColorPreviewChip
      borderColor={data.borderColor}
      backgroundColor={backgroundColor}
    />
  );

  return (
    <SettingsColorRow
      name={data.name}
      meta={data.borderColor}
      borderColor={data.borderColor}
      backgroundColor={backgroundColor}
      editLabel={`${t("settings.timers.colors.editColorAria")}: ${data.name}`}
      editTrigger={(trigger) => (
        <TimerColorEditorPopover
          idPrefix={itemKey}
          data={data}
          isDefault={isDefault}
          isModified={isModified}
          open={open}
          onOpenChange={onOpenChange}
          onDraftChange={onDraftChange}
          onCommit={onCommit}
          onReset={onReset}
          onDelete={onDelete}
        >
          {trigger}
        </TimerColorEditorPopover>
      )}
      preview={preview}
    >
      {isDefault ? (
        <SettingsIconButton
          label={`${t("settings.timers.colors.resetColorTitle")}: ${data.name}`}
          disabled={!isModified}
          onClick={onReset}
        >
          <RotateCcw />
        </SettingsIconButton>
      ) : (
        <SettingsIconButton
          label={`${t("settings.timers.colors.deleteColorTitle")}: ${data.name}`}
          variant="destructive"
          onClick={onDelete}
        >
          <Trash2 />
        </SettingsIconButton>
      )}
    </SettingsColorRow>
  );
};
