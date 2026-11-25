import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { I18nextProvider } from "react-i18next";
import { cn } from "cn";
import { BattleLog } from "@lootlog/battle-ui/components/battle-log";
import { BattleSummarySection } from "@lootlog/battle-ui/components/battle-summary-section";
import { BATTLE_TEXT_COLORS } from "@lootlog/battle-ui/lib/battle-color-palette";
import { formatNumber } from "@lootlog/domain/locale";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SectionCard } from "@lootlog/ui/components/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lootlog/ui/components/tabs";
import { t } from "@/i18n/messages";
import { battleI18n } from "@/lib/battle-i18n";
import { fightOutcome } from "@/lib/fight/fight-list";
import type { FightSample } from "@/lib/fight/fight-run";

const OUTCOME_CLASS = {
  won: BATTLE_TEXT_COLORS.result.won,
  lost: BATTLE_TEXT_COLORS.result.lost,
  drawn: "text-muted-foreground",
} as const;

type FightReplayProps = {
  index: number;
  sample: FightSample;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
};

export function FightReplay({
  index,
  sample,
  onPrevious,
  onNext,
}: FightReplayProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const outcome = fightOutcome(sample.result.winner);

  return (
    <SectionCard
      aria-labelledby="fight-replay"
      className="flex min-h-0 flex-col md:h-[40rem] 2xl:h-auto 2xl:flex-1"
    >
      <SectionCardHeader
        id="fight-replay"
        title={
          <span className="flex items-baseline gap-2">
            {t("fightPage.replayTitle", { number: formatNumber(index + 1) })}
            <span className={cn("text-xs font-medium", OUTCOME_CLASS[outcome])}>
              {t(`fightPage.outcomes.${outcome}`)}
            </span>
          </span>
        }
        actions={
          <div className="flex gap-1">
            <Button
              size="icon-xs"
              variant="outline"
              onClick={onPrevious ?? undefined}
              disabled={!onPrevious}
              aria-label={t("fightPage.previousFight")}
              title={t("fightPage.previousFight")}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              size="icon-xs"
              variant="outline"
              onClick={onNext ?? undefined}
              disabled={!onNext}
              aria-label={t("fightPage.nextFight")}
              title={t("fightPage.nextFight")}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        }
      />
      <Tabs defaultValue="log" className="min-h-0 flex-1 gap-0">
        <div className="border-b border-border/70 px-3 py-2">
          <TabsList size="sm" aria-label={t("fightPage.replayLog")}>
            <TabsTrigger value="log">{t("fightPage.replayLog")}</TabsTrigger>
            <TabsTrigger value="summary">
              {t("fightPage.replaySummary")}
            </TabsTrigger>
          </TabsList>
        </div>
        <I18nextProvider i18n={battleI18n}>
          <TabsContent value="log" className="min-h-0">
            <ScrollArea ref={viewportRef} className="md:h-full">
              <BattleLog
                key={index}
                rawBattle={sample.rawBattle}
                warriors={sample.battle.warriors}
                scrollViewportRef={viewportRef}
              />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="summary" className="min-h-0">
            <ScrollArea className="md:h-full">
              <div className="p-3">
                <BattleSummarySection battle={sample.battle} />
              </div>
            </ScrollArea>
          </TabsContent>
        </I18nextProvider>
      </Tabs>
    </SectionCard>
  );
}
