import type { Battle, RawBattle } from "@/lib/api/battlelog-types";
import { BattleReplayControls } from "./battle-replay-controls";
import { BattleReplayExportPanel } from "./battle-replay-export-panel";
import { BattleReplayStage } from "./battle-replay-stage";
import { useBattleReplayPlayer } from "./use-battle-replay-player";

type BattleReplayStudioProps = {
  readonly battle: Battle;
  readonly rawBattle: RawBattle;
};

export function BattleReplayStudio({
  battle,
  rawBattle,
}: BattleReplayStudioProps) {
  const {
    canvasRef,
    stageContainerRef,
    timeline,
    layout,
    setLayout,
    pacingMode,
    handlePacingChange,
    speed,
    setSpeed,
    isPlaying,
    togglePlay,
    restart,
    stepTurn,
    seekTo,
    currentTimeMs,
    currentTurn,
    isLoadingSprites,
    exportFormat,
    exportProgress,
    exportClip,
    cancelExport,
  } = useBattleReplayPlayer({ battle, rawBattle });

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <BattleReplayStage
          canvasRef={canvasRef}
          stageContainerRef={stageContainerRef}
          layout={layout}
          battleType={timeline.battleType}
          currentTurn={currentTurn}
          totalTurns={timeline.totalTurns}
          isLoadingSprites={isLoadingSprites}
        />
        <BattleReplayControls
          isPlaying={isPlaying}
          isExporting={exportFormat !== null}
          currentTimeMs={currentTimeMs}
          totalDurationMs={timeline.totalDurationMs}
          currentTurn={currentTurn}
          totalTurns={timeline.totalTurns}
          speed={speed}
          onTogglePlay={togglePlay}
          onRestart={restart}
          onStepTurn={stepTurn}
          onSeek={seekTo}
          onSpeedChange={setSpeed}
        />
      </div>
      <BattleReplayExportPanel
        layout={layout}
        pacingMode={pacingMode}
        exportFormat={exportFormat}
        exportProgress={exportProgress}
        onLayoutChange={setLayout}
        onPacingChange={handlePacingChange}
        onExport={(format) => {
          void exportClip(format);
        }}
        onCancelExport={cancelExport}
      />
    </div>
  );
}
