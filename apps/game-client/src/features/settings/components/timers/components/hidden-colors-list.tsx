import { Button } from "@/components/ui/button";
import { Tile } from "@/components/ui/tile";
import type { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
import { RotateCcw } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { getDefaultColorName } from "./color-utils";

interface HiddenColorsListProps {
  hiddenColors: string[];
  colorNames: Record<string, string>;
  onRestore: (colorId: string) => void;
}

export const HiddenColorsList: FC<HiddenColorsListProps> = ({
  hiddenColors,
  colorNames,
  onRestore,
}) => {
  const { t } = useTranslation();

  if (hiddenColors.length === 0) return null;

  return (
    <div className="ll:flex ll:flex-col ll:gap-2 ll:pt-2 ll:border-t ll:border-gray-600">
      <h3 className="ll:text-sm ll:font-semibold">
        {t("settings.timers.colors.hiddenDefaultsTitle")}
      </h3>
      <div className="ll:grid ll:grid-cols-2 ll:gap-1.5">
        {hiddenColors.map((colorId) => (
          <div
            key={colorId}
            className="ll:flex ll:items-end ll:gap-2 ll:p-1.5 ll:bg-muted/40 ll:rounded-md ll:border ll:border-solid ll:border-accent-foreground/40 ll:opacity-60"
          >
            <div className="ll:flex-1 ll:flex ll:flex-col ll:justify-between ll:h-full">
              <span className="ll:text-xs ll:font-medium ll:truncate">
                {colorNames[colorId] || getDefaultColorName(colorId)}
              </span>
              <Tile
                color={colorId as keyof typeof TIMERS_COLORS}
                className="ll:h-6 ll:w-full ll:items-center ll:justify-center ll:mt-1"
              >
                <span className="ll:text-[10px] ll:text-white ll:whitespace-nowrap ll:flex ll:justify-between ll:w-full ll:px-1 ll:items-center ll:h-full">
                  <span>{t("settings.common.preview.name")}</span>
                  <span>{t("settings.common.preview.time")}</span>
                </span>
              </Tile>
            </div>
            <Button
              onClick={() => onRestore(colorId)}
              className="ll:w-6 ll:h-6 ll:p-0 ll:min-w-6 ll:bg-green-500/30 ll:hover:bg-green-500/50 ll:border-green-500"
              title={t("settings.timers.colors.restoreColorTitle")}
            >
              <RotateCcw className="ll:h-3 ll:w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
