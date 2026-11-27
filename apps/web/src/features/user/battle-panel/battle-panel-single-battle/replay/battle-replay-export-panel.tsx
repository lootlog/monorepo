import type {
  ReplayLayout,
  ReplayPacingMode,
} from "@lootlog/battle-processor/replay-timeline";
import { PillToggleGroup } from "@/components/common/pill-toggle-group";
import { Button } from "@lootlog/ui/components/button";
import { Label } from "@lootlog/ui/components/label";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@lootlog/ui/components/progress";
import { Separator } from "@lootlog/ui/components/separator";
import { Switch } from "@lootlog/ui/components/switch";
import { Download, Film, ImageIcon, Volume2, VolumeX, X } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import type {
  ReplayExportFormat,
  ReplayExportProgress,
} from "./replay-export-types";

type BattleReplayExportPanelProps = {
  readonly layout: ReplayLayout;
  readonly pacingMode: ReplayPacingMode;
  readonly audioEnabled: boolean;
  readonly exportFormat: ReplayExportFormat | null;
  readonly exportProgress: ReplayExportProgress | null;
  readonly onLayoutChange: (layout: ReplayLayout) => void;
  readonly onPacingChange: (pacing: ReplayPacingMode) => void;
  readonly onAudioChange: (enabled: boolean) => void;
  readonly onExport: (format: ReplayExportFormat) => void;
  readonly onCancelExport: () => void;
};

export function BattleReplayExportPanel({
  layout,
  pacingMode,
  audioEnabled,
  exportFormat,
  exportProgress,
  onLayoutChange,
  onPacingChange,
  onAudioChange,
  onExport,
  onCancelExport,
}: BattleReplayExportPanelProps) {
  const { t } = useTranslation();
  const audioSwitchId = useId();
  const isExporting = exportFormat !== null;

  const layoutOptions = [
    {
      value: "16:9",
      label: t("battlePanel.single.replay.layoutLandscape"),
    },
    {
      value: "9:16",
      label: t("battlePanel.single.replay.layoutVertical"),
    },
  ] as const;

  const pacingOptions = [
    {
      value: "smart",
      label: t("battlePanel.single.replay.pacingSmart"),
    },
    {
      value: "normal",
      label: t("battlePanel.single.replay.pacingNormal"),
    },
  ] as const;

  const progressPhaseText =
    exportProgress?.phase === "preparing"
      ? t("battlePanel.single.replay.exportPhasePreparing")
      : exportProgress?.phase === "muxing"
        ? t("battlePanel.single.replay.exportPhaseMuxing")
        : t("battlePanel.single.replay.exportPhaseEncoding", {
            current: exportProgress?.completedFrames ?? 0,
            total: exportProgress?.totalFrames ?? 0,
          });

  const AudioIcon = audioEnabled ? Volume2 : VolumeX;

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 border-t border-border/60 p-4 lg:w-80 lg:border-t-0 lg:border-l">
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("battlePanel.single.replay.settingsTitle")}
        </h3>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-foreground">
            {t("battlePanel.single.replay.layoutLabel")}
          </span>
          <PillToggleGroup
            label={t("battlePanel.single.replay.layoutLabel")}
            options={layoutOptions}
            value={layout}
            onValueChange={(nextLayout) => {
              if (!isExporting) onLayoutChange(nextLayout);
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-foreground">
            {t("battlePanel.single.replay.pacingLabel")}
          </span>
          <PillToggleGroup
            label={t("battlePanel.single.replay.pacingLabel")}
            options={pacingOptions}
            value={pacingMode}
            onValueChange={(nextPacing) => {
              if (!isExporting) onPacingChange(nextPacing);
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <AudioIcon className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-col">
              <Label htmlFor={audioSwitchId} className="text-xs font-medium">
                {t("battlePanel.single.replay.audioLabel")}
              </Label>
              <span className="text-[11px] text-muted-foreground">
                {t("battlePanel.single.replay.audioHint")}
              </span>
            </div>
          </div>
          <Switch
            id={audioSwitchId}
            checked={audioEnabled}
            disabled={isExporting}
            onCheckedChange={onAudioChange}
          />
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("battlePanel.single.replay.exportTitle")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("battlePanel.single.replay.exportHint")}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            variant="default"
            className="w-full justify-between"
            disabled={isExporting}
            loading={exportFormat === "mp4"}
            onClick={() => onExport("mp4")}
          >
            <span className="flex items-center gap-2">
              <Film className="size-4" />
              {t("battlePanel.single.replay.exportMp4")}
            </span>
            <span className="text-xs opacity-75">
              {t("battlePanel.single.replay.exportMp4Detail")}
            </span>
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="w-full justify-between"
            disabled={isExporting}
            loading={exportFormat === "gif"}
            onClick={() => onExport("gif")}
          >
            <span className="flex items-center gap-2">
              <ImageIcon className="size-4" />
              {t("battlePanel.single.replay.exportGif")}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("battlePanel.single.replay.exportGifDetail")}
            </span>
          </Button>
        </div>

        {isExporting && exportProgress ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/25 p-3">
            <Progress value={Math.round(exportProgress.progress * 100)}>
              <ProgressLabel className="text-xs">
                {progressPhaseText}
              </ProgressLabel>
              <ProgressValue className="text-xs" />
            </Progress>
            <Button
              size="sm"
              variant="ghost"
              className="self-end"
              onClick={onCancelExport}
            >
              <X className="size-3.5" />
              {t("battlePanel.single.replay.cancelExport")}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Download className="size-3.5 shrink-0" />
            <span>
              {layout === "9:16"
                ? "1080×1920 MP4 · 360×640 GIF"
                : "1280×720 MP4 · 640×360 GIF"}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
