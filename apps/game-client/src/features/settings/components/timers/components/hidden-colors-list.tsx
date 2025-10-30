import { Button } from "@/components/ui/button";
import { Tile } from "@/components/ui/tile";
import { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
import { RotateCcw } from "lucide-react";
import { FC } from "react";
import { DEFAULT_COLOR_NAMES } from "./color-utils";

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
  if (hiddenColors.length === 0) return null;

  return (
    <div className="ll:flex ll:flex-col ll:gap-2 ll:pt-2 ll:border-t ll:border-gray-600">
      <h3 className="ll:text-sm ll:font-semibold">Usunięte domyślne kolory</h3>
      <div className="ll:grid ll:grid-cols-2 ll:gap-1.5">
        {hiddenColors.map((colorId) => (
          <div
            key={colorId}
            className="ll:flex ll:items-center ll:gap-2 ll:p-1.5 ll:bg-muted/40 ll:rounded-md ll:border ll:border-solid ll:border-accent-foreground/40 ll:opacity-60"
          >
            <div className="ll:flex-1 ll:flex ll:flex-col ll:justify-between ll:h-full">
              <span className="ll:text-xs ll:font-medium ll:truncate">
                {colorNames[colorId] || DEFAULT_COLOR_NAMES[colorId]}
              </span>
              <Tile
                color={colorId as keyof typeof TIMERS_COLORS}
                className="ll:h-6"
              >
                <span className="ll:text-[10px] ll:text-white">
                  [T] Tanroth 00:21:37
                </span>
              </Tile>
            </div>
            <Button
              onClick={() => onRestore(colorId)}
              className="ll:w-6 ll:h-6 ll:p-0 ll:min-w-6 ll:bg-green-500/30 ll:hover:bg-green-500/50 ll:border-green-500"
              title="Przywróć kolor"
            >
              <RotateCcw className="ll:h-3 ll:w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
