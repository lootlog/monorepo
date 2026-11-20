import { SettingsSliderField } from "./settings-slider-field";
import { IconButton } from "@/components/ui/icon-button";
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
      <IconButton
        label={toggleLabel}
        active={muted}
        disabled={disabled}
        onClick={onMuteToggle}
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
      </IconButton>
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
