import { Dices } from "lucide-react";
import { useRef } from "react";
import { I18nextProvider } from "react-i18next";
import { BattleLog } from "@lootlog/battle-ui/components/battle-log";
import { BattleSummarySection } from "@lootlog/battle-ui/components/battle-summary-section";
import { BATTLE_TEXT_COLORS } from "@lootlog/battle-ui/lib/battle-color-palette";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lootlog/ui/components/tabs";
import { t } from "@/i18n/messages";
import { battleI18n } from "@/lib/battle-i18n";
import type { FightSample } from "@/lib/fight/fight-run";

const sampleOutcome = (winner: number | null) => {
  if (winner === null)
    return {
      text: t("fightPage.sampleDraw"),
      className: "text-muted-foreground",
    };

  return winner === 0
    ? {
        text: t("fightPage.sampleWon"),
        className: BATTLE_TEXT_COLORS.result.won,
      }
    : {
        text: t("fightPage.sampleLost"),
        className: BATTLE_TEXT_COLORS.result.lost,
      };
};

type FightSampleBattleProps = {
  sample: FightSample;
  onAnotherSample: () => void;
};

export function FightSampleBattle({
  sample,
  onAnotherSample,
}: FightSampleBattleProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const outcome = sampleOutcome(sample.result.winner);

  return (
    <section
      aria-labelledby="fight-sample"
      className="flex h-[40rem] min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card 2xl:h-full"
    >
      <Tabs defaultValue="log" className="min-h-0 flex-1 gap-0">
        <div className="flex flex-col gap-2 border-b border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <h2 id="fight-sample" className="text-sm font-semibold">
                {t("fightPage.sampleTitle")}
              </h2>
              <p className={`text-xs ${outcome.className}`}>{outcome.text}</p>
            </div>
            <Button size="xs" variant="outline" onClick={onAnotherSample}>
              <Dices aria-hidden="true" />
              {t("fightPage.anotherSample")}
            </Button>
          </div>
          <TabsList size="sm" aria-label={t("fightPage.sampleTitle")}>
            <TabsTrigger value="log">{t("fightPage.sampleLog")}</TabsTrigger>
            <TabsTrigger value="summary">
              {t("fightPage.sampleSummary")}
            </TabsTrigger>
          </TabsList>
        </div>
        <I18nextProvider i18n={battleI18n}>
          <TabsContent value="log" className="min-h-0">
            <ScrollArea ref={viewportRef} className="h-full">
              <BattleLog
                rawBattle={sample.rawBattle}
                warriors={sample.battle.warriors}
                scrollViewportRef={viewportRef}
              />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="summary" className="min-h-0">
            <ScrollArea className="h-full">
              <div className="p-3">
                <BattleSummarySection battle={sample.battle} />
              </div>
            </ScrollArea>
          </TabsContent>
        </I18nextProvider>
      </Tabs>
    </section>
  );
}
