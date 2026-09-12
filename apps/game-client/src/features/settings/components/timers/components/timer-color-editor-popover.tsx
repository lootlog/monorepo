import { SettingsSectionHeader } from "@/components/settings/settings-section-header";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EyeOff, RotateCcw, Trash2 } from "lucide-react";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ColorEditData } from "./color-utils";
import { TimerColorEditorFields } from "./timer-color-editor-fields";

type TimerColorEditorPopoverProps = {
  children: ReactNode;
  idPrefix: string;
  /** Current values: the live draft while editing, the stored colour otherwise. */
  data: ColorEditData;
  isDefault: boolean;
  isModified: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: ColorEditData) => void;
  onCommit: (draft: ColorEditData) => void;
  /** Default colours: back to the factory look and name. */
  onReset: () => void;
  /** Default colours hide, custom colours are removed. */
  onDelete: () => void;
};

/**
 * The single place to manage one timer colour: name, colours, transparency,
 * a live sample and the reset / hide / delete actions.
 */
export const TimerColorEditorPopover: FC<TimerColorEditorPopoverProps> = ({
  children,
  idPrefix,
  data,
  isDefault,
  isModified,
  open,
  onOpenChange,
  onDraftChange,
  onCommit,
  onReset,
  onDelete,
}) => {
  const { t } = useTranslation();

  const status = isDefault
    ? isModified
      ? t("settings.timers.colors.modified")
      : t("settings.timers.colors.standardColor")
    : t("settings.timers.colors.customColor");

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        role="dialog"
        align="start"
        className="ll:w-[min(360px,calc(100vw-16px))] ll:p-3"
      >
        <div className="ll:flex ll:flex-col ll:gap-3">
          <div>
            <SettingsSectionHeader
              as="h4"
              className="ll:px-0"
              title={data.name}
            />
            <div className="ll:text-xs ll:text-muted-foreground">{status}</div>
          </div>

          <TimerColorEditorFields
            idPrefix={idPrefix}
            draft={data}
            onDraftChange={onDraftChange}
            onCommit={onCommit}
          />

          <div className="ll:flex ll:justify-end ll:gap-2 ll:pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ll:text-destructive ll:hover:bg-destructive/10 ll:focus-visible:bg-destructive/10"
              onClick={() => {
                onDelete();
                onOpenChange(false);
              }}
            >
              {isDefault ? (
                <EyeOff className="ll:size-3.5" />
              ) : (
                <Trash2 className="ll:size-3.5" />
              )}
              {isDefault
                ? t("settings.timers.colors.hideColorTitle")
                : t("settings.timers.colors.deleteColorTitle")}
            </Button>
            {isDefault ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!isModified}
                onClick={onReset}
              >
                <RotateCcw className="ll:size-3.5" />
                {t("settings.timers.colors.resetColorTitle")}
              </Button>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
