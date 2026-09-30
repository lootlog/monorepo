import { BattlePanelSingleBattleSkeleton } from "@/features/user/battle-panel/battle-panel-single-battle/battle-panel-single-battle-skeleton";

export const PublicBattleSkeleton = () => {
  return (
    <div className="min-h-dvh bg-background md:h-dvh md:min-h-0 md:overflow-hidden">
      <BattlePanelSingleBattleSkeleton />
    </div>
  );
};
