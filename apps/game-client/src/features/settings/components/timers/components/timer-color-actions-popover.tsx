import { SettingsIconButton } from "@/components/settings/settings-icon-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";

type TimerColorActionsPopoverProps = {
  isDefault: boolean;
  isModified: boolean;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNameCommit: (name: string) => void;
  onReset: () => void;
  onDelete: () => void;
};

export const TimerColorActionsPopover: FC<TimerColorActionsPopoverProps> = ({
  isDefault,
  isModified,
  name,
  open,
  onOpenChange,
  onNameCommit,
  onReset,
  onDelete,
}) => {
  const { t } = useTranslation();
  const [nameDraft, setNameDraft] = useState(name);

  const commitName = () => {
    const normalizedName = nameDraft.trim();

    if (!normalizedName) {
      setNameDraft(name);

      return;
    }

    onNameCommit(normalizedName);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setNameDraft(name);
        onOpenChange(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <SettingsIconButton
          label={`${t("settings.timers.colors.actionsAria")}: ${name}`}
        >
          <MoreHorizontal />
        </SettingsIconButton>
      </PopoverTrigger>
      <PopoverContent role="dialog" align="end" className="ll:w-56 ll:p-2.5">
        <div className="ll:flex ll:flex-col ll:gap-2">
          <label className="ll:flex ll:flex-col ll:gap-1 ll:text-[11px] ll:text-muted-foreground">
            {t("settings.timers.colors.nameLabel")}
            <Input
              className="ll:border-border ll:text-popover-foreground"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={commitName}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  commitName();
                  event.currentTarget.blur();
                }

                if (event.key === "Escape") {
                  setNameDraft(name);
                  onOpenChange(false);
                }
              }}
            />
          </label>

          {isDefault && isModified ? (
            <Button
              type="button"
              variant="menu"
              className="ll:w-full"
              onClick={() => {
                onReset();
                onOpenChange(false);
              }}
            >
              <RotateCcw className="ll:size-3.5" />
              {t("settings.timers.colors.resetColorTitle")}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="menu"
            className="ll:w-full ll:text-destructive ll:hover:bg-destructive/10 ll:focus-visible:bg-destructive/10"
            onClick={() => {
              onDelete();
              onOpenChange(false);
            }}
          >
            <Trash2 className="ll:size-3.5" />
            {isDefault
              ? t("settings.timers.colors.hideColorTitle")
              : t("settings.timers.colors.deleteColorTitle")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
