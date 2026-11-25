import type { ReactNode } from "react";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";

type FightAnalysisProps = {
  matchup: ReactNode;
  results: ReactNode;
  sample: ReactNode;
};

export function FightAnalysis({
  matchup,
  results,
  sample,
}: FightAnalysisProps) {
  return (
    <div className="grid items-start gap-4 pt-4 lg:grid-cols-[20rem_minmax(0,1fr)] 2xl:grid-cols-[22rem_minmax(0,1fr)_30rem]">
      <div className="lg:sticky lg:top-[7rem] lg:row-span-2 lg:flex lg:max-h-[calc(100dvh-8rem)] lg:flex-col 2xl:row-span-1">
        <ScrollArea orientation="vertical" className="min-h-0">
          {matchup}
        </ScrollArea>
      </div>
      <div className="min-w-0">{results}</div>
      {sample ? (
        <div className="min-w-0 lg:col-start-2 2xl:sticky 2xl:top-[7rem] 2xl:col-start-3 2xl:row-start-1 2xl:h-[calc(100dvh-8rem)]">
          {sample}
        </div>
      ) : null}
    </div>
  );
}
