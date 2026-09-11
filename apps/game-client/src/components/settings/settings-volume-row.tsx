import { SettingsSliderField } from "./settings-slider-field";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";
import { Volume2, VolumeX } from "lucide-react";
import { useState, type FC, type MouseEvent } from "react";

type SettingsVolumeControlProps = {
  label: string;
  muteLabel: string;
  unmuteLabel: string;
  /** Volume in [0, 1]. */
  volume: number;
  muted: boolean;
  disabled?: boolean;
  onVolumeChange?: (volume: number) => void;
  onVolumeCommit: (volume: number) => void;
  onMuteToggle: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
};

/**
 * Mute toggle + volume slider + percentage readout. Used for the master
 * volume, per-category volumes and the map pings volume.
 */
export const SettingsVolumeControl: FC<SettingsVolumeControlProps> = ({
  label,
  muteLabel,
  unmuteLabel,
  volume,
  muted,
  disabled,
  onVolumeChange,
  onVolumeCommit,
  onMuteToggle,
  className,
}) => {
  const toggleLabel = muted ? unmuteLabel : muteLabel;
  /** Remounts the icon with the bump class once per committed volume. */
  const [bumpKey, setBumpKey] = useState(0);

  return (
    <span
      className={cn(
        "ll:inline-flex ll:w-full ll:items-center ll:gap-2",
        className,
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={toggleLabel}
            aria-pressed={muted}
            disabled={disabled}
            onClick={onMuteToggle}
            className="ll-custom-cursor-pointer ll:flex ll:size-5 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:p-0 ll:text-muted-foreground ll:transition-colors ll:hover:bg-white/5 ll:hover:text-foreground ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:disabled:opacity-50"
          >
            <span
              key={bumpKey}
              aria-hidden
              className={cn(
                "ll:flex ll:items-center",
                bumpKey > 0 && "ll-settings-bump",
              )}
            >
              {muted ? (
                <VolumeX className="ll:size-4 ll:text-destructive" />
              ) : (
                <Volume2 className="ll:size-4" />
              )}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent>{toggleLabel}</TooltipContent>
      </Tooltip>
      <SettingsSliderField
        aria-label={label}
        min={0}
        max={1}
        step={0.01}
        disabled={disabled}
        value={volume}
        formatValue={(value) => `${Math.round(value * 100)}%`}
        onValueChange={onVolumeChange}
        onCommit={(next) => {
          setBumpKey((key) => key + 1);
          onVolumeCommit(next);
        }}
      />
    </span>
  );
};
