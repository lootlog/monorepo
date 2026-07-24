import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { TimerTileView } from "@/features/timers/components/timer-tile-view";
import { useEffect, useState, type FC, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { alphaToHex, type ColorEditData } from "./color-utils";

type TimerColorQuickPopoverProps = {
  children: ReactElement;
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

  useEffect(() => {
    if (!open) setDraft(data);
  }, [data, open]);

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
        if (!nextOpen) setDraft(data);
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
          <div className="ll:text-xs ll:font-semibold ll:text-white">
            {data.name}
          </div>

          <div className="ll:grid ll:grid-cols-2 ll:gap-2">
            {(
              [
                ["borderColor", "borderLabel", "borderHexAria"],
                ["backgroundColor", "backgroundLabel", "backgroundHexAria"],
              ] as const
            ).map(([field, labelKey, ariaKey]) => (
              <label
                key={field}
                className="ll:flex ll:min-w-0 ll:flex-col ll:gap-1 ll:text-[10px] ll:text-gray-400"
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
                    className="ll:h-8 ll:w-9 ll:shrink-0 ll:p-1"
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
                      if (event.key === "Enter") {
                        commitHex(field, event.currentTarget.value);
                        event.currentTarget.blur();
                      }
                      if (event.key === "Escape") {
                        setDraft(data);
                        onOpenChange(false);
                      }
                    }}
                    className="ll:min-w-0 ll:flex-1 ll:font-mono ll:text-[10px] ll:uppercase"
                    aria-label={t(`settings.timers.colors.${ariaKey}`)}
                  />
                </div>
              </label>
            ))}
          </div>

          <label className="ll:flex ll:flex-col ll:gap-1 ll:text-[10px] ll:text-gray-400">
            {t("settings.timers.colors.transparencyLabel")}
            <div className="ll:flex ll:items-center ll:gap-2">
              <Slider
                min={0}
                max={100}
                step={1}
                value={[draft.backgroundAlpha]}
                onValueChange={(value) =>
                  setDraft({ ...draft, backgroundAlpha: value[0] })
                }
                onValueCommit={(value) => {
                  const nextDraft = {
                    ...draft,
                    backgroundAlpha: value[0],
                  };
                  setDraft(nextDraft);
                  onCommit(nextDraft);
                }}
                className="ll:flex-1"
                aria-label={t("settings.timers.colors.transparencyAria")}
              />
              <span className="ll:w-8 ll:text-right ll:text-xs ll:text-white">
                {draft.backgroundAlpha}%
              </span>
            </div>
          </label>

          <div className="ll:flex ll:flex-col ll:gap-1">
            <span className="ll:text-[10px] ll:uppercase ll:tracking-wide ll:text-gray-400">
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
