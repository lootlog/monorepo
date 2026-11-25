import type { ReactNode } from "react";

type FightAnalysisProps = {
  fighters: ReactNode;
  characterStats: ReactNode;
  results: ReactNode;
  fights: ReactNode;
};

export function FightAnalysis({
  fighters,
  characterStats,
  results,
  fights,
}: FightAnalysisProps) {
  return (
    <div className="flex flex-col gap-4 pt-4 lg:grid lg:grid-cols-[23rem_minmax(0,1fr)] lg:items-start 2xl:grid-cols-[23rem_minmax(0,1fr)_34rem]">
      <div className="contents lg:sticky lg:top-[7rem] lg:row-span-2 lg:flex lg:max-h-[calc(100dvh-8rem)] lg:flex-col lg:gap-4 lg:overflow-y-auto lg:[scrollbar-width:thin] 2xl:row-span-1">
        <div className="order-1 lg:order-none">{fighters}</div>
        <div className="order-4 lg:order-none">{characterStats}</div>
      </div>
      {fights ? (
        <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-none lg:col-start-2 lg:row-start-1 2xl:sticky 2xl:top-[7rem] 2xl:h-[calc(100dvh-8rem)]">
          {fights}
        </div>
      ) : null}
      <div
        className={
          fights
            ? "order-3 min-w-0 lg:order-none lg:col-start-2 2xl:sticky 2xl:top-[7rem] 2xl:col-start-3 2xl:row-start-1 2xl:max-h-[calc(100dvh-8rem)] 2xl:overflow-y-auto 2xl:[scrollbar-width:thin]"
            : "order-2 flex min-w-0 items-center justify-center lg:order-none lg:min-h-[calc(100dvh-8rem)] 2xl:col-span-2"
        }
      >
        {results}
      </div>
    </div>
  );
}
