import { Button } from "@/components/ui/button";
import { Tile } from "@/components/ui/tile";
import type { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
import { getDefaultColorName } from "@/features/timers/utils/get-default-color-name";
import { RotateCcw } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

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
    <details className="ll:border-t ll:border-gray-600 ll:pt-2">
      <summary className="ll:text-xs ll:font-semibold ll:text-gray-300 ll-custom-cursor-pointer">
        {t("settings.timers.colors.hiddenDefaultsTitle")}
      </summary>
      <div className="ll:mt-2 ll:grid ll:grid-cols-1 ll:gap-1.5 min-[680px]:ll:grid-cols-2">
        {hiddenColors.map((colorId) => (
          <div
            key={colorId}
            className="ll:flex ll:items-center ll:gap-2 ll:rounded-sm ll:border ll:border-solid ll:border-accent-foreground/40 ll:bg-muted/40 ll:p-1.5 ll:opacity-70"
          >
            <div className="ll:flex-1 ll:flex ll:flex-col ll:justify-between ll:h-full">
              <span className="ll:text-xs ll:font-medium ll:truncate">
                {colorNames[colorId] ?? getDefaultColorName(colorId)}
              </span>
              <Tile
                color={colorId as keyof typeof TIMERS_COLORS}
                className="ll:h-6 ll:w-full ll:items-center ll:justify-center ll:mt-1"
              >
                <span className="ll:text-[10px] ll:text-white ll:whitespace-nowrap ll:flex ll:justify-between ll:w-full ll:px-1 ll:items-center ll:h-full">
                  <span>{t("common:preview.name")}</span>
                  <span>{t("common:preview.time")}</span>
                </span>
              </Tile>
            </div>
            <Button
              onClick={() => onRestore(colorId)}
              className="ll:h-7 ll:shrink-0 ll:gap-2 ll:border-green-500 ll:bg-green-500/30 ll:px-2 ll:hover:bg-green-500/50"
              title={t("settings.timers.colors.restoreColorTitle")}
            >
              <RotateCcw className="ll:h-3 ll:w-3" />
              {t("settings.timers.colors.restoreColorTitle")}
            </Button>
          </div>
        ))}
      </div>
    </details>
  );
};
