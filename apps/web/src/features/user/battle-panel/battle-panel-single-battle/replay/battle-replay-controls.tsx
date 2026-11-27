import { PillToggleGroup } from "@/components/common/pill-toggle-group";
import { Button } from "@lootlog/ui/components/button";
import { Slider } from "@lootlog/ui/components/slider";
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReplaySpeed } from "./use-battle-replay-player";

type BattleReplayControlsProps = {
  readonly isPlaying: boolean;
  readonly isExporting: boolean;
  readonly currentTimeMs: number;
  readonly totalDurationMs: number;
  readonly currentTurn: number;
  readonly totalTurns: number;
  readonly speed: ReplaySpeed;
  readonly onTogglePlay: () => void;
  readonly onRestart: () => void;
  readonly onStepTurn: (direction: -1 | 1) => void;
  readonly onSeek: (timeMs: number) => void;
  readonly onSpeedChange: (speed: ReplaySpeed) => void;
};

const SPEED_OPTIONS = [
  { value: "0.5", label: "0.5x" },
  { value: "1", label: "1x" },
  { value: "2", label: "2x" },
] as const;

const formatClock = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export function BattleReplayControls({
  isPlaying,
  isExporting,
  currentTimeMs,
  totalDurationMs,
  currentTurn,
  totalTurns,
  speed,
  onTogglePlay,
  onRestart,
  onStepTurn,
  onSeek,
  onSpeedChange,
}: BattleReplayControlsProps) {
  const { t } = useTranslation();
  const PlayIcon = isPlaying ? Pause : Play;

  const playLabel = isPlaying
    ? t("battlePanel.single.replay.pause")
    : t("battlePanel.single.replay.play");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-3">
      <div className="flex items-center gap-3">
        <span className="w-11 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
          {formatClock(currentTimeMs)}
        </span>
        <Slider
          aria-label={t("battlePanel.single.replay.scrubLabel")}
          min={0}
          max={Math.max(1, Math.round(totalDurationMs))}
          step={16}
          value={[Math.round(currentTimeMs)]}
          disabled={isExporting}
          onValueChange={(nextValue) => {
            const first = Array.isArray(nextValue) ? nextValue[0] : nextValue;

            if (first !== undefined) onSeek(first);
          }}
        />
        <span className="w-11 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">
          {formatClock(totalDurationMs)}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="default"
            onClick={onTogglePlay}
            disabled={isExporting}
          >
            <PlayIcon className="size-4" />
            <span>{playLabel}</span>
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label={t("battlePanel.single.replay.restart")}
            onClick={onRestart}
            disabled={isExporting}
          >
            <RotateCcw className="size-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label={t("battlePanel.single.replay.previousTurn")}
            onClick={() => onStepTurn(-1)}
            disabled={isExporting}
          >
            <SkipBack className="size-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label={t("battlePanel.single.replay.nextTurn")}
            onClick={() => onStepTurn(1)}
            disabled={isExporting}
          >
            <SkipForward className="size-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {t("battlePanel.single.replay.turnShort", {
              current: currentTurn,
              total: totalTurns,
            })}
          </span>
          <PillToggleGroup
            label={t("battlePanel.single.replay.speedLabel")}
            options={SPEED_OPTIONS}
            value={speed}
            onValueChange={onSpeedChange}
          />
        </div>
      </div>
    </div>
  );
}
