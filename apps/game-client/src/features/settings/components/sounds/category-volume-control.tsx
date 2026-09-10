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
}

export const CategoryVolumeControl: FC<CategoryVolumeControlProps> = ({
  icon,
  label,
  volume,
  isMuted,
  onVolumeChange,
  onVolumeCommit,
  onMuteToggle,
}) => {
  const { t } = useTranslation();

  return (
    <div className="ll:flex ll:min-h-[var(--ll-settings-control-height)] ll:flex-1 ll:items-center ll:gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="ll:flex ll:items-center">{icon}</span>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <span className="ll:w-24 ll:truncate ll:text-left ll:text-[12px] ll:text-gray-100">
        {label}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={
              isMuted ? t("common:actions.unmute") : t("common:actions.mute")
            }
            aria-pressed={isMuted}
            onClick={onMuteToggle}
            className="ll-custom-cursor-pointer ll:flex ll:size-5 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:p-0 ll:text-gray-300 ll:transition-colors ll:hover:bg-white/5 ll:hover:text-gray-100 ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
          >
            {isMuted ? (
              <VolumeX className="ll:size-4 ll:text-red-400" />
            ) : (
              <Volume2 className="ll:size-4" />
            )}
          </button>
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
      <span className="ll:w-9 ll:shrink-0 ll:text-right ll:text-[11px] ll:tabular-nums ll:text-muted-foreground">
        {Math.round(volume * 100)}%
      </span>
    </div>
  );
};
