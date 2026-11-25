import type { ReactNode } from "react";

type FightSetupProps = {
  fighters: ReactNode;
  characterStats: ReactNode;
  emptyState: ReactNode;
};

export function FightSetup({
  fighters,
  characterStats,
  emptyState,
}: FightSetupProps) {
  return (
    <div className="grid items-start gap-3 pt-3 min-[100rem]:grid-cols-[23rem_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-3">
        {fighters}
        <div className="hidden min-[100rem]:block">{characterStats}</div>
      </div>
      <div className="flex min-w-0 items-center justify-center py-10 min-[100rem]:min-h-[calc(100dvh-8.25rem)]">
        {emptyState}
      </div>
      <div className="min-[100rem]:hidden">{characterStats}</div>
    </div>
  );
}
