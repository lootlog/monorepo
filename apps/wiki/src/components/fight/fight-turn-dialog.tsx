import { useId, type KeyboardEvent } from "react";
import { I18nextProvider } from "react-i18next";
import { X } from "lucide-react";
import { BattleEventEntry } from "@lootlog/battle-ui/components/battle-event-entry";
import { BATTLE_TEXT_COLORS } from "@lootlog/battle-ui/lib/battle-color-palette";
import type {
  BattleWarrior,
  RawBattleParsedEvent,
} from "@lootlog/battle-ui/lib/battle-types";
import { formatNumber } from "@lootlog/domain/locale";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
} from "@lootlog/ui/components/dialog";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { t } from "@/i18n/messages";
import { battleI18n } from "@/lib/battle-i18n";
import type { FightTurn } from "@/lib/fight/fight-turns";
import { FightStepButtons } from "./fight-step-buttons";
import { FightTurnChances } from "./fight-turn-chances";
import { FightTurnFighterEffects } from "./fight-turn-fighter-effects";
import { FightTurnState } from "./fight-turn-state";

const TEAM_CLASSES = [
  BATTLE_TEXT_COLORS.team.friendly,
  BATTLE_TEXT_COLORS.team.enemy,
] as const;

const SECTION_HEADING_CLASS =
  "border-b border-border/50 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase";

type FightTurnDialogProps = {
  turn: FightTurn | null;
  moves: readonly RawBattleParsedEvent[];
  warriors: readonly BattleWarrior[];
  nameOf: (index: number) => string;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
  onClose: () => void;
};

const turnTitle = (turn: FightTurn) =>
  turn.number === null
    ? t(`fightPage.turn.${turn.phase === "start" ? "start" : "end"}`)
    : t("fightPage.turn.title", { number: formatNumber(turn.number) });

export function FightTurnDialog({
  turn,
  moves,
  warriors,
  nameOf,
  onPrevious,
  onNext,
  onClose,
}: FightTurnDialogProps) {
  const titleId = useId();

  const warriorOf = (id: string | null | undefined) =>
    warriors.find((warrior) => warrior.originalId === id);

  const stepWithArrows = (event: KeyboardEvent) => {
    const step =
      event.key === "ArrowLeft"
        ? onPrevious
        : event.key === "ArrowRight"
          ? onNext
          : null;

    if (!step) return;

    event.preventDefault();
    step();
  };

  return (
    <Dialog
      open={turn !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent
        aria-labelledby={titleId}
        showCloseButton={false}
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        onKeyDown={stepWithArrows}
      >
        {turn ? (
          <>
            <SectionCardHeader
              id={titleId}
              title={turnTitle(turn)}
              actions={
                <>
                  <FightStepButtons
                    previousLabel={t("fightPage.turn.previous")}
                    nextLabel={t("fightPage.turn.next")}
                    onPrevious={onPrevious}
                    onNext={onNext}
                  />
                  <DialogClose
                    render={
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label={t("fightPage.turn.close")}
                        title={t("fightPage.turn.close")}
                      />
                    }
                  >
                    <X aria-hidden="true" />
                  </DialogClose>
                </>
              }
            />
            <I18nextProvider i18n={battleI18n}>
              <ul className="max-h-[30vh] shrink-0 overflow-y-auto border-b border-border/70 text-[13px] leading-[1.35] [scrollbar-width:thin]">
                {turn.entries.flatMap(({ row }) => {
                  const move = moves[row - 1];

                  return move
                    ? [
                        <BattleEventEntry
                          key={row}
                          event={move}
                          attacker={warriorOf(move.attackerId)}
                          defender={warriorOf(move.defenderId)}
                          eventIndex={row - 1}
                          turn={row}
                        />,
                      ]
                    : [];
                })}
              </ul>
            </I18nextProvider>
            <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-4 [scrollbar-width:thin] md:grid-cols-2">
              <div className="flex flex-col gap-6">
                {turn.entries.flatMap(({ row, event }) =>
                  event?.kind === "strike"
                    ? [
                        <FightTurnChances
                          key={row}
                          row={row}
                          event={event}
                          nameOf={nameOf}
                        />,
                      ]
                    : [],
                )}
                <section
                  aria-labelledby={`${titleId}-effects`}
                  className="flex flex-col gap-3"
                >
                  <h3
                    id={`${titleId}-effects`}
                    className={SECTION_HEADING_CLASS}
                  >
                    {t("fightPage.turn.effectsTitle")}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
                    {turn.after.map((fighter, index) => (
                      <FightTurnFighterEffects
                        key={index}
                        index={index}
                        fighter={fighter}
                        nameOf={nameOf}
                        nameClass={TEAM_CLASSES[index] ?? ""}
                      />
                    ))}
                  </div>
                </section>
              </div>
              <div className="flex flex-col gap-1">
                <FightTurnState before={turn.before} after={turn.after} />
                <p className="text-xs text-muted-foreground">
                  {t("fightPage.turn.changes")}
                </p>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
