import type { ReactNode } from "react";
import { cn } from "cn";

type FightAnalysisProps = {
  fighters: ReactNode;
  characterStats: ReactNode;
  outcome: ReactNode;
  results: ReactNode;
  fights: ReactNode;
  replay: ReactNode;
};

const STICKY_COLUMN_CLASS =
  "min-[144rem]:sticky min-[144rem]:top-[7.25rem] min-[144rem]:h-[calc(100dvh-8.25rem)]";

export function FightAnalysis({
  fighters,
  characterStats,
  outcome,
  results,
  fights,
  replay,
}: FightAnalysisProps) {
  return (
    <div className="grid items-start gap-3 pt-3 min-[100rem]:grid-cols-[23rem_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-3 min-[100rem]:sticky min-[100rem]:top-[7.25rem] min-[100rem]:max-h-[calc(100dvh-8.25rem)] min-[100rem]:overflow-y-auto min-[100rem]:[scrollbar-width:thin]">
        {fighters}
        <div className="hidden min-[100rem]:block">{characterStats}</div>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        {outcome}
        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_30rem] min-[112.5rem]:grid-cols-[minmax(0,1fr)_38rem] min-[144rem]:grid-cols-[minmax(0,1fr)_26rem_44rem]">
          <div className="order-2 flex min-w-0 flex-col gap-3 xl:order-none">
            {results}
            <div className="min-[100rem]:hidden">{characterStats}</div>
          </div>
          <div className="order-1 flex min-h-0 min-w-0 flex-col gap-3 xl:sticky xl:top-[7.25rem] xl:order-none xl:h-[calc(100dvh-8.25rem)] xl:overflow-y-auto xl:[scrollbar-width:thin] min-[144rem]:contents">
            <div
              className={cn(
                "flex h-96 min-h-0 shrink-0 flex-col gap-2 xl:h-2/5 xl:min-h-80",
                STICKY_COLUMN_CLASS,
              )}
            >
              {fights}
            </div>
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col xl:min-h-80",
                STICKY_COLUMN_CLASS,
              )}
            >
              {replay}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
