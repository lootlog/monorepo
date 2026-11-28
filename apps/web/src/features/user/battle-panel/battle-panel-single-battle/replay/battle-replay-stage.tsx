import type { ReplayLayout } from "@lootlog/battle-processor/replay-timeline";
import { Spinner } from "@lootlog/ui/components/spinner";
import { cn } from "cn";
import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { REPLAY_VIDEO_DIMENSIONS } from "./replay-canvas-types";

type BattleReplayStageProps = {
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  readonly stageContainerRef: RefObject<HTMLDivElement | null>;
  readonly layout: ReplayLayout;
  readonly battleType: string;
  readonly currentTurn: number;
  readonly totalTurns: number;
  readonly isLoadingSprites: boolean;
};

export function BattleReplayStage({
  canvasRef,
  stageContainerRef,
  layout,
  battleType,
  currentTurn,
  totalTurns,
  isLoadingSprites,
}: BattleReplayStageProps) {
  const { t } = useTranslation();
  const dimensions = REPLAY_VIDEO_DIMENSIONS[layout];
  const isVertical = layout === "9:16";

  return (
    <div
      ref={stageContainerRef}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "auto none auto 420px",
      }}
      className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl max-lg:min-h-64 border border-border/60 bg-slate-950/90 p-3"
    >
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        role="img"
        aria-label={t("battlePanel.single.replay.canvasLabel", {
          battleType,
          current: currentTurn,
          total: totalTurns,
        })}
        className={cn(
          "block max-h-full max-w-full rounded-lg shadow-2xl",
          isVertical
            ? "aspect-[9/16] h-full w-auto"
            : "aspect-video w-full h-auto",
        )}
      />
      {isLoadingSprites ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/85 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
            <Spinner className="size-3.5" />
            <span>{t("battlePanel.single.replay.loadingSprites")}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
