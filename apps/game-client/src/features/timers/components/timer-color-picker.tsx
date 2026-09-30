import { useTimersStore } from "@/store/timers.store";
import { ColorSwatchToggle } from "@/components/ui/color-swatch-toggle";
import { useTranslation } from "react-i18next";
import type { FC } from "react";
import { getTimerColorOptions } from "../utils/get-timer-color-options";

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

  const legacyAppearance = useTimersStore(
    (state) => state.displayConfig.legacyAppearance,
  );

  const colors = getTimerColorOptions({
    customColors,
    defaultColorNames,
    overriddenDefaultColors,
    hiddenDefaultColors,
    legacyAppearance,
  });

  if (colors.length === 0) return null;

  return (
    <div
      role="group"
      aria-label={t("contextMenu.color")}
      className="ll:w-full ll:border-0 ll:border-b ll:border-gray-400/40 ll:p-1"
    >
      <div className="ll:grid ll:grid-cols-7 ll:justify-items-center ll:gap-0.5">
        {colors.map((color) => (
          <ColorSwatchToggle
            key={color.id}
            color={color.swatchColor}
            label={color.name}
            selected={selectedColor === color.id}
            onClick={() => onColorChange(color.id)}
          />
        ))}
      </div>
    </div>
  );
};
