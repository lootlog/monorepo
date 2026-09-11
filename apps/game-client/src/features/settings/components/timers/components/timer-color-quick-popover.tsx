import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SettingsSectionHeader } from "@/components/settings/settings-section-header";
import { SettingsSliderField } from "@/components/settings/settings-slider-field";
import { TimerTileView } from "@/features/timers/components/timer-tile-view";
import { useState, type FC, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { alphaToHex, type ColorEditData } from "./color-utils";

type TimerColorQuickPopoverProps = {
  children: ReactNode;
  data: ColorEditData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommit: (data: ColorEditData) => void;
};

const HEX_COLOR_PATTERN = /^#[\dA-F]{6}$/i;

export const TimerColorQuickPopover: FC<TimerColorQuickPopoverProps> = ({
  children,
  data,
  open,
  onOpenChange,
  onCommit,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(data);

  const commitHex = (
    field: "backgroundColor" | "borderColor",
    value: string,
  ) => {
    if (!HEX_COLOR_PATTERN.test(value)) {
      setDraft(data);

      return;
    }

    const nextDraft = { ...draft, [field]: value.toUpperCase() };
    setDraft(nextDraft);
    onCommit(nextDraft);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setDraft(data);
        onOpenChange(nextOpen);
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        role="dialog"
        align="start"
        className="ll:w-[min(340px,calc(100vw-16px))] ll:p-3"
      >
        <div className="ll:flex ll:flex-col ll:gap-3">
          <SettingsSectionHeader
            as="h4"
            className="ll:px-0"
            title={data.name}
          />

          <div className="ll:grid ll:grid-cols-2 ll:gap-2">
            {(
              [
                ["borderColor", "borderLabel", "borderHexAria"],
                ["backgroundColor", "backgroundLabel", "backgroundHexAria"],
              ] as const
            ).map(([field, labelKey, ariaKey]) => (
              <label
                key={field}
                className="ll:flex ll:min-w-0 ll:flex-col ll:gap-1 ll:text-[11px] ll:text-muted-foreground"
              >
                {t(`settings.timers.colors.${labelKey}`)}
                <div className="ll:flex ll:items-center ll:gap-1">
                  <Input
                    type="color"
                    value={draft[field]}
                    onChange={(event) =>
                      setDraft({ ...draft, [field]: event.target.value })
                    }
                    onBlur={() => onCommit(draft)}
                    className="ll:h-7 ll:w-8 ll:shrink-0 ll:border-border ll:p-0.5 ll:text-popover-foreground"
                    aria-label={t(`settings.timers.colors.${labelKey}`)}
                  />
                  <Input
                    value={draft[field]}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        [field]: event.target.value.toUpperCase(),
                      })
                    }
                    onBlur={(event) => commitHex(field, event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.nativeEvent.isComposing
                      ) {
                        commitHex(field, event.currentTarget.value);
                        event.currentTarget.blur();
                      }

                      if (event.key === "Escape") {
                        setDraft(data);
                        onOpenChange(false);
                      }
                    }}
                    className="ll:min-w-0 ll:flex-1 ll:border-border ll:font-mono ll:text-[11px] ll:uppercase ll:text-popover-foreground"
                    aria-label={t(`settings.timers.colors.${ariaKey}`)}
                  />
                </div>
              </label>
            ))}
          </div>

          <label className="ll:flex ll:flex-col ll:gap-1 ll:text-[11px] ll:text-muted-foreground">
            {t("settings.timers.colors.transparencyLabel")}
            <SettingsSliderField
              min={0}
              max={100}
              step={1}
              unit="%"
              value={draft.backgroundAlpha}
              onValueChange={(backgroundAlpha) =>
                setDraft({ ...draft, backgroundAlpha })
              }
              onCommit={(backgroundAlpha) => {
                const nextDraft = { ...draft, backgroundAlpha };

                setDraft(nextDraft);
                onCommit(nextDraft);
              }}
              aria-label={t("settings.timers.colors.transparencyAria")}
            />
          </label>

          <div className="ll:flex ll:flex-col ll:gap-1">
            <span className="ll:text-xs ll:text-muted-foreground">
              {t("settings.timers.colors.previewLabel")}
            </span>
            <TimerTileView
              customBorderColor={draft.borderColor}
              customBackgroundColor={`${draft.backgroundColor}${alphaToHex(
                draft.backgroundAlpha,
              )}`}
              displayMode="row"
              fontSize={11}
              label={t("common:preview.name")}
              timeLabel={t("common:preview.time")}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
