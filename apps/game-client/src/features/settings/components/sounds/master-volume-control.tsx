import { SettingsRow } from "@/components/settings/settings-row";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Volume2, VolumeX } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

interface MasterVolumeControlProps {
  isMuted: boolean;
  volume: number;
  onVolumeChange: (value: number[]) => void;
  onVolumeCommit: (value: number[]) => void;
  onMuteToggle: () => void;
}

export const MasterVolumeControl: FC<MasterVolumeControlProps> = ({
  isMuted,
  volume,
  onVolumeChange,
  onVolumeCommit,
  onMuteToggle,
}) => {
  const { t } = useTranslation();

  const muteLabel = isMuted
    ? t("common:actions.unmute")
    : t("common:actions.mute");

  return (
    <SettingsRow
      controlId="sound-master-volume"
      label={t("settings.sounds.masterVolume")}
      controlClassName="ll:w-52 ll:gap-2"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={muteLabel}
            aria-pressed={isMuted}
            onClick={onMuteToggle}
            className="ll-custom-cursor-pointer ll:flex ll:size-5 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:p-0 ll:text-gray-300 ll:hover:bg-white/5 ll:hover:text-gray-100 ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
          >
            {isMuted ? (
              <VolumeX
                className="ll:size-4 ll:text-red-400"
                aria-hidden="true"
              />
            ) : (
              <Volume2 className="ll:size-4" aria-hidden="true" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>{muteLabel}</TooltipContent>
      </Tooltip>
      <div className="ll:min-w-0 ll:flex-1">
        <Slider
          aria-label={t("settings.sounds.masterVolume")}
          min={0}
          max={1}
          step={0.01}
          value={[volume]}
          onValueChange={onVolumeChange}
          onValueCommit={onVolumeCommit}
          formatValue={(value) => `${Math.round(value * 100)}%`}
          showEndpoints={false}
        />
      </div>
      <span className="ll:w-9 ll:shrink-0 ll:text-right ll:text-[11px] ll:tabular-nums ll:text-muted-foreground">
        {Math.round(volume * 100)}%
      </span>
    </SettingsRow>
  );
};
