"use client";

import {
  BattleOverviewCard,
  BattleStatsTable,
  BattleLog,
} from "@lootlog/ui/components/battle";
import type {
  SharedBattleData,
  SharedRawBattleData,
} from "@lootlog/ui/types/battle";

type BattlePageClientProps = {
  battle: SharedBattleData & {
    createdAt: string;
    public: boolean;
  };
  battleRaw: SharedRawBattleData;
};

const CDN_BASE_URL = "https://micc.garmory-cdn.cloud/obrazki/postacie";

export function BattlePageClient({ battle, battleRaw }: BattlePageClientProps) {
  if (!battle || !battleRaw) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            Invalid Battle Data
          </h1>
          <p className="text-muted-foreground">
            The battle data is incomplete or corrupted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="">
        <BattleOverviewCard
          battle={battle}
          cdnBaseUrl={CDN_BASE_URL}
          showActions={false}
        />
        <BattleStatsTable battle={battle} className="sm:max-w-full" />
        <BattleLog rawBattle={battleRaw} warriors={battle.warriors} />
      </div>
    </div>
  );
}
