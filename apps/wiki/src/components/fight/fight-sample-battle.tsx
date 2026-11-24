import { useRef } from "react";
import { I18nextProvider } from "react-i18next";
import { BattleLog } from "@lootlog/battle-ui/components/battle-log";
import { BattleSummarySection } from "@lootlog/battle-ui/components/battle-summary-section";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { battleI18n } from "@/lib/battle-i18n";
import type { FightSample } from "@/lib/fight/fight-run";

export function FightSampleBattle({ sample }: { sample: FightSample }) {
  const viewportRef = useRef<HTMLDivElement>(null);

  return (
    <I18nextProvider i18n={battleI18n}>
      <div className="flex flex-col gap-6">
        <BattleSummarySection battle={sample.battle} />
        <ScrollArea
          ref={viewportRef}
          className="h-[36rem] rounded-xl border border-border"
        >
          <BattleLog
            rawBattle={sample.rawBattle}
            warriors={sample.battle.warriors}
            scrollViewportRef={viewportRef}
          />
        </ScrollArea>
      </div>
    </I18nextProvider>
  );
}
