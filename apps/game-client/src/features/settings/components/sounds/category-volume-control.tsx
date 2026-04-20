import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Volume2, VolumeX } from "lucide-react";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface CategoryVolumeControlProps {
  icon: ReactNode;
  label: string;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (value: number[]) => void;
  onVolumeCommit: (value: number[]) => void;
  onMuteToggle: (e: React.MouseEvent) => void;
  onMuteKeyDown: (e: React.KeyboardEvent) => void;
}

export const CategoryVolumeControl: FC<CategoryVolumeControlProps> = ({
  icon,
  label,
  volume,
  isMuted,
  onVolumeChange,
  onVolumeCommit,
  onMuteToggle,
  onMuteKeyDown,
}) => {
  const { t } = useTranslation();

  return (
    <div className="ll:flex ll:items-center ll:gap-3 ll:flex-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="ll:flex ll:items-center">{icon}</span>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <span className="ll:text-sm ll:w-28 ll:text-left">{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="button"
            tabIndex={0}
            onClick={onMuteToggle}
            onKeyDown={onMuteKeyDown}
            className="ll:size-3.5 ll:p-1 ll:flex ll:items-center ll:justify-center ll:text-[12px] ll:border ll:border-gray-400 ll:bg-gray-400/30 ll:hover:bg-gray-400/50 ll:rounded-sm ll:text-white ll:transition-colors ll-custom-cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="ll:size-4 ll:text-red-400" />
            ) : (
              <Volume2 className="ll:size-4" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {isMuted ? t("common:actions.unmute") : t("common:actions.mute")}
        </TooltipContent>
      </Tooltip>
      <div className="ll:flex-1" onClick={(e) => e.stopPropagation()}>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[volume]}
          onValueChange={onVolumeChange}
          onValueCommit={onVolumeCommit}
          formatValue={(v) => `${Math.round(v * 100)}%`}
          showEndpoints={false}
        />
      </div>
      <span className="ll:text-xs ll:text-muted-foreground ll:w-10 ll:text-right">
        {Math.round(volume * 100)}%
      </span>
    </div>
  );
};
