import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@lootlog/ui/lib/utils";
import type { FC } from "react";
import { TIMERS_COLORS } from "../constants/timer-colors";
import { DEFAULT_COLOR_NAMES } from "../constants/color-names";

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
  return (
    <div className="ll:flex ll:gap-1 ll:my-1.5 ll:w-full ll:justify-start ll:flex-wrap">
      {Object.entries(TIMERS_COLORS)
        .filter(([id]) => !hiddenDefaultColors.includes(id))
        .map(([id, color]) => {
          const overridden = overriddenDefaultColors[id];

          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "ll:size-3.5 ll:rounded-full ll:box-border ll:border ll-custom-cursor-pointer",
                    !overridden && color?.bgNoOpacity,
                    !overridden && color?.border,
                    {
                      " ll:ring-2 ll:ring-white": selectedColor === id,
                    },
                  )}
                  style={
                    overridden
                      ? {
                          backgroundColor: overridden.backgroundColor,
                          borderColor: overridden.borderColor,
                        }
                      : undefined
                  }
                  onClick={() => onColorChange(id)}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="ll:text-xs">
                {defaultColorNames[id] || DEFAULT_COLOR_NAMES[id]}
              </TooltipContent>
            </Tooltip>
          );
        })}
      {Object.values(customColors).map((color) => (
        <Tooltip key={color.id}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "ll:size-4 ll:rounded-md ll:box-border ll:border ll-custom-cursor-pointer",
                {
                  " ll:ring-2 ll:ring-white": selectedColor === color.id,
                },
              )}
              style={{
                backgroundColor: color.backgroundColor,
                borderColor: color.borderColor,
              }}
              onClick={() => onColorChange(color.id)}
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="ll:text-xs">
            {color.name}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};
