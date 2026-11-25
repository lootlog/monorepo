import { useRef, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { cn } from "cn";
import { BattleLog } from "@lootlog/battle-ui/components/battle-log";
import { BattleSummarySection } from "@lootlog/battle-ui/components/battle-summary-section";
import { BATTLE_TEXT_COLORS } from "@lootlog/battle-ui/lib/battle-color-palette";
import { formatNumber } from "@lootlog/domain/locale";
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
import { FightBattleStats } from "./fight-battle-stats";
import { FightStepButtons } from "./fight-step-buttons";
import { FightTurnDialog } from "./fight-turn-dialog";

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
  const [turnIndex, setTurnIndex] = useState<number | null>(null);
  const [isTurnOpen, setIsTurnOpen] = useState(false);
  const [scrollRequest, setScrollRequest] = useState(0);
  const { turns, turnOfRow } = sample;
  const turn = turnIndex === null ? undefined : turns[turnIndex];

  const [mineWarrior, theirWarrior] = [1, 2].map((id) =>
    sample.battle.warriors.find((warrior) => warrior.originalId === String(id)),
  );

  const nameOf = (fighter: number) =>
    sample.result.fighters[fighter]?.name ?? "";

  const stepTurn = (offset: number) => {
    const target = (turnIndex ?? -1) + offset;

    return target >= 0 && target < turns.length
      ? () => {
          setTurnIndex(target);
          setScrollRequest((request) => request + 1);
        }
      : null;
  };

  return (
    <SectionCard
      aria-labelledby="fight-replay"
      className="flex min-h-0 flex-col md:h-[40rem] xl:h-auto xl:flex-1"
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
          <FightStepButtons
            previousLabel={t("fightPage.previousFight")}
            nextLabel={t("fightPage.nextFight")}
            onPrevious={onPrevious}
            onNext={onNext}
          />
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
                hideHeading
                selectedTurn={turn?.entries[0]?.row ?? null}
                scrollToSelectedTurnRequestId={scrollRequest}
                onTurnSelect={(row) => {
                  setTurnIndex(turnOfRow[row - 1] ?? null);
                  setIsTurnOpen(true);
                }}
              />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="summary" className="min-h-0">
            <ScrollArea className="md:h-full">
              <div className="flex flex-col gap-4 p-3">
                <BattleSummarySection battle={sample.battle} />
                {mineWarrior && theirWarrior ? (
                  <FightBattleStats mine={mineWarrior} theirs={theirWarrior} />
                ) : null}
              </div>
            </ScrollArea>
          </TabsContent>
        </I18nextProvider>
      </Tabs>
      <FightTurnDialog
        turn={isTurnOpen ? (turn ?? null) : null}
        moves={sample.rawBattle.events}
        warriors={sample.battle.warriors}
        nameOf={nameOf}
        onPrevious={stepTurn(-1)}
        onNext={stepTurn(1)}
        onClose={() => setIsTurnOpen(false)}
      />
    </SectionCard>
  );
}
