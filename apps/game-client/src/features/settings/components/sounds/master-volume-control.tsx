import { SettingsPanel } from "@/components/settings/settings-panel";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Volume2, VolumeX } from "lucide-react";
import type { FC } from "react";

interface MasterVolumeControlProps {
  volume: number;
  onVolumeChange: (value: number[]) => void;
  onVolumeCommit: (value: number[]) => void;
  onMuteToggle: () => void;
}

export const MasterVolumeControl: FC<MasterVolumeControlProps> = ({
  volume,
  onVolumeChange,
  onVolumeCommit,
  onMuteToggle,
}) => {
  const isMuted = volume === 0;

  return (
    <SettingsPanel className="ll:flex ll:items-center ll:gap-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="ll:flex ll:items-center">
            <Volume2 className="ll:size-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent>Głośność główna</TooltipContent>
      </Tooltip>
      <span className="ll:text-sm ll:w-28 ll:text-left">Głośność główna</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            onClick={onMuteToggle}
            className="ll:p-1 ll:size-6"
          >
            {isMuted ? (
              <VolumeX className="ll:size-4 ll:text-red-400" />
            ) : (
              <Volume2 className="ll:size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isMuted ? "Włącz dźwięk" : "Wycisz"}</TooltipContent>
      </Tooltip>
      <div className="ll:flex-1">
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
    </SettingsPanel>
  );
};
