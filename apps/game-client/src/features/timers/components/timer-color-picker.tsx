import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { FC } from "react";
import { TIMERS_COLORS } from "../constants/timer-colors";
import { getDefaultColorName } from "../utils/get-default-color-name";

type CustomColor = {
  id: string;
  name: string;
  backgroundColor: string;
  borderColor: string;
};

type OverriddenColor = {
  backgroundColor: string;
  borderColor: string;
};

type TimerColorPickerProps = {
  selectedColor: string;
  customColors: Record<string, CustomColor>;
  defaultColorNames: Record<string, string>;
  overriddenDefaultColors: Record<string, OverriddenColor>;
  hiddenDefaultColors: string[];
  onColorChange: (color: string) => void;
};

export const TimerColorPicker: FC<TimerColorPickerProps> = ({
  selectedColor,
  customColors,
  defaultColorNames,
  overriddenDefaultColors,
  hiddenDefaultColors,
  onColorChange,
}) => {
  const { t } = useTranslation("timers");
  const colors = [
    ...Object.entries(TIMERS_COLORS)
      .filter(([id]) => !hiddenDefaultColors.includes(id))
      .map(([id, color]) => ({
        id,
        name: defaultColorNames[id] ?? getDefaultColorName(id),
        className: overriddenDefaultColors[id]
          ? undefined
          : `${color.bgNoOpacity} ${color.border}`,
        style: overriddenDefaultColors[id],
      })),
    ...Object.values(customColors).map((color) => ({
      id: color.id,
      name: color.name,
      className: undefined,
      style: {
        backgroundColor: color.backgroundColor,
        borderColor: color.borderColor,
      },
    })),
  ];
  if (colors.length === 0) return null;

  return (
    <div
      role="group"
      aria-label={t("contextMenu.color")}
      className="ll:box-border ll:w-full ll:border-0 ll:border-b ll:border-solid ll:border-gray-400/40 ll:p-1.5"
    >
      <div className="ll:grid ll:grid-cols-7 ll:gap-1">
        {colors.map((color) => (
          <Tooltip key={color.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={color.name}
                aria-pressed={selectedColor === color.id}
                className={cn(
                  "ll:relative ll:flex ll:aspect-square ll:w-full ll:items-center ll:justify-center ll:p-0 ll:appearance-none ll:rounded-sm ll:box-border ll:border ll:border-solid ll-custom-cursor-pointer ll:ring-offset-1 ll:ring-offset-popover ll:hover:outline ll:hover:outline-1 ll:hover:outline-offset-1 ll:hover:outline-foreground/60 ll:focus-visible:outline ll:focus-visible:outline-2 ll:focus-visible:outline-offset-1 ll:focus-visible:outline-foreground",
                  color.className,
                  selectedColor === color.id && "ll:ring-1 ll:ring-foreground",
                )}
                style={color.style}
                onClick={() => onColorChange(color.id)}
              >
                {selectedColor === color.id && (
                  <span className="ll:flex ll:size-3 ll:items-center ll:justify-center ll:rounded-full ll:bg-black/80 ll:text-white">
                    <Check aria-hidden="true" size={10} strokeWidth={3} />
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="ll:text-xs">
              {color.name}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};
